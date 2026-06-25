"""
Whisper STT API — faster-whisper GPU server for accented English.

Receives audio chunks via REST, decodes with Whisper large-v3, returns text.
Designed for Indian/accented English where browser-side SenseVoice struggles.

Endpoints:
  POST /api/stt/transcribe  — audio file -> transcribed text
  GET  /api/stt/health       — health check
"""

import io
import time
import logging
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Whisper STT API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Loading (lazy, on first request) ─────────────────────

model = None
MODEL_SIZE = "large-v3"

# Phrases Whisper hallucinates on short / low-content audio chunks. When a chunk
# transcribes to nothing but one of these, it's almost certainly a hallucination,
# so we drop it rather than polluting the transcript (and its translation).
HALLUCINATION_PHRASES = {
    "thank you", "thank you.", "thanks for watching", "thanks for watching.",
    "thank you for watching", "thank you for watching.", "please subscribe",
    "see you in the next video", "see you in the next video.",
    "see you next time", "bye", "bye.", "bye bye", "okay", "okay.", "ok", "you",
    "i'll see you in the next video.", "thanks for watching!",
}


def is_hallucination(text: str) -> bool:
    return text.strip().lower() in HALLUCINATION_PHRASES


def get_model():
    global model
    if model is None:
        logger.info(f"Loading Whisper {MODEL_SIZE} model (GPU)...")
        start = time.time()
        model = WhisperModel(
            MODEL_SIZE,
            device="cuda",
            compute_type="float16",
            download_root="/root/.cache/huggingface",
        )
        logger.info(f"Model loaded in {time.time() - start:.1f}s")
    return model


@app.on_event("startup")
async def startup():
    """Pre-load model on startup so first request is fast."""
    try:
        get_model()
        logger.info("Whisper model ready.")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")


# ─── Endpoints ───────────────────────────────────────────────────

@app.get("/api/stt/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "gpu": True,
        "ready": model is not None,
    }


@app.post("/api/stt/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default="en"),
):
    """
    Transcribe an audio chunk with Whisper.

    Accepts: WAV or raw PCM (16kHz mono float32 or int16)
    Returns: { text, language, duration, processing_time, words, segments }
    """
    start = time.time()

    try:
        whisper = get_model()
        audio_bytes = await audio.read()

        # Parse audio: try WAV first, fall back to raw PCM
        audio_array = parse_audio(audio_bytes)

        if audio_array is None or len(audio_array) == 0:
            return {"text": "", "language": language, "duration": 0, "processing_time": 0}

        duration = len(audio_array) / 16000

        # Skip very short segments
        if duration < 0.3:
            return {"text": "", "language": language, "duration": duration, "processing_time": 0}

        # Transcribe
        # Anti-hallucination settings: chunks are short and decoded independently,
        # so Whisper is prone to emitting "Thank you" / "Bye" / "See you in the next
        # video" on low-content audio. vad_filter trims internal silence, the
        # threshold params drop low-confidence output, and condition_on_previous_text
        # is off because each chunk has no real prior context.
        segments, info = whisper.transcribe(
            audio_array,
            language=language if language != "auto" else None,
            beam_size=5,
            best_of=5,
            temperature=0,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=300),
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
            log_prob_threshold=-1.0,
            without_timestamps=False,
            word_timestamps=True,
        )

        segment_payload = []
        word_payload = []

        for seg in segments:
            seg_words = []
            for word in getattr(seg, "words", None) or []:
                cleaned_word = (getattr(word, "word", "") or "").strip()
                if not cleaned_word:
                    continue

                entry = {
                    "word": cleaned_word,
                    "start": round(float(word.start), 3) if getattr(word, "start", None) is not None else None,
                    "end": round(float(word.end), 3) if getattr(word, "end", None) is not None else None,
                }
                seg_words.append(entry)
                word_payload.append(entry)

            segment_payload.append({
                "start": round(float(seg.start), 3) if getattr(seg, "start", None) is not None else None,
                "end": round(float(seg.end), 3) if getattr(seg, "end", None) is not None else None,
                "text": seg.text.strip(),
                "words": seg_words,
            })

        text = " ".join(seg["text"] for seg in segment_payload if seg["text"]).strip()

        # Drop whole-chunk hallucinations so they don't leak into the transcript/translation
        if is_hallucination(text):
            logger.info(f'Dropped hallucination: "{text}"')
            return {"text": "", "language": language, "duration": round(duration, 2), "processing_time": round(time.time() - start, 3)}

        processing_time = time.time() - start

        logger.info(
            f'Transcribed {duration:.1f}s audio in {processing_time:.2f}s: "{text[:80]}"'
        )

        return {
            "text": text,
            "language": info.language if info else language,
            "duration": round(duration, 2),
            "processing_time": round(processing_time, 3),
            "words": word_payload,
            "segments": segment_payload,
        }

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return {"text": "", "error": str(e), "processing_time": time.time() - start}


def parse_audio(audio_bytes: bytes) -> np.ndarray:
    """Parse audio bytes to float32 numpy array at 16kHz."""
    try:
        # Try WAV format
        import wave
        wav_io = io.BytesIO(audio_bytes)
        with wave.open(wav_io, "rb") as wf:
            sample_rate = wf.getframerate()
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            frames = wf.readframes(wf.getnframes())

            if sample_width == 2:
                audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            elif sample_width == 4:
                audio = np.frombuffer(frames, dtype=np.float32)
            else:
                audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

            # Convert stereo to mono
            if n_channels > 1:
                audio = audio.reshape(-1, n_channels).mean(axis=1)

            return audio
    except Exception:
        pass

    # Fall back: raw float32 PCM (16kHz mono)
    try:
        if len(audio_bytes) % 4 == 0:
            return np.frombuffer(audio_bytes, dtype=np.float32)
        elif len(audio_bytes) % 2 == 0:
            return np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    except Exception:
        pass

    return np.array([], dtype=np.float32)

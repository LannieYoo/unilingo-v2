"""Build Repeat Sentence questions from the public pages downloaded by crawl_all.py.

Only short, complete sentences are selected.  Each question retains the exact
page URL from the crawler's front matter so the practice UI can show its source.

Usage (from frontend/crawl):
  python crawl_all.py --sources sources-pte-repeat-sentence.md
  python extract_repeat_sentence.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT.parent / "docs"
OUTPUT = ROOT / "src" / "modules" / "pte" / "_01_data" / "repeat_sentence_questions.json"
MAX_PER_SOURCE = 12

SOURCES = {
    "pte-repeat-canada": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices.html",
    "pte-repeat-pearson": "https://www.pearsonpte.com/pte-core",
    "pte-repeat-apeuni": "https://www.apeuni.com/",
    "pte-repeat-alfapte": "https://alfapte.com/",
    "pte-repeat-gurully": "https://www.gurully.com/",
    "pte-repeat-ptesuccess": "https://ptesuccess.com.au/",
    "pte-repeat-ptemagic": "https://ptemagic.com/",
    "pte-repeat-e2language": "https://e2language.com/",
    "pte-repeat-onepte": "https://onepte.com/",
    "pte-repeat-easypte": "https://www.easypte.com/",
}

BLOCKED = (
    "cookie", "privacy", "terms", "copyright", "subscribe", "sign up",
    "log in", "javascript", "all rights reserved", "free trial",
)


def page_source(markdown: str, fallback: str) -> str:
    match = re.search(r"^source:\s*(https?://\S+)", markdown, re.MULTILINE)
    return match.group(1) if match else fallback


def clean_markdown(text: str) -> str:
    text = re.sub(r"^---.*?---\s*", "", text, flags=re.DOTALL)
    text = re.sub(r"!?(?:\[[^\]]*\])?\([^)]*\)", "", text)
    text = re.sub(r"[*_`>#|]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def candidate_sentences(text: str):
    # Keep paragraph boundaries.  Flattening the entire document can join a
    # section heading to the first sentence, which is not a usable prompt.
    body = re.sub(r"^---.*?---\s*", "", text, flags=re.DOTALL)
    for raw_line in body.splitlines():
        if raw_line.lstrip().startswith(("#", "-", "|", "```")):
            continue
        line = clean_markdown(raw_line)
        for sentence in re.split(r"(?<=[.!?])\s+", line):
            sentence = sentence.strip(' "\'')
            sentence = re.sub(r"\s+([,.;!?])", r"\1", sentence)
            words = sentence.split()
            lower = sentence.lower()
            if not sentence.endswith(".") or not re.match(r"^[A-Z]", sentence):
                continue
            if "�" in sentence:
                continue
            if re.search(r"[a-z][A-Z]", sentence):  # heading and body text joined by the converter
                continue
            if not (8 <= len(words) <= 20):
                continue
            if len(sentence) > 165 or any(term in lower for term in BLOCKED):
                continue
            if any(term in lower for term in ("what is pte", "for permanent residency", "for canadian citizenship", "how the test", "journey in")):
                continue
            if re.search(r"(?:tips|guide)[A-Z]", sentence):
                continue
            if re.match(r"^(After|Because|Which|Guiding|Equipping|Trusted)\b", sentence):
                continue
            yield sentence


def main():
    questions = []
    seen = set()
    for slug, fallback_source in SOURCES.items():
        source_dir = DOCS / slug / "md"
        if not source_dir.exists():
            print(f"[skip] {slug}: no downloaded pages")
            continue
        kept = 0
        for path in source_dir.rglob("*.md"):
            if kept >= MAX_PER_SOURCE:
                break
            raw = path.read_text(encoding="utf-8", errors="ignore")
            source = page_source(raw, fallback_source)
            for sentence in candidate_sentences(raw):
                key = sentence.lower()
                if key in seen:
                    continue
                seen.add(key)
                questions.append({
                    "id": len(questions) + 1,
                    "title": f"Repeat Sentence {len(questions) + 1}",
                    "text": sentence,
                    "source": source,
                })
                kept += 1
                if kept >= MAX_PER_SOURCE:
                    break
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(questions)} sourced Repeat Sentence questions to {OUTPUT}")


if __name__ == "__main__":
    main()

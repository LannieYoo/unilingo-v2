# UniLingo LLM Architecture

## 전체 아키텍처 다이어그램

```mermaid
flowchart TB
    subgraph USER["👤 사용자 브라우저"]
        FE["Vite Frontend<br/>localhost:3001"]
        AI_LOCAL["🤖 로컬 AI (Web Worker)<br/>MiniLM - 의미 유사어"]
    end

    subgraph WINDOWS["🖥️ Windows PC (개발 머신)"]
        BE["Flask Backend<br/>localhost:8001"]
        DB["SQLite DB<br/>사용자/사전 데이터"]
        DEEPL["DeepL API<br/>번역 서비스"]
    end

    subgraph LINUX["🐧 Linux RAG Server (192.168.1.150)"]
        subgraph COMPOSE_PV["📦 docker-compose: phrasal-verbs-api"]
            PV_API["phrasal-verbs-api<br/>FastAPI Python :8100<br/>구동사 + 문맥 연관어"]
            OLLAMA["phrasal-ollama<br/>Ollama + qwen3.6<br/>RTX 5090 GPU"]
        end

        subgraph COMPOSE_RAG["📦 docker-compose: rag-server"]
            WEBUI["open-webui<br/>채팅 UI :4000"]
            NGROK["ngrok<br/>HTTPS 터널"]
            SEARXNG["searxng<br/>메타 검색 :8080"]
            OFELIA["ofelia<br/>스케줄러"]
        end
    end

    FE -->|"사전 검색<br/>POST /api/translate"| BE
    FE -->|"구동사 요청<br/>GET /api/dictionary/phrasal-verbs"| BE
    FE -->|"문맥 연관어<br/>GET /api/dictionary/context-suggestions"| BE
    FE <-->|"의미 유사어<br/>(로컬 처리)"| AI_LOCAL
    
    BE -->|"번역 요청"| DEEPL
    BE <-->|"DB 조회"| DB
    BE -->|"프록시<br/>HTTP :8100"| PV_API

    PV_API -->|"LLM 추론 요청<br/>POST /api/chat"| OLLAMA

    NGROK -->|"HTTPS 터널"| WEBUI
    WEBUI --> OLLAMA
    OFELIA -->|"정기 정리"| WEBUI
```

## Docker 컨테이너 목록 (192.168.1.150)

### 📦 Compose 1: `phrasal-verbs-api` (`/home/lannie/phrasal-verbs-api/`)

| 컨테이너 | 이미지 | 포트 | 재시작 정책 | 역할 |
|---|---|---|---|---|
| `phrasal-ollama` | `ollama/ollama:latest` | 11434 | `always` | LLM 엔진 (qwen3.6, RTX 5090) |
| `phrasal-verbs-api` | `phrasal-verbs-api` (빌드) | 8100 | `always` | FastAPI 서버 — 구동사 + 문맥 연관어 생성 |

### 📦 Compose 2: `rag-server` (`/home/lannie/rag-server/`)

| 컨테이너 | 이미지 | 포트 | 재시작 정책 | 역할 |
|---|---|---|---|---|
| `open-webui` | `ghcr.io/open-webui/open-webui:main` | 4000 | `unless-stopped` | Ollama 채팅 웹 UI |
| `ngrok` | `ngrok/ngrok:latest` | 4040 | `unless-stopped` | 외부 HTTPS 접근 터널 |
| `searxng` | `searxng/searxng:latest` | 8080 | `unless-stopped` | 로컬 메타 검색 엔진 |
| `ofelia` | `mcuadros/ofelia:latest` | — | `unless-stopped` | 컨테이너 크론 스케줄러 |

## API 엔드포인트 (phrasal-verbs-api :8100)

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/health` | GET | 서버 상태 + Ollama 연결 확인 |
| `/api/phrasal-verbs?word=endure&target_lang=ko` | GET | 영단어의 구동사/숙어 생성 (한글 번역 포함) |
| `/api/context-suggestions?word=endure` | GET | 문맥 연관어 생성 (한글 번역 포함) |
| `/api/cache` | DELETE | 인메모리 캐시 초기화 |

## 데이터 흐름 (사용자가 "endure" 검색 시)

```mermaid
sequenceDiagram
    participant U as 👤 브라우저
    participant FE as Vite Frontend
    participant BE as Flask Backend
    participant RAG as FastAPI :8100
    participant LLM as Ollama qwen3.6

    U->>FE: "참다" 입력
    FE->>BE: POST /api/translate (ko→en)
    BE-->>FE: "endure"
    
    par 사전 검색
        FE->>BE: GET /api/dictionary?word=endure
        BE-->>FE: 사전 결과 (의미, 예문, 동의어)
    and 로컬 AI
        FE->>FE: MiniLM 유사어 분석 (즉시)
    end

    Note over FE: 순차 실행 (GPU 경합 방지)
    
    FE->>BE: GET /api/dictionary/phrasal-verbs?word=endure
    BE->>RAG: GET /api/phrasal-verbs?word=endure
    RAG->>LLM: POST /api/chat (think:false)
    LLM-->>RAG: JSON 구동사 목록 (~2초)
    RAG-->>BE: phrasal_verbs[]
    BE-->>FE: 구동사 렌더링

    FE->>BE: GET /api/dictionary/context-suggestions?word=endure
    BE->>RAG: GET /api/context-suggestions?word=endure
    RAG->>LLM: POST /api/chat (think:false)
    LLM-->>RAG: JSON 연관어 목록 (~2초)
    RAG-->>BE: suggestions[]
    BE-->>FE: 연관어 렌더링
```

## 서버 재부팅 시 자동 시작

- ✅ 모든 컨테이너 `restart: always` 또는 `unless-stopped` — **재부팅 시 자동 시작**
- ✅ `phrasal-ollama`가 healthy 상태가 될 때까지 `phrasal-verbs-api`는 대기 (`depends_on: condition: service_healthy`)
- ✅ Ollama 모델(qwen3.6)은 Docker volume(`rag-server_ollama_data`)에 영구 저장

> [!NOTE]
> `IPv4 forwarding is disabled` 경고가 나타나지만, 같은 Docker 네트워크 내 통신(`phrasal-verbs-api ↔ ollama`)에는 영향 없음.
> 외부 접근이 필요하면 `sysctl net.ipv4.ip_forward=1` 설정 필요.

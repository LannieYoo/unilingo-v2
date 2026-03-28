# Step 10: 배포

## 단계 정보
- **단계**: 10/10 - 배포
- **스킬**: `dev-senior_devops`
- **입력**: `src/`, `docs/architecture.md`
- **산출물**: 배포 설정 파일, 실행 중인 서비스

---

## 실행 단계

### 1. 컨텍스트 로드

다음 파일을 읽고 분석합니다:
- `docs/architecture.md` - 배포 아키텍처
- `docs/review-report.md` - 리뷰 통과 확인

### 2. 스킬 로드

`dev-senior_devops` 스킬을 로드하여 DevOps 전문 지식을 활용합니다.

### 3. 배포 준비

#### 3.1 환경 설정
```
환경 리스트:
├── development  (로컬 개발)
├── staging      (테스트 환경)
└── production   (운영 환경)
```

#### 3.2 설정 파일 확인
- [ ] `.env.example` 파일 존재 여부
- [ ] 민감 정보가 소스 코드에 누락되지 않았는지 확인
- [ ] 환경 변수 문서의 완전성 확인

### 4. Docker 설정

#### 4.1 백엔드 Dockerfile
```dockerfile
# Dockerfile.backend
FROM python:3.11-slim

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 코드 복사
COPY src/backend .

# 포트 개방 (Expose)
EXPOSE 8000

# 실행 명령어
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 4.2 프론트엔드 Dockerfile
```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS builder

WORKDIR /app
COPY src/frontend/package*.json ./
RUN npm ci
COPY src/frontend .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 4.3 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 5. CI/CD 설정

#### 5.1 GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        run: pytest --cov

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker images
        run: docker compose build

      - name: Push to registry
        run: |
          docker tag app:latest ${{ secrets.REGISTRY }}/app:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # 배포 스크립트 실행
          echo "Deploying to production..."
```

### 6. 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
alembic upgrade head

# 마이그레이션 검증
alembic current
```

### 7. 배포 체크리스트

#### 7.1 배포 전
- [ ] 코드 리뷰 통과 완료
- [ ] 모든 테스트 통과 완료
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 백업 완료
- [ ] 롤백 (Rollback) 방안 준비 완료

#### 7.2 배포 중
- [ ] 이미지 빌드 성공
- [ ] 이미지 푸시 (Push) 성공
- [ ] 데이터베이스 마이그레이션 성공
- [ ] 서비스 정상 실행

#### 7.3 배포 후
- [ ] 헬스 체크 통과
- [ ] 기능 스모크 테스트 (Smoke Test) 완료
- [ ] 로그 기록 정상 확인
- [ ] 모니터링 지표 정상 확인
- [ ] 성능 베이스라인 정상 확인

### 8. 헬스 체크

```bash
# API 헬스 체크
curl -f http://localhost:8000/health || exit 1

# 데이터베이스 연결 확인
curl -f http://localhost:8000/health/db || exit 1

# Redis 연결 확인
curl -f http://localhost:8000/health/redis || exit 1
```

### 9. 모니터링 설정

#### 9.1 로그 설정
```python
# logging.conf
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
```

#### 9.2 지표 (Metrics) 수집
```python
# metrics.py
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter('request_count', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('request_latency_seconds', 'Request latency', ['method', 'endpoint'])
```

### 10. 롤백 (Rollback) 방안

```bash
# 이전 버전으로 롤백
docker compose down
docker tag app:previous app:latest
docker compose up -d

# 데이터베이스 롤백
alembic downgrade -1
```

### 11. 배포 문서

`docs/deployment.md`를 생성합니다:

```markdown
# 배포 정의서

## 환경 요구사항
- Docker 24+
- Docker Compose 2+
- PostgreSQL 15+
- Redis 7+

## 빠른 배포 방법

```bash
# 저장소 클론
git clone <repo>
cd <project>

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 필요한 값 입력

# 서비스 시작
docker compose up -d

# 마이그레이션 실행
docker compose exec backend alembic upgrade head

# 상태 확인
docker compose ps
```

## 환경 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| DATABASE_URL | 데이터베이스 연결 URI | postgresql://... |
| REDIS_URL | Redis 연결 URI | redis://... |
| SECRET_KEY | 보안 키 | xxx |

## 자주 사용하는 명령어

```bash
# 로그 확인
docker compose logs -f

# 서비스 재시작
docker compose restart

# 서비스 중단
docker compose down
```
```

### 12. 배포 확인

```
배포 상태:
✓ 이미지 빌드 성공
✓ 서비스 실행 성공
✓ 헬스 체크 통과
✓ 스모크 테스트 통과

[C] 확인 - 배포 완료
[R] 롤백 - 이전 버전으로 롤백
[L] 로그 - 로그 확인
```

---

## 완료 확인

- [ ] Docker 설정 완료
- [ ] CI/CD 설정 완료
- [ ] 서비스 정상 실행됨
- [ ] 헬스 체크 통과
- [ ] 모니터링 설정 완료
- [ ] 배포 문서 작성 완료

## 상태 업데이트

```yaml
phases:
  deployment:
    status: completed
    completed_at: {current_time}
    environment: production
    version: {version}
    url: https://app.example.com
```

---

## 🎉 워크플로우 완료

축하합니다! 전체 개발 프로세스가 완료되었습니다:

```
✓ Phase 1:  요구사항 분석
✓ Phase 2:  제품 요구사항 정의서
✓ Phase 3:  시스템 아키텍처
✓ Phase 4:  작업 분해
✓ Phase 5:  데이터베이스 설계
✓ Phase 6:  백엔드 개발
✓ Phase 7:  프론트엔드 개발
✓ Phase 8:  테스트
✓ Phase 9:  코드 리뷰
✓ Phase 10: 배포

총 소요 시간: {total_time}
```

### 산출물 리스트

```
docs/
├── requirements.md      # 요구사항 정의서
├── prd.md              # 제품 요구사항 정의서
├── architecture.md     # 아키텍처 정의서
├── stories.md          # 작업 리스트
├── database.md         # 데이터베이스 정의서
├── test-report.md      # 테스트 보고서
├── review-report.md    # 리뷰 보고서
└── deployment.md       # 배포 정의서

src/
├── backend/            # 백엔드 코드
└── frontend/           # 프론트엔드 코드

tests/                  # 테스트 코드
deploy/                 # 배포 설정
```

# Step 5: 데이터베이스 설계

## 단계 정보
- **단계**: 5/10 - 데이터베이스 설계
- **스킬**: `dev-senior_data_engineer`
- **입력**: `docs/architecture.md`, `docs/stories.md`
- **산출물**: `docs/database.md`, 마이그레이션(migration) 파일

---

## 실행 단계

### 1. 컨텍스트 로드

다음 파일을 읽고 분석합니다:
- `docs/architecture.md` - 데이터베이스 유형 및 기술 선정
- `docs/stories.md` - 데이터 관련 Story

### 2. 스킬 로드

`dev-senior_data_engineer` 스킬을 로드하여 데이터베이스 설계 전문 지식을 활용합니다.

### 3. 엔티티 식별

요구사항에서 핵심 엔티티를 식별합니다:

```
엔티티 리스트:
├── User (사용자)
├── Role (역할)
├── Permission (권한)
├── Order (주문)
├── OrderItem (주문 항목)
├── Product (제품)
└── ...
```

### 4. ER 다이어그램 설계

엔티티 간의 관계를 설계합니다:

```
┌─────────┐       ┌─────────┐       ┌─────────┐
│  User   │──1:N──│  Order  │──1:N──│OrderItem│
└─────────┘       └─────────┘       └─────────┘
     │                                    │
     │ N:M                                │ N:1
     ▼                                    ▼
┌─────────┐                         ┌─────────┐
│  Role   │                         │ Product │
└─────────┘                         └─────────┘
```

### 5. 테이블 구조 설계

각 엔티티에 대한 테이블 구조를 설계합니다:

```sql
-- users 테이블
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### 6. 명명 규칙 확인 (Naming Convention)

| 규칙 | 설명 | 예시 |
|------|------|------|
| 테이블 이름 | 소문자 복수형 | `users`, `orders` |
| 필드 이름 | snake_case | `created_at`, `user_id` |
| 기본 키 | `id` | `id` |
| 외래 키 | `{table}_id` | `user_id`, `order_id` |
| 타임스탬프 | `_at` 접미사 | `created_at`, `deleted_at` |
| 불리언 값 | `is_` 접두사 | `is_active`, `is_deleted` |

### 7. 인덱스 설계

```sql
-- 기본 키 인덱스 (자동)
-- 고유 인덱스
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 조회 인덱스
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 결합 인덱스
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### 8. 마이그레이션(Migration) 생성

마이그레이션 파일을 생성합니다:

```
migrations/
├── 001_create_users.sql
├── 002_create_roles.sql
├── 003_create_user_roles.sql
├── 004_create_products.sql
├── 005_create_orders.sql
└── 006_create_order_items.sql
```

**마이그레이션 형식**:
```sql
-- migrations/001_create_users.sql
-- Description: Create users table
-- Author: {작성자}
-- Date: {날짜}

-- Up (적용)
CREATE TABLE users (
    ...
);

-- Down (되돌리기)
DROP TABLE IF EXISTS users;
```

### 9. 확인 스크립트 실행

데이터베이스 설계를 확인합니다:

```bash
# 명명 규칙 확인
python scripts/check-db-naming.py

# 테이블 구조 확인
python scripts/check-db-schema.py

# 인덱스 확인
python scripts/check-db-indexes.py

# 외래 키 확인
python scripts/check-db-foreign-keys.py
```

확인 항목:
- [ ] 테이블 명명 규칙 준수
- [ ] 필드 명명 규칙 준수
- [ ] 필수 인덱스 존재 여부
- [ ] 외래 키 관계의 정확성
- [ ] 중복 또는 불필요한 필드 없음

### 10. 문서 생성

`docs/database.md`를 생성합니다:

```markdown
# {프로젝트 이름} - 데이터베이스 설계 정의서

## 1. 개요
### 1.1 데이터베이스 유형
### 1.2 문자셋 (Charset)
### 1.3 명명 규칙

## 2. ER 다이어그램

## 3. 테이블 구조
### 3.1 users 테이블
| 필드 | 유형 | 제약 | 설명 |
|------|------|------|------|
| id | SERIAL | PK (기본 키) | 고유 식별자 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 이메일 주소 |
| ... | ... | ... | ... |

### 3.2 orders 테이블
...

## 4. 인덱스 설계
### 4.1 인덱스 리스트
### 4.2 인덱스 전략

## 5. 데이터 딕셔너리
### 5.1 열거형 (Enum) 값
### 5.2 상태 정의

## 6. 마이그레이션 기록
| 버전 | 파일 | 설명 | 실행 시간 |
|------|------|------|----------|
| 001 | create_users.sql | 사용자 테이블 생성 | - |
| ... | ... | ... | ... |

## 7. 성능 고려 사항
### 7.1 파티셔닝 전략
### 7.2 아카이빙 전략
```

### 11. 사용자 확인

```
[C] 확인 - 데이터베이스 설계 완료, 다음 단계로 진행
[E] 편집 - 테이블 구조 수정
[A] 추가 - 새로운 테이블 추가
[I] 인덱스 - 인덱스 조정
```

---

## 완료 확인

- [ ] `docs/database.md` 생성됨
- [ ] 모든 엔티티에 대응하는 테이블이 존재함
- [ ] 마이그레이션 파일이 생성됨
- [ ] 명명 규칙 확인 통과
- [ ] 인덱스 설계가 합리적임
- [ ] 사용자가 최종 확인함

## 상태 업데이트

```yaml
phases:
  database:
    status: completed
    completed_at: {current_time}
    tables_created: {n}
    migrations_generated: {n}
```

## 다음 단계

→ `step-06-backend.md`로 진입

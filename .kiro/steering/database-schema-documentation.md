# 데이터베이스 스키마 문서화 규범 (Database Schema Documentation Standard)

## 개요

PostgreSQL 데이터베이스의 테이블 구조가 변경될 때마다 `doc/database-schema.md` 파일을 자동으로 업데이트합니다.

---

## 규칙

### 1. 자동 업데이트 트리거

다음 상황에서 `doc/database-schema.md` 파일을 업데이트해야 합니다:

- 새로운 테이블 생성
- 기존 테이블에 컬럼 추가
- 컬럼 타입 변경
- 컬럼 삭제
- 인덱스 추가/삭제
- 외래키 관계 변경

### 2. 문서 위치

```
project_root/
└── doc/
    └── database-schema.md
```

### 3. 문서 형식

각 테이블에 대해 다음 정보를 포함:

```markdown
## 테이블명: {table_name}

**설명**: {테이블 설명}

### 컬럼

| 컬럼명 | 타입 | Nullable | 기본값 | 설명 |
|--------|------|----------|--------|------|
| id | BIGINT | NO | AUTO_INCREMENT | 기본키 |
| ... | ... | ... | ... | ... |

### 인덱스

| 인덱스명 | 컬럼 | 타입 |
|----------|------|------|
| PRIMARY | id | PRIMARY KEY |
| idx_xxx | column_name | INDEX |

### 외래키

| 컬럼 | 참조 테이블 | 참조 컬럼 |
|------|-------------|-----------|
| user_id | users | id |
```

### 4. 업데이트 절차

1. `backend/src/common/modules/*/_06_models/model_*.py` 파일 변경 감지
2. 변경된 모델의 스키마 정보 추출
3. `doc/database-schema.md` 파일 업데이트
4. 마지막 업데이트 날짜 기록

---

## 체크리스트

- [ ] 모델 파일 변경 시 `doc/database-schema.md` 업데이트 완료
- [ ] 모든 컬럼 정보가 정확히 기록됨
- [ ] 인덱스 정보가 포함됨
- [ ] 외래키 관계가 명시됨
- [ ] 마지막 업데이트 날짜가 기록됨

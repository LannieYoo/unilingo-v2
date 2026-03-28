# Step 7: 프론트엔드 개발

## 단계 정보
- **단계**: 7/10 - 프론트엔드 개발
- **스킬**: `dev-senior_frontend`
- **입력**: `docs/stories.md`, `docs/architecture.md`
- **산출물**: `src/frontend/`

---

## 실행 단계

### 1. 컨텍스트 로드

다음 파일을 읽고 분석합니다:
- `docs/architecture.md` - 프론트엔드 기술 스택 및 디렉토리 구조
- `docs/stories.md` - 프론트엔드 관련 Story
- `docs/prd.md` - UI/UX 요구사항

### 2. 스킬 로드

`dev-senior_frontend` 스킬을 로드하여 프론트엔드 개발 전문 지식을 활용합니다.

### 3. 작업 순서 지정

`docs/stories.md`에서 프론트엔드 관련 Story를 가져와 의존성 관계에 따라 정렬합니다:

```
1. [FE-001] 프로젝트 초기화 및 설정
2. [FE-002] 라우팅 설정
3. [FE-003] 전역 상태 관리 구현
4. [FE-004] API 서비스 계층 구현
5. [FE-005] 공통 컴포넌트 라이브러리 구축
6. [FE-006] 페이지 컴포넌트 구현
...
```

### 4. 디렉토리 구조

```
src/frontend/
├── public/              # 정적 리소스
├── src/
│   ├── assets/          # 이미지, 폰트 등
│   ├── components/      # 공통 컴포넌트
│   │   ├── common/      # 기초 컴포넌트
│   │   ├── layout/      # 레이아웃 컴포넌트
│   │   └── features/    # 기능성 컴포넌트
│   ├── hooks/           # 커스텀 Hooks
│   ├── pages/           # 페이지 컴포넌트
│   ├── services/        # API 서비스
│   ├── store/           # 상태 관리
│   ├── styles/          # 전역 스타일
│   ├── types/           # TypeScript 타입 정의
│   ├── utils/           # 유틸리티 함수
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 5. 개발 사이클

각 Story에 대하여 다음 과정을 반복합니다:

```
┌─────────────────────────────────────────────┐
│  Story: {story_id} - {story_title}          │
├─────────────────────────────────────────────┤
│  1. Story 설명 및 수락 기준 읽기              │
│  2. 컴포넌트 파일 생성                       │
│  3. 컴포넌트 로직 구현                       │
│  4. 스타일 작성                              │
│  5. 타입 정의 추가                           │
│  6. 확인 스크립트 실행                       │
│  7. 완료 표시 / 문제 해결                    │
└─────────────────────────────────────────────┘
```

### 6. 컴포넌트 규격

#### 6.1 컴포넌트 구조
```tsx
// components/features/UserCard/UserCard.tsx
import { FC } from 'react';
import styles from './UserCard.module.css';
import { UserCardProps } from './types';

/**
 * 사용자 카드 컴포넌트
 * 사용자 기본 정보를 표시하는 데 사용됩니다.
 */
export const UserCard: FC<UserCardProps> = ({ user, onClick }) => {
  return (
    <div className={styles.card} onClick={() => onClick?.(user.id)}>
      <img src={user.avatar} alt={user.name} className={styles.avatar} />
      <div className={styles.info}>
        <h3 className={styles.name}>{user.name}</h3>
        <p className={styles.email}>{user.email}</p>
      </div>
    </div>
  );
};
```

#### 6.2 타입 정의
```tsx
// components/features/UserCard/types.ts
import { User } from '@/types/user';

export interface UserCardProps {
  user: User;
  onClick?: (userId: number) => void;
}
```

#### 6.3 스타일 파일
```css
/* components/features/UserCard/UserCard.module.css */
.card {
  display: flex;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}
```

#### 6.4 내보내기 (Export) 인덱스
```tsx
// components/features/UserCard/index.ts
export { UserCard } from './UserCard';
export type { UserCardProps } from './types';
```

### 7. API 서비스 계층

```tsx
// services/userService.ts
import { api } from './api';
import { User, CreateUserDto, UpdateUserDto } from '@/types/user';

export const userService = {
  getAll: () => api.get<User[]>('/users'),
  getById: (id: number) => api.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) => api.post<User>('/users', data),
  update: (id: number, data: UpdateUserDto) => api.put<User>(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};
```

### 8. 상태 관리

```tsx
// store/userStore.ts (Zustand 예시)
import { create } from 'zustand';
import { User } from '@/types/user';
import { userService } from '@/services/userService';

interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  loading: false,
  error: null,
  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const users = await userService.getAll();
      set({ users, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));
```

### 9. 확인 스크립트

각 모듈이 완료될 때마다 확인 작업을 실행합니다:

```bash
# TypeScript 확인
npm run type-check

# ESLint 확인
npm run lint

# 컴포넌트 확인
python scripts/check-component.py --dir src/components/

# 스타일 확인
python scripts/check-styles.py --dir src/

# 웹 접근성 (a11y) 확인
python scripts/check-a11y.py --dir src/components/
```

확인 항목:
- [ ] TypeScript 오류 없음
- [ ] ESLint 경고 없음
- [ ] 컴포넌트 명명 규칙 준수
- [ ] Props 타입 정의 완료
- [ ] 웹 접근성 속성 준수

### 10. Story 완료 확인

각 Story 완료 후:

```
[✓] Story FE-001 완료
    - 생성 파일: components/features/UserCard/
    - 확인 결과: 통과
    - 소요 시간: 30분

다음 Story로 진행하겠습니까? [Y/n]
```

---

## 완료 확인

- [ ] 모든 프론트엔드 Story가 완료됨
- [ ] TypeScript 빌드 통과
- [ ] ESLint 확인 통과
- [ ] 페이지 정상 접속 확인
- [ ] 백엔드 API 연동 성공

## 상태 업데이트

```yaml
phases:
  frontend:
    status: completed
    completed_at: {current_time}
    stories_completed:
      - FE-001
      - FE-002
      - ...
```

## 다음 단계

→ `step-08-testing.md`로 진입

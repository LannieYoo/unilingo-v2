# 프론트엔드 모듈 계층화 규범 (Frontend Module Layering Standard)

## 개요

본 규범은 `frontend/src/*/modules/` 하위 모듈의 표준 계층 구조를 정의하여 모듈의 높은 응집도, 낮은 결합도, 독립적 이전 가능성을 보장합니다.

## 目录结构

```
module_name/
├── _01_router/               # 라우터 계층 - 모듈 진입점, 라우터 설정
│   ├── index.js
│   └── routes.jsx
│
├── _02_views/                # 뷰 계층 - 페이지 뷰 컴포넌트
│   ├── index.js
│   ├── ListView.jsx
│   ├── DetailView.jsx
│   └── FormView.jsx
│
├── _03_components/           # 컴포넌트 계층 - 모듈 재사용 가능 컴포넌트
│   ├── index.js
│   ├── Card.jsx
│   ├── Filter.jsx
│   └── Modal.jsx
│
├── _04_hooks/                # Hook 계층 - 비즈니스 로직 Hooks
│   ├── index.js
│   └── useData.js
│
├── _05_stores/               # 상태 계층 - 모듈 상태 관리
│   ├── index.js
│   └── store.js
│
├── _06_services/             # 서비스 계층 - API 호출
│   ├── index.js
│   └── service.js
│
├── _07_utils/                # 유틸리티 계층 - 모듈 유틸리티 함수
│   ├── index.js
│   └── helpers.js
│
├── _08_constants/            # 상수 계층 - 모듈 상수
│   ├── index.js
│   └── constants.js
│
├── _09_locales/              # 국제화 계층 - 번역 파일
│   ├── ko.json
│   └── zh.json
│
├── _10_styles/               # 스타일 계층 - 모듈 스타일 파일 (shared/common만 사용)
│   ├── index.css
│   └── variables.css
│
├── _11_interceptors/         # 인터셉터 계층 - AOP 인터셉터 (shared 모듈만 사용)
│   ├── index.js
│   └── xxx.interceptor.js
│
└── index.js                  # 모듈 통합 내보내기
```

## 계층 설명

### _01_router/ - 라우터 계층
- **책임**: 모듈 진입점, 라우터 설정, 모듈 이전 지원
- **의존성**: _02_views/에만 의존

**⚠️ 반드시 포함해야 하는 두 개의 파일:**

| 파일 | 확장자 | 책임 | 설명 |
|------|--------|------|------|
| `index.js` | `.js` | 통합 내보내기 | re-export만 수행, JSX 포함하지 않음 |
| `routes.jsx` | `.jsx` | 라우터 설정 | JSX 문법을 포함한 라우터 정의 |

**✅ 파일 명명 규범:**
| 파일명 | 내보내기명 | 예시 |
|----------|----------|------|
| index.js | re-export | routes.jsx에서 내보내기 |
| routes.jsx | get + Module + Routes | `routes.jsx` → `getMembersRoutes` |

**❌ 금지사항:**
- `.js` 파일에서 JSX 문법 사용
- 라우터 설정과 JSX를 포함하는 `index.js` 파일 하나만 사용
- 페이지 컴포넌트 구현
- 비즈니스 로직
- 레이아웃 컴포넌트

**示例 - index.js (统一导出):**

```js
// _01_router/index.js
/**
 * Router layer exports.
 */
export { getModuleRoutes, routes, default } from './routes';
```

**示例 - routes.jsx (路由配置):**

```jsx
// _01_router/routes.jsx
/**
 * Module routes.
 * 
 * Defines route configuration for the module.
 */
import { lazy } from 'react';

const ListView = lazy(() => import('../_02_views/ListView'));
const DetailView = lazy(() => import('../_02_views/DetailView'));
const FormView = lazy(() => import('../_02_views/FormView'));

/**
 * 모듈 라우터 설정 가져오기
 * @param {Object} options
 * @param {string} options.basePath - 기본 경로
 * @param {Function} options.LazyWrapper - 지연 로딩 래퍼
 * @param {Function} options.AuthWrapper - 인증 래퍼
 */
export function getModuleRoutes(options = {}) {
  const {
    basePath = 'resources',
    LazyWrapper = ({ children }) => children,
    AuthWrapper = ({ children }) => children,
  } = options;

  return {
    path: basePath,
    children: [
      {
        index: true,
        element: (
          <AuthWrapper>
            <LazyWrapper>
              <ListView />
            </LazyWrapper>
          </AuthWrapper>
        ),
      },
      {
        path: ':id',
        element: (
          <AuthWrapper>
            <LazyWrapper>
              <DetailView />
            </LazyWrapper>
          </AuthWrapper>
        ),
      },
      {
        path: 'create',
        element: (
          <AuthWrapper>
            <LazyWrapper>
              <FormView />
            </LazyWrapper>
          </AuthWrapper>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <AuthWrapper>
            <LazyWrapper>
              <FormView />
            </LazyWrapper>
          </AuthWrapper>
        ),
      },
    ],
  };
}

export const routes = getModuleRoutes();
export default routes;
```

---

### _02_views/ - 뷰 계층
- **책임**: 페이지 뷰 컴포넌트, 다른 계층을 조합하여 페이지 기능 완성
- **의존성**: _03_components/, _04_hooks/, _05_stores/, _06_services/, _07_utils/, _08_constants/에 의존 가능

**✅ 포함 가능한 것:**
| 파일명 | 컴포넌트명 | 예시 |
|----------|----------|------|
| ListView.jsx | ListView | 목록 뷰 |
| DetailView.jsx | DetailView | 상세 뷰 |
| FormView.jsx | FormView | 폼 뷰 (신규/편집)|
| PascalCaseView.jsx | PascalCaseView | 기타 사용자 정의 뷰 |

**❌ 포함 금지:**
- API 호출 로직 (_06_services/에 배치)
- 재사용 가능한 UI 컴포넌트 (_03_components/에 배치)
- 비즈니스 로직 Hooks (_04_hooks/에 배치)

**示例:**

```jsx
// _02_views/ListView.jsx
import { useState, useEffect } from 'react';
import { Table, Pagination } from '@shared/components';
import { Card, Filter } from '../_03_components';
import { useData } from '../_04_hooks';

export default function ListView() {
  const { data, loading } = useData();
  // 뷰 로직...
}
```

**내보내기 규범:**

```js
// _02_views/index.js
export { default as ListView } from './ListView';
export { default as DetailView } from './DetailView';
export { default as FormView } from './FormView';
```

---

### _03_components/ - 컴포넌트 계층
- **책임**: 모듈 전용 재사용 가능 컴포넌트
- **의존성**: @shared/components, _07_utils/, _08_constants/에만 의존

**✅ 只能包含:**
| 文件命名 | 组件命名 | 示例 |
|----------|----------|------|
| PascalCase.jsx | PascalCase | `Card.jsx` → `Card` |
| PascalCaseModal.jsx | PascalCaseModal | `EditModal.jsx` → `EditModal` |
| PascalCaseForm.jsx | PascalCaseForm | `FilterForm.jsx` → `FilterForm` |
| PascalCaseTable.jsx | PascalCaseTable | `DataTable.jsx` → `DataTable` |

**❌ 禁止包含:**
- 视图组件（应放 _02_views/）
- API 调用（应放 _06_services/）
- 状态管理逻辑（应放 _05_stores/）

**示例:**

```jsx
// _03_components/Card.jsx
import { Card as BaseCard } from '@shared/components';
import { STATUS_MAP } from '../_08_constants';

export function Card({ item, onClick }) {
  return (
    <BaseCard onClick={onClick}>
      <h3>{item.name}</h3>
      <span>{STATUS_MAP[item.status]}</span>
    </BaseCard>
  );
}

export default Card;
```

---

### _04_hooks/ - Hook层
- **职责**: 模块特定的业务逻辑 Hooks
- **依赖**: 可依赖 _05_stores/、_06_services/、_07_utils/、_08_constants/

**✅ 只能包含:**
| 文件命名 | Hook命名 | 示例 |
|----------|----------|------|
| useXxx.js | useXxx | `useData.js` → `useData` |
| useXxxAction.js | useXxxAction | `useFilter.js` → `useFilter` |

**❌ 禁止包含:**
- UI 组件
- 视图组件
- 通用 Hooks（应放 @shared/hooks）

**示例:**

```js
// _04_hooks/useData.js
import { useState, useEffect, useCallback } from 'react';
import { service } from '../_06_services';

export function useData(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await service.getById(id);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export default useData;
```

---

### _05_stores/ - 状态层
- **职责**: 模块特定的状态管理
- **依赖**: 可依赖 _06_services/、_08_constants/

**✅ 只能包含:**
| 文件命名 | Store命名 | 示例 |
|----------|----------|------|
| store.js | useStore | `store.js` → `useStore` |
| xxxStore.js | useXxxStore | `filterStore.js` → `useFilterStore` |

**❌ 禁止包含:**
- UI 组件
- API 调用逻辑（应通过 _06_services/ 调用）
- 全局状态（应放 @shared/stores）

**示例:**

```js
// _05_stores/store.js
import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // State
  items: [],
  selectedItem: null,
  filters: {},

  // Actions
  setItems: (items) => set({ items }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),

  // Getters
  getFilteredItems: () => {
    const { items, filters } = get();
    return items.filter(/* 过滤逻辑 */);
  }
}));

export default useStore;
```

---

### _06_services/ - 服务层
- **职责**: 模块 API 调用封装
- **依赖**: 仅依赖 @shared/services/apiService、_08_constants/

**✅ 只能包含:**
| 文件命名 | 导出命名 | 示例 |
|----------|----------|------|
| service.js | service | `service.js` → `service` |
| xxxService.js | xxxService | `fileService.js` → `fileService` |

**❌ 禁止包含:**
- UI 组件
- 状态管理
- 错误捕获（让调用方处理）

**示例:**

```js
// _06_services/service.js
import { apiService } from '@shared/services';

const API_PREFIX = '/api/v1/resources';

export const service = {
  async getList(params) {
    return await apiService.get(API_PREFIX, { params });
  },

  async getById(id) {
    return await apiService.get(`${API_PREFIX}/${id}`);
  },

  async create(data) {
    return await apiService.post(API_PREFIX, data);
  },

  async update(id, data) {
    return await apiService.patch(`${API_PREFIX}/${id}`, data);
  },

  async delete(id) {
    return await apiService.delete(`${API_PREFIX}/${id}`);
  }
};

export default service;
```

---

### _07_utils/ - 工具层
- **职责**: 模块特定的工具函数
- **依赖**: 仅依赖 _08_constants/

**✅ 只能包含:**
| 文件命名 | 函数命名 | 示例 |
|----------|----------|------|
| helpers.js | camelCase | `helpers.js` → `formatName`, `validateInput` |
| xxxHelpers.js | camelCase | `dateHelpers.js` → `formatDate` |

**❌ 禁止包含:**
- UI 组件
- API 调用
- 通用工具（应放 @shared/utils）

**示例:**

```js
// _07_utils/helpers.js
import { STATUS_MAP } from '../_08_constants';

export function formatName(item) {
  return `${item.name} (${item.code})`;
}

export function getStatusLabel(status) {
  return STATUS_MAP[status] || '未知';
}

export function validateCode(code) {
  return /^\d{10}$/.test(code);
}
```

---

### _08_constants/ - 常量层
- **职责**: 模块特定的常量定义
- **依赖**: 无依赖，最底层

**✅ 只能包含:**
| 文件命名 | 常量命名 | 示例 |
|----------|----------|------|
| constants.js | UPPER_SNAKE_CASE | `constants.js` → `STATUS_MAP`, `TYPES` |

**❌ 禁止包含:**
- 函数逻辑
- API 调用
- 全局常量（应放 @shared/utils/constants）

**示例:**

```js
// _08_constants/constants.js
export const STATUS_MAP = {
  PENDING: '待处理',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
};

export const TYPES = {
  TYPE_A: '类型A',
  TYPE_B: '类型B',
};

export const PAGE_SIZE = 10;
```

---

### _09_locales/ - 国际化层
- **职责**: 模块翻译文件
- **依赖**: 无依赖

**✅ 只能包含:**
| 文件命名 | 示例 |
|----------|------|
| {lang}.json | `ko.json`, `zh.json` |

**示例:**

```json
// _09_locales/ko.json
{
  "title": "회원 관리",
  "list": "회원 목록",
  "detail": "회원 상세",
  "companyName": "회사명",
  "businessNumber": "사업자등록번호"
}
```

```json
// _09_locales/zh.json
{
  "title": "会员管理",
  "list": "会员列表",
  "detail": "会员详情",
  "companyName": "公司名称",
  "businessNumber": "营业执照号"
}
```

---

### _10_styles/ - 样式层
- **职责**: 模块全局样式、CSS 变量定义
- **依赖**: 无依赖
- **适用范围**: 仅 `shared/modules/common/` 模块使用，业务模块不需要

**✅ 只能包含:**
| 文件命名 | 示例 |
|----------|------|
| index.css | 全局样式入口 |
| variables.css | CSS 变量定义 |
| reset.css | 样式重置 |
| utilities.css | 工具类样式 |

**❌ 禁止包含:**
- JavaScript 文件
- 组件特定样式（应放组件同目录）
- 业务逻辑

**示例:**

```css
/* _10_styles/variables.css */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
}
```

```css
/* _10_styles/index.css */
@import './variables.css';
@import './reset.css';
@import './utilities.css';
```

---

### _11_interceptors/ - 拦截器层
- **职责**: AOP 拦截器，用于日志、监控、请求处理等横切关注点
- **依赖**: 可依赖 _04_hooks/、_05_stores/、_06_services/、_07_utils/、_08_constants/
- **适用范围**: 仅 `shared/modules/` 下的模块使用，业务模块不需要

**✅ 只能包含:**
| 文件命名 | 导出命名 | 示例 |
|----------|----------|------|
| xxx.interceptor.js | installXxxInterceptor, uninstallXxxInterceptor | `request.interceptor.js` |
| index.js | 统一导出 | 导出所有拦截器 |

**❌ 禁止包含:**
- UI 组件
- 视图组件
- 业务逻辑（应放 _03_impls/）

**拦截器分布规则:**
| 拦截器类型 | 所属模块 | 示例 |
|------------|----------|------|
| HTTP 请求拦截 | http | request.interceptor.js, cache.interceptor.js |
| 认证拦截 | auth | auth.interceptor.js |
| 日志监控拦截 | logger | component.interceptor.js, hook.interceptor.js, router.interceptor.js, performance.interceptor.js |

**示例:**

```js
// _11_interceptors/request.interceptor.js
/**
 * Request Interceptor - HTTP 请求拦截器
 */

let isInstalled = false;

export function installRequestInterceptor(axiosInstance) {
  if (isInstalled) return false;
  
  axiosInstance.interceptors.request.use(
    (config) => {
      // 添加请求头、日志等
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  isInstalled = true;
  return true;
}

export function uninstallRequestInterceptor() {
  if (!isInstalled) return false;
  isInstalled = false;
  return true;
}

export function isRequestInterceptorInstalled() {
  return isInstalled;
}

export default {
  install: installRequestInterceptor,
  uninstall: uninstallRequestInterceptor,
  isInstalled: isRequestInterceptorInstalled,
};
```

```js
// _11_interceptors/index.js
export {
  installRequestInterceptor,
  uninstallRequestInterceptor,
  isRequestInterceptorInstalled,
} from './request.interceptor.js';

export {
  installCacheInterceptor,
  uninstallCacheInterceptor,
} from './cache.interceptor.js';
```

---

## 依赖规则

```
┌─────────────────────────────────────────────────────────────────┐
│                      _01_router/ (入口)                         │
│                        路由配置                                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      _02_views/ (视图)                          │
│                       视图组件                                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ↓               ↓               ↓
        ┌────────────────┐ ┌───────────┐ ┌────────────────┐
        │_03_components/ │ │_04_hooks/ │ │  _05_stores/   │
        │   可复用组件    │ │ 业务Hook  │ │   状态管理      │
        └────────────────┘ └───────────┘ └────────────────┘
                 │               │               │
                 └───────────────┼───────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                     _06_services/ (服务)                        │
│                       API 调用                                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│                      _07_utils/ (工具)                          │
│                       工具函数                                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│             _08_constants/ + _09_locales/ (基础)                │
│                    常量 + 国际化                                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────┐
│          _10_styles/ + _11_interceptors/ (扩展层)               │
│              样式 + 拦截器（仅 shared 模块）                      │
└─────────────────────────────────────────────────────────────────┘
```

**核心规则:**
- 上层只能依赖下层（序号小的依赖序号大的）
- 同层之间不能相互依赖
- 禁止循环依赖
- _10_styles/ 和 _11_interceptors/ 是扩展层，仅 shared 模块使用
- 业务模块（admin/member）通常只使用 _01 到 _09 层

---

## 模块导出规范

```js
// index.js
/**
 * Module Name
 * 模块描述 - 可独立迁移
 */

// 路由
export * from './_01_router';

// 视图
export * from './_02_views';

// 组件
export * from './_03_components';

// Hooks
export * from './_04_hooks';

// Stores
export * from './_05_stores';

// Services
export * from './_06_services';

// 工具
export * from './_07_utils';

// 常量
export * from './_08_constants';

// 样式（仅 shared/common 模块）
// export * from './_10_styles';

// 拦截器（仅 shared 模块）
// export * from './_11_interceptors';
```

---

## 何时使用各层

| 层级 | 目录 | 必须 | 说明 |
|------|------|------|------|
| 路由层 | _01_router/ | ✅ | 支持模块迁移 |
| 视图层 | _02_views/ | ✅ | 至少一个视图 |
| 组件层 | _03_components/ | ❌ | 有可复用组件时 |
| Hook层 | _04_hooks/ | ❌ | 有复杂业务逻辑时 |
| 状态层 | _05_stores/ | ❌ | 需要跨组件状态时 |
| 服务层 | _06_services/ | ✅ | 有 API 调用时 |
| 工具层 | _07_utils/ | ❌ | 有模块特定工具时 |
| 常量层 | _08_constants/ | ❌ | 有模块特定常量时 |
| 国际化层 | _09_locales/ | ✅ | 支持多语言 |
| 样式层 | _10_styles/ | ❌ | 仅 shared/common 模块 |
| 拦截器层 | _11_interceptors/ | ❌ | 仅 shared 模块 |

---

## 命名规范总览

| 层级 | 文件命名 | 导出命名 |
|------|---------|---------|
| _01_router/ | index.js + routes.jsx | getModuleRoutes (从 routes.jsx) |
| _02_views/ | XxxView.jsx | XxxView |
| _03_components/ | Xxx.jsx | Xxx |
| _04_hooks/ | useXxx.js | useXxx |
| _05_stores/ | store.js 或 xxxStore.js | useStore 或 useXxxStore |
| _06_services/ | service.js 或 xxxService.js | service 或 xxxService |
| _07_utils/ | helpers.js 或 xxxHelpers.js | functionName |
| _08_constants/ | constants.js | UPPER_SNAKE_CASE |
| _09_locales/ | {lang}.json | - |
| _10_styles/ | xxx.css | - |
| _11_interceptors/ | xxx.interceptor.js | installXxxInterceptor, uninstallXxxInterceptor |

**⚠️ 文件扩展名规则:**
- `.jsx` - 包含 JSX 语法的文件（组件、视图、路由配置）
- `.js` - 纯 JavaScript 文件（hooks、services、utils、constants、index 导出文件）

---

## 模块迁移 Checklist

将模块迁移到其他项目时：

- [ ] 复制整个模块目录
- [ ] 检查 @shared 依赖是否存在
- [ ] 在目标项目注册路由 (`getModuleRoutes()`)
- [ ] 加载翻译文件到 i18n
- [ ] 配置路径别名（如需要）
- [ ] 测试所有页面功能

---

## 代码审查检查点

| 检查项 | 说明 |
|--------|------|
| 目录结构 | 是否符合分层规范？ |
| 依赖方向 | 是否只依赖下层（序号大的）？ |
| 命名规范 | 文件名、导出名是否正确？ |
| 文件扩展名 | JSX 语法是否在 `.jsx` 文件中？ |
| 路由层结构 | 是否有 `index.js` + `routes.jsx` 两个文件？ |
| 导出规范 | 每层是否有 index.js 统一导出？ |
| 路由配置 | 是否提供 getModuleRoutes 函数？ |
| 翻译文件 | 是否有 ko.json 和 zh.json？ |
| Service | 是否不捕获错误？ |
| 组件命名 | 是否使用具名函数？ |
| 拦截器命名 | 是否使用 xxx.interceptor.js 格式？ |
| 扩展层使用 | _10/_11 层是否仅在 shared 模块使用？ |

---

## Shared 模块结构

`shared/modules/` 下的模块遵循特殊规则，用于存放跨业务模块共享的代码：

```
shared/
└── modules/
    ├── common/                    # 通用模块（组件 + hooks + 样式）
    │   ├── _03_components/        # Button, Input, Modal, Table...
    │   ├── _04_hooks/             # useDebounce, usePagination...
    │   ├── _05_stores/            # uiStore
    │   ├── _07_utils/             # format.js, validation.js
    │   ├── _08_constants/         # 通用常量
    │   ├── _10_styles/            # 全局样式
    │   └── index.js
    │
    ├── auth/                      # 认证模块
    │   ├── _04_hooks/             # useAuth
    │   ├── _05_stores/            # authStore
    │   ├── _06_services/          # auth.service.js
    │   ├── _07_utils/             # storage.js
    │   ├── _11_interceptors/      # auth.interceptor.js
    │   └── index.js
    │
    ├── upload/                    # 上传模块
    │   ├── _03_components/        # FileUploadButton, UploadProgress
    │   ├── _04_hooks/             # useUpload
    │   ├── _06_services/          # upload.service.js
    │   ├── _07_utils/             # fileValidation.js
    │   └── index.js
    │
    ├── http/                      # HTTP 模块
    │   ├── _06_services/          # api.service.js
    │   ├── _07_utils/             # helpers.js
    │   ├── _08_constants/         # API_PREFIX
    │   ├── _11_interceptors/      # request, cache, error-classifier, error-recovery, offline
    │   └── index.js
    │
    ├── logger/                    # 日志模块
    │   ├── _04_hooks/             # useLogger
    │   ├── _07_utils/             # formatters
    │   ├── _08_constants/         # LOG_LAYERS, LOG_LEVELS
    │   ├── _11_interceptors/      # component, hook, router, performance
    │   └── index.js
    │
    ├── exception/                 # 异常模块
    │   └── ...
    │
    └── i18n/                      # 国际化模块
        └── ...
```

**Shared 模块设计原则:**
- **全局最小原则**: 只放真正被多个业务模块共享的代码
- **按功能分模块**: 不按技术类型（如 utils、hooks）分，而是按功能领域分
- **拦截器归属**: 拦截器放到其功能相关的模块（HTTP 拦截器 → http 模块，日志拦截器 → logger 模块）

# 모듈 계층화 규범 (Module Layering Standard)

## 개요

본 규범은 `backend/src/common/modules/` 하위 모듈의 표준 계층 구조를 정의하여 코드의 높은 응집도, 낮은 결합도, 유지보수 및 확장 용이성을 보장합니다.

## 目录结构

```
module_name/
├── _01_contracts/                      # 계약 계층 - 인터페이스와 데이터 계약
│   ├── __init__.py
│   ├── i_{name}.py                     # 서비스 인터페이스
│   ├── r_{name}.py                     # Repository 인터페이스
│   ├── d_{name}.py                     # 데이터 계약
│   ├── e_{name}.py                     # 열거형 계약
│   ├── t_{name}.py                     # 타입 계약
│   ├── c_{name}.py                     # 상수 계약
│   ├── exc_{name}.py                   # 예외 계약
│   └── ...
│
├── _02_abstracts/                      # 추상 계층 - 추상 기본 클래스
│   ├── __init__.py
│   ├── abstract_{name}.py              # 각 추상 클래스마다 하나의 파일
│   └── ...
│
├── _03_impls/                          # 구현 계층 - 구체적 구현
│   ├── __init__.py
│   ├── impl_{name}.py                  # 구체적 구현 클래스
│   ├── factory_{name}.py               # 팩토리 클래스
│   ├── strategy_{name}.py              # 전략 클래스
│   └── ...
│
├── _04_services/                       # 서비스 계층 - 대외 통합 진입점
│   ├── __init__.py
│   └── service_{name}.py               # 서비스 진입점 클래스
│
├── _05_dtos/                           # DTO 계층 - 데이터 전송 객체
│   ├── __init__.py
│   ├── dto_{name}.py                   # Pydantic 요청/응답 모델
│   └── ...
│
├── _06_models/                         # 모델 계층 - 데이터베이스 모델
│   ├── __init__.py
│   ├── model_{name}.py                 # 데이터베이스 ORM 모델
│   ├── repo_{name}.py                  # Repository 구현
│   └── ...
│
├── _07_router/                         # 라우터 계층 - 라우터 엔드포인트
│   ├── __init__.py
│   ├── router_{name}.py                # 라우터 정의
│   └── deps_{name}.py                  # 의존성 주입
│
├── _08_utils/                          # 보조 계층 - 유틸리티 클래스
│   ├── __init__.py
│   ├── handler_{name}.py               # 핸들러
│   ├── helper_{name}.py                # 보조 함수
│   ├── code_{name}.py                  # 오류 코드/상태 코드
│   └── ...
│
└── __init__.py                         # 통합 내보내기
```

## 계층 설명

### _01_contracts - 계약 계층
- **책임**: 계층 간 공유되는 계약 정의 (인터페이스, 데이터 구조, 열거형, 타입, 상수)
- **의존성**: 의존성 없음, 최하위 계층

**✅ 포함 가능한 것:**
| 접두사 | 용도 | 파일 예시 | 클래스 명명 형식 |
|------|------|----------|------------|
| `i_` | 서비스 인터페이스 (ABC/Protocol) | `i_exception_recorder.py` | `I{Name}` |
| `r_` | Repository 인터페이스 (데이터 접근 추상화) | `r_exception.py` | `I{Name}Repository` |
| `d_` | 데이터 계약 (dataclass/Pydantic BaseModel) | `d_exception_context.py` | `D{Name}` |
| `e_` | 열거형 계약 (Enum) | `e_exception_level.py` | `E{Name}` |
| `t_` | 타입 계약 (TypeAlias/TypedDict/Generic) | `t_exception_handler.py` | `T{Name}` |
| `c_` | 상수 계약 | `c_exception_defaults.py` | `C{Name}` |
| `exc_` | 예외 계약 | `exc_validation.py` | `{Name}Error`, `{Name}Exception` |

**❌ 포함 금지:**
- 구체적인 구현 로직 (비즈니스 코드)
- 데이터베이스 ORM 모델
- 외부 서비스에 의존하는 코드
- 표준 라이브러리나 _01_contracts 내부가 아닌 모듈의 import

**설명**:
- 인터페이스 (`i_`): 서비스 동작을 정의, `_02_abstracts` 또는 `_03_impls`에서 구현
- Repository 인터페이스 (`r_`): 데이터 접근 추상화를 정의, `_06_models`에서 구현하여 의존성 역전 실현
- 데이터 계약 (`d_`): 계층 간 전달되는 데이터 구조 정의, dataclass 또는 Pydantic BaseModel 사용
- 열거형 계약 (`e_`): 계층 간 공유되는 열거값 정의
- 타입 계약 (`t_`): 복잡한 타입 시그니처, 콜백 함수 타입 등 정의
- 상수 계약 (`c_`): 계층 간 공유되는 상수, 기본값 정의
- 예외 계약 (`exc_`): 모듈에서 발생할 수 있는 예외 타입 정의

---

### _02_abstracts - 추상 계층
- **책임**: 추상 기본 클래스 (ABC), 공통 로직 템플릿 구현
- **의존성**: _01_contracts에만 의존

**✅ 포함 가능한 것:**
| 접두사 | 용도 | 파일 예시 | 클래스 명명 형식 |
|------|------|----------|------------|
| `abstract_` | 추상 기본 클래스 (ABC) | `abstract_classifier.py` | `Abstract{Name}` |

**❌ 포함 금지:**
- 직접 인스턴스화 가능한 구체 클래스
- 데이터 모델 정의
- 유틸리티 함수
- _03_impls 이상 계층에 의존하는 코드

**예시**: `abstract_classifier.py` → `AbstractExceptionClassifier`

---

### _03_impls - 구현 계층
- **책임**: 구체적 구현 클래스, 추상 클래스 상속 또는 인터페이스 구현
- **의존성**: _01_contracts, _02_abstracts에 의존 (Repository 인터페이스를 통해 데이터 접근, _06_models에 직접 의존하지 않음)

**✅ 포함 가능한 것:**
| 접두사 | 용도 | 파일 예시 | 클래스 명명 형식 |
|------|------|----------|------------|
| `impl_` | 구체적 구현 클래스 | `impl_classifier.py` | `{Name}` |
| `factory_` | 팩토리 클래스 | `factory_classifier.py` | `{Name}Factory` |
| `registry_` | 레지스트리 클래스 | `registry_handler.py` | `{Name}Registry` |
| `adapter_` | 어댑터 클래스 | `adapter_legacy.py` | `{Name}Adapter` |
| `strategy_` | 전략 클래스 | `strategy_retry.py` | `{Name}Strategy` |

**❌ 포함 금지:**
- 라우터/API 엔드포인트
- 순수 유틸리티 함수 (_08_utils에 배치)
- 데이터 모델 정의 (_05_dtos 또는 _06_models에 배치)
- _06_models에 직접 의존 (_01_contracts의 Repository 인터페이스를 통해야 함)
- _04_services 이상 계층에 의존하는 코드

**예시**: `impl_classifier.py` → `ExceptionClassifier`

---

### _04_services - 服务层
- **职责**: 对外统一入口，组合实现类，编排业务流程
- **依赖**: 依赖 _01_contracts, _03_impls, _05_data, _07_utils

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `service_` | 服务入口类 | `service_exception.py` | `{Module}Service` |

**❌ 禁止包含:**
- 路由/API 端点
- 底层实现细节
- 数据模型定义
- 工具函数

**示例**: `service_exception.py` → `ExceptionService`

---

### _05_dtos - DTO层
- **职责**: 数据传输对象，API 请求/响应模型
- **依赖**: 可依赖 _01_contracts

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `dto_` | Pydantic 请求/响应模型 | `dto_exception.py` | `{Name}Request`, `{Name}Response`, `{Name}DTO` |

**❌ 禁止包含:**
- 业务逻辑
- 服务类
- 工具函数
- 路由端点
- 数据库 ORM 模型
- 跨层共享的数据契约（应放 _01_contracts）

---

### _06_models - 模型层
- **职责**: 数据库 ORM 模型定义，实现 Repository 接口
- **依赖**: 依赖 _01_contracts (实现 Repository 接口)

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `model_` | 数据库 ORM 模型 | `model_exception.py` | `{Name}Model` |
| `repo_` | Repository 实现 | `repo_exception.py` | `{Name}Repository` |

**❌ 禁止包含:**
- 业务逻辑
- 服务类
- 工具函数
- 路由端点
- DTO/Schema 定义

---

### _07_router - 路由层
- **职责**: FastAPI 路由端点，HTTP 请求处理
- **依赖**: 依赖 _04_services, _05_data

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类/函数命名格式 |
|------|------|----------|-----------------|
| `router` | 路由定义 | `router.py` | `router` (APIRouter 实例) |
| `deps_` | 依赖注入 | `deps_auth.py` | `get_{name}` |

**❌ 禁止包含:**
- 业务逻辑（应放 _04_services）
- 数据库操作
- 复杂数据处理

---

### _08_utils - 辅助层
- **职责**: 通用工具类、辅助函数
- **依赖**: 可依赖 _01_contracts, _05_data

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类/函数命名格式 |
|------|------|----------|-----------------|
| `handler_` | 处理器 | `handler_exception.py` | `{Name}Handler` |
| `helper_` | 辅助函数 | `helper_format.py` | `{name}_helper` 或 `{Name}Helper` |
| `decorator_` | 装饰器 | `decorator_retry.py` | `{name}_decorator` (函数) |
| `validator_` | 验证器 | `validator_input.py` | `{Name}Validator` |
| `converter_` | 转换器 | `converter_datetime.py` | `{Name}Converter` |
| `parser_` | 解析器 | `parser_traceback.py` | `{Name}Parser` |
| `formatter_` | 格式化器 | `formatter_message.py` | `{Name}Formatter` |
| `code_` | 错误码/状态码 | `code_error.py` | `{Name}Code` |

**❌ 禁止包含:**
- 业务逻辑
- 服务类
- 数据模型
- 路由端点
- 工厂类、注册表（应放 _03_impls）
- 中间件（应放独立的 middleware 模块）

## 命名规范

### 目录命名
- 使用 `_{序号}_{层名}` 格式（下划线前缀避免 Python 导入问题）
- 序号两位数: `01`, `02`, `03`...
- 层名小写下划线: `contracts`, `abstracts`, `impls`

### 文件命名
- 使用 snake_case
- 契约层接口文件: `i_{name}.py`
- 契约层 Repository 接口: `r_{name}.py`
- 契约层数据文件: `d_{name}.py`
- 契约层枚举文件: `e_{name}.py`
- 契约层类型文件: `t_{name}.py`
- 契约层常量文件: `c_{name}.py`
- 契约层异常文件: `exc_{name}.py`
- 抽象类文件: `abstract_{name}.py`
- 实现类文件: `impl_{name}.py`
- 服务类文件: `service_{name}.py`
- DTO 文件: `dto_{name}.py`
- ORM 模型文件: `model_{name}.py`
- Repository 实现文件: `repo_{name}.py`
- 路由文件: `router_{name}.py`, `deps_{name}.py`
- 工具类文件: `handler_{name}.py`, `helper_{name}.py`, `validator_{name}.py` 等

### 类命名
- 使用 PascalCase
- 接口: `I{Name}` (如 `IExceptionClassifier`)
- 数据契约: `D{Name}` (如 `DExceptionContext`)
- 枚举契约: `E{Name}` (如 `EExceptionLevel`)
- 类型契约: `T{Name}` (如 `TExceptionHandler`)
- 常量契约: `C{Name}` (如 `CExceptionDefaults`)
- 抽象类: `Abstract{Name}` (如 `AbstractExceptionClassifier`)
- 实现类: `{Name}` (如 `ExceptionClassifier`)

## 依赖规则

```
                              ┌─────────────────────────────────────┐
                              │          _01_contracts              │
                              │  (接口 + Repository接口 + 数据契约)   │
                              └─────────────────────────────────────┘
                                             ↑
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────┴────────┐    ┌─────────┴─────────┐    ┌────────┴────────┐
           │  _02_abstracts  │    │    _05_dtos       │    │   _06_models    │
           │   (抽象基类)     │    │  (数据传输对象)    │    │ (ORM + Repo实现) │
           └────────┬────────┘    └─────────┬─────────┘    └────────┬────────┘
                    │                       │                        │
                    ↓                       │                        │
           ┌────────────────┐               │                        │
           │   _03_impls    │←──────────────┘                        │
           │  (业务实现)     │←───────────────────────────────────────┘
           └────────┬───────┘         (通过 Repository 接口注入)
                    │
                    ↓
           ┌────────────────┐
           │  _04_services  │←─── _08_utils
           │   (服务入口)    │
           └────────┬───────┘
                    │
                    ↓
           ┌────────────────┐
           │  _07_router    │←─── _05_dtos
           │   (路由端点)    │
           └────────────────┘
```

**依赖倒置原则 (DIP)**:
- `_03_impls` 不直接依赖 `_06_models`
- `_03_impls` 依赖 `_01_contracts` 中的 `I{Name}Repository` 接口
- `_06_models` 实现 `I{Name}Repository` 接口
- 运行时通过依赖注入将 Repository 实现注入到 `_03_impls`

**核心规则**:
- 上层只能依赖下层
- 同层之间不能相互依赖
- 禁止循环依赖
- 业务层通过接口访问数据层，不直接依赖 ORM

## __init__.py 导出规范

每层的 `__init__.py` 统一导出该层所有公开类：

```python
# _01_contracts/__init__.py
# 数据契约
from .d_exception_context import DExceptionContext
from .d_exception_record import DExceptionRecord
from .d_exception_stats import DExceptionStats

# 服务接口
from .i_exception import IException
from .i_exception_classifier import IExceptionClassifier
from .i_exception_recorder import IExceptionRecorder

__all__ = [
    # Data contracts
    "DExceptionContext",
    "DExceptionRecord",
    "DExceptionStats",
    # Interfaces
    "IException",
    "IExceptionClassifier",
    "IExceptionRecorder",
]
```

模块根目录 `__init__.py` 统一导出所有公开 API：

```python
# module_name/__init__.py
from ._01_contracts import IException, IExceptionClassifier
from ._02_abstracts import AbstractExceptionClassifier
from ._03_impls import ExceptionClassifier
from ._04_services import ExceptionService

__all__ = [
    # Interfaces
    "IException",
    "IExceptionClassifier",
    # Abstracts
    "AbstractExceptionClassifier",
    # Implementations
    "ExceptionClassifier",
    # Services
    "ExceptionService",
]
```

## 何时使用各层

每个模块必须包含全部 8 层：

| 层级 | 目录 | 必须 |
|------|------|------|
| 契约层 | _01_contracts | ✅ |
| 抽象层 | _02_abstracts | ✅ |
| 实现层 | _03_impls | ✅ |
| 服务层 | _04_services | ✅ |
| DTO层 | _05_dtos | ✅ |
| 模型层 | _06_models | ✅ |
| 路由层 | _07_router | ✅ |
| 辅助层 | _08_utils | ✅ |

## 示例：exception 模块

```
exception/
├── _01_contracts/
│   ├── __init__.py
│   ├── i_exception.py               # 异常服务接口
│   ├── i_exception_classifier.py    # 分类器接口
│   ├── i_exception_recorder.py      # 记录器接口
│   ├── r_exception.py               # Repository 接口 (IExceptionRepository)
│   ├── d_exception_context.py       # 上下文数据契约
│   ├── d_exception_record.py        # 记录数据契约
│   ├── e_exception_level.py         # 异常级别枚举
│   └── exc_exception.py             # 异常类定义
├── _02_abstracts/
│   ├── __init__.py
│   ├── abstract_classifier.py
│   └── abstract_recorder.py
├── _03_impls/
│   ├── __init__.py
│   ├── impl_classifier.py
│   └── impl_recorder.py
├── _04_services/
│   ├── __init__.py
│   └── service_exception.py
├── _05_dtos/
│   ├── __init__.py
│   └── dto_exception.py             # ExceptionRequest, ExceptionResponse
├── _06_models/
│   ├── __init__.py
│   ├── model_exception.py           # ExceptionModel (ORM)
│   └── repo_exception.py            # ExceptionRepository (实现 IExceptionRepository)
├── _07_router/
│   ├── __init__.py
│   ├── router_exception.py
│   └── deps_exception.py            # 依赖注入 (注入 Repository)
├── _08_utils/
│   ├── __init__.py
│   ├── handler_exception.py
│   ├── code_error.py
│   └── helper_format.py
└── __init__.py
```

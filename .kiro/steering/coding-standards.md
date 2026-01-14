# 编码规范

## 必须

### 前端导入

- `common/` → 无依赖，可被任何层导入
- `libs/` → 只导入 `common/`
- `modules/*/types/` → 只导入 `common/`
- `modules/*/services/` → 导入 `common/`, `libs/`, 同模块 `types/`
- `modules/*/hooks/` → 导入 `common/`, 同模块 `services/`, `types/`
- `modules/*/components/` → 导入 `common/`, `libs/`, 同模块 `types/`（禁止导入 hooks/services）
- `modules/*/views/` → 导入同模块 `hooks/`, `components/` + `common/` + `libs/`

### 导出

- `common/enum.ts` → 所有枚举和常量映射
- `common/helper.ts` → 所有工具函数
- `common/types.ts` → 所有类型定义（按模块分类）
- `common/stores.ts` → 所有全局状态（按模块分类）
- `common/components/` → 通用 UI 组件（无业务逻辑）
- `modules/*/components/` → 业务组件（可用同模块 hooks）

### 代码

- 数据从 API 获取
- 错误抛出异常，由 UI 层处理
- 使用 TypeScript 严格类型
- 函数/变量使用 camelCase，组件使用 PascalCase
- 文件名与默认导出一致
- 异步函数使用 async/await
- 条件渲染使用早返回
- 复杂逻辑抽取为自定义 hook
- 后端分页使用 `paginate()` 函数
- 前端 API 响应使用 `keysToCamel()` 转换 snake_case → camelCase
- 通用 UI 组件放 `common/components/`，业务组件放 `modules/*/components/`
- 优先用 `libs/shadcn/ui/` 基础组件

### 注释

- 只允许单行注释
- 解释 why，不解释 what
- 文件头部：模块用途说明
- TODO/FIXME：标注待处理事项

### services 层

- 只负责 API 调用和数据转换
- 从 `common/types` 导入类型

### hooks 层

- 只负责状态管理和业务逻辑
- 从 `common/types` 导入类型
- 返回类型由 TypeScript 自动推断
- Options 参数用内联类型或放 `common/types.ts`
- 提供表单默认值生成方法（如 `getModelForm`）

### components 层

- 负责 UI 渲染和样式
- 从 `common/types` 导入类型
- 可以写 `className` 样式
- 只通过 Props 接收数据（纯展示组件）
- 可直接使用 i18n（从 `@/common/i18n` 导入）

### views 层

- 只负责页面布局和组合组件
- 从 `common/types` 导入类型
- 调用 hook 方法生成表单初始数据，通过 Props 传给组件

### 后端导入

- `common/` → 无依赖，可被任何层导入
- `modules/*/dto.py` → 只导入 `pydantic`
- `modules/*/service.py` → 导入 `common/`
- `modules/*/router.py` → 导入 `common/`, 同模块 `dto`, `service`

### 后端导出

- `common/enum.py` → 所有枚举和常量
- `common/helper.py` → 所有工具函数
- `common/errors.py` → 所有错误类型
- `common/response.py` → 统一响应格式
- `common/auth.py` → 认证相关
- `common/supabase.py` → 数据库连接
- `common/document.py` → 文档存储

### 后端代码

- 使用 FastAPI 框架
- 使用 Pydantic 做数据验证
- 函数/变量使用 snake_case
- 类名使用 PascalCase
- 异步函数使用 async/await
- 分页使用 `paginate()` 函数
- 响应使用 `success_response()` 包装
- 错误抛出 `AppError` 异常

### router 层

- 只负责路由定义和参数解析
- 调用 service 处理业务逻辑
- 使用 `success_response()` 返回数据

### service 层

- 只负责业务逻辑
- 从 `common/` 导入工具
- 抛出 `AppError` 处理错误

### dto 层

- 只负责请求/响应数据结构定义
- 使用 Pydantic BaseModel

---

## 禁止

### 前端导入

- `common/components/` 导入 `services/` 或 `hooks/`
- `modules/admin/` 与 `modules/member/` 互相导入
- 跨模块导入非 `common/` 内容
- 循环依赖

### 导出

- 模块内分散导出枚举/常量
- 模块内分散导出工具函数
- 使用 `index.ts` 文件（直接导入具体文件）

### 代码

- 硬编码 fallback 数据
- 组件内定义常量（应放 `enum.ts`）
- 模块内定义工具函数（应放 `helper.ts`）
- 模块内定义 `interface`（应放 `common/types.ts`）
- 使用 TypeScript `enum` 关键字（用 `const` + `type` 模式）
- 使用 `any` 类型
- 魔法字符串/数字
- 在 service 层 catch 异常后静默处理
- console.log 调试代码提交
- 注释掉的代码提交
- 重复代码超过 3 行
- 函数超过 50 行
- 文件超过 300 行
- 嵌套超过 3 层
- 直接修改 props 或 state
- 在组件内直接调用 fetch/axios（应通过 hooks/service）
- 中英文混合命名

### 注释

- 多行注释块
- 函数内部注释
- 解释 what 的注释（代码本身应自解释）
- 过时注释
- 注释掉的代码

### services 层

- `interface` 定义
- `const` 常量定义
- 工具函数定义
- 导入 `hooks/` 或 `components/`

### hooks 层

- `interface` 定义
- `const` 常量定义
- 工具函数定义
- 导入 `components/` 或 `views/`

### components 层

- `interface` 定义（Props 类型除外）
- `const` 常量定义
- 工具函数定义（应放 `common/helper.ts`）
- 生成默认值（由 View 通过 Props 传入）
- 导入 `views/`
- 导入 `hooks/`（数据通过 Props 传入）
- 导入 `services/`

### views 层

- `interface` 定义（Props 类型除外）
- `const` 常量定义
- 工具函数定义
- `className` 样式代码
- 直接调用 `services/`（应通过 hooks）

### 后端导入

- `modules/admin/` 与 `modules/member/` 互相导入
- 跨模块导入非 `common/` 内容
- 循环依赖

### 后端代码

- 硬编码配置值（应放 `common/config.py`）
- 在 service 层 catch 异常后静默处理
- print 调试代码提交
- 注释掉的代码提交
- 函数超过 50 行
- 文件超过 500 行
- 嵌套超过 3 层
- 直接返回数据库原始数据（应转换格式）
- 在 router 层写业务逻辑

### router 层

- 业务逻辑代码
- 直接操作数据库
- 复杂数据处理

### service 层

- 直接返回 HTTP 响应
- 导入 `router`

### dto 层

- 业务逻辑代码
- 导入 `service` 或 `router`

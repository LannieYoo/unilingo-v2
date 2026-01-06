# 필드 형식 규범 (Field Format Standard)

## 개요

본 규범은 데이터베이스 필드와 API 필드의 형식 표준을 정의하여 데이터 일관성을 보장합니다.

---

## 일. 기본키와 연관 필드

### 기본키

```sql
-- 형식: id
-- 타입: BIGINT AUTO_INCREMENT 또는 스노우플레이크 알고리즘
id BIGINT AUTO_INCREMENT PRIMARY KEY

-- 예시
1234567890123456789
```

### 연관 필드 (논리적 외래키)

```sql
-- 형식: {연관테이블명단수}_id
-- 타입: BIGINT

user_id BIGINT           -- users 테이블 연관
order_id BIGINT          -- orders 테이블 연관
department_id BIGINT     -- departments 테이블 연관
parent_id BIGINT         -- 자기 연관 (트리 구조)
```

---

## 이. 시간 필드

### 명명 규범

```sql
-- 형식: {동작}_at
-- 타입: TIMESTAMP 또는 DATETIME

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- 생성 시간
updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP    -- 수정 시간
deleted_at TIMESTAMP NULL                           -- 삭제 시간 (소프트 삭제)
published_at TIMESTAMP NULL                         -- 발행 시간
expired_at TIMESTAMP NULL                           -- 만료 시간
started_at TIMESTAMP NULL                           -- 시작 시간
ended_at TIMESTAMP NULL                             -- 종료 시간
logged_in_at TIMESTAMP NULL                         -- 로그인 시간
verified_at TIMESTAMP NULL                          -- 검증 시간
```

### 저장 형식

```sql
-- 데이터베이스 저장: UTC 시간
-- API 반환: ISO 8601 형식

-- 예시
"2024-01-15T08:30:00Z"           -- UTC
"2024-01-15T16:30:00+08:00"      -- 시간대 포함
```

### 날짜 필드 (시간 없음)

```sql
-- 형식: {명칭}_date 또는 {명칭}_on
-- 타입: DATE

birth_date DATE                  -- 생년월일
due_date DATE                    -- 마감일
effective_date DATE              -- 효력 발생일
```

---

## 삼. 불린 필드

### 명명 규범

```sql
-- 형식: is_{상태} / has_{속성} / can_{능력}
-- 타입: TINYINT(1), 값은 0 또는 1

is_active TINYINT(1) DEFAULT 1       -- 활성화 여부
is_deleted TINYINT(1) DEFAULT 0      -- 삭제 여부
is_verified TINYINT(1) DEFAULT 0     -- 검증 여부
is_published TINYINT(1) DEFAULT 0    -- 발행 여부
is_default TINYINT(1) DEFAULT 0      -- 기본값 여부
is_locked TINYINT(1) DEFAULT 0       -- 잠금 여부

has_password TINYINT(1) DEFAULT 0    -- 비밀번호 보유 여부
has_avatar TINYINT(1) DEFAULT 0      -- 아바타 보유 여부

can_edit TINYINT(1) DEFAULT 1        -- 편집 가능 여부
can_delete TINYINT(1) DEFAULT 1      -- 삭제 가능 여부
```

---

## 四、状态与类型字段

### 状态字段

```sql
-- 格式：status 或 {名称}_status
-- 类型：TINYINT 或 VARCHAR(20)

status TINYINT DEFAULT 0             -- 通用状态
order_status TINYINT DEFAULT 0       -- 订单状态
payment_status TINYINT DEFAULT 0     -- 支付状态

-- 状态值定义（应用层枚举）
-- 0: pending    待处理
-- 1: processing 处理中
-- 2: completed  已完成
-- 3: cancelled  已取消
-- 4: failed     失败
```

### 类型字段

```sql
-- 格式：type 或 {名称}_type
-- 类型：TINYINT 或 VARCHAR(20)

type TINYINT                         -- 通用类型
user_type TINYINT                    -- 用户类型
notification_type VARCHAR(20)        -- 通知类型

-- 类型值定义（应用层枚举）
-- 1: admin      管理员
-- 2: user       普通用户
-- 3: guest      访客
```

---

## 五、数值字段

### 金额字段

```sql
-- 格式：{名称}_amount 或 price / cost / fee
-- 类型：DECIMAL(19,4)
-- 单位：最小货币单位（分）或标准单位（元）

price DECIMAL(19,4)                  -- 价格
total_amount DECIMAL(19,4)           -- 总金额
discount_amount DECIMAL(19,4)        -- 折扣金额
shipping_fee DECIMAL(19,4)           -- 运费
tax_amount DECIMAL(19,4)             -- 税额

-- 存储建议：以分为单位存储整数，避免浮点精度问题
-- price_cents INT                   -- 价格（分）
```

### 数量字段

```sql
-- 格式：{名称}_count 或 quantity / num
-- 类型：INT 或 BIGINT

quantity INT DEFAULT 0               -- 数量
stock_count INT DEFAULT 0            -- 库存数量
view_count BIGINT DEFAULT 0          -- 浏览次数
like_count INT DEFAULT 0             -- 点赞数
comment_count INT DEFAULT 0          -- 评论数
```

### 百分比字段

```sql
-- 格式：{名称}_rate 或 {名称}_percent
-- 类型：DECIMAL(5,2)
-- 范围：0.00 - 100.00

discount_rate DECIMAL(5,2)           -- 折扣率
tax_rate DECIMAL(5,2)                -- 税率
progress_percent DECIMAL(5,2)        -- 进度百分比
```

### 排序字段

```sql
-- 格式：sort_order 或 {名称}_order
-- 类型：INT
-- 规则：数值越小越靠前

sort_order INT DEFAULT 0             -- 排序顺序
display_order INT DEFAULT 0          -- 显示顺序
```

---

## 六、文本字段

### 名称字段

```sql
-- 格式：name 或 {类型}_name
-- 类型：VARCHAR(n)

name VARCHAR(100)                    -- 名称
display_name VARCHAR(100)            -- 显示名称
first_name VARCHAR(50)               -- 名
last_name VARCHAR(50)                -- 姓
nick_name VARCHAR(50)                -- 昵称
```

### 标题与描述

```sql
-- 标题
title VARCHAR(200)                   -- 标题

-- 描述
description TEXT                     -- 描述
summary VARCHAR(500)                 -- 摘要
content TEXT                         -- 内容
remark VARCHAR(500)                  -- 备注
```

### 编码字段

```sql
-- 格式：{名称}_code 或 {名称}_no
-- 类型：VARCHAR(n)

code VARCHAR(50)                     -- 编码
order_no VARCHAR(32)                 -- 订单号
serial_no VARCHAR(50)                -- 序列号
tracking_no VARCHAR(50)              -- 物流单号
```

---

## 七、联系方式字段

### 电话

```sql
-- 格式：phone / mobile / tel
-- 类型：VARCHAR(20)
-- 存储：纯数字，不含分隔符

phone VARCHAR(20)                    -- 电话
mobile VARCHAR(20)                   -- 手机
tel VARCHAR(20)                      -- 座机

-- 示例
"13812345678"                        -- 手机
"02112345678"                        -- 座机
"+8613812345678"                     -- 国际格式
```

### 邮箱

```sql
-- 格式：email
-- 类型：VARCHAR(100)
-- 验证：RFC 5322 标准

email VARCHAR(100)

-- 示例
"user@example.com"
```

### 地址

```sql
-- 拆分存储
country VARCHAR(50)                  -- 国家
province VARCHAR(50)                 -- 省份
city VARCHAR(50)                     -- 城市
district VARCHAR(50)                 -- 区县
address VARCHAR(200)                 -- 详细地址
postal_code VARCHAR(20)              -- 邮编

-- 或完整地址
full_address VARCHAR(500)            -- 完整地址
```

---

## 八、URL 与路径字段

### URL

```sql
-- 格式：{名称}_url
-- 类型：VARCHAR(500) 或 TEXT

url VARCHAR(500)                     -- 链接
avatar_url VARCHAR(500)              -- 头像链接
cover_url VARCHAR(500)               -- 封面链接
website_url VARCHAR(500)             -- 网站链接
callback_url VARCHAR(500)            -- 回调链接
```

### 文件路径

```sql
-- 格式：{名称}_path
-- 类型：VARCHAR(500)

file_path VARCHAR(500)               -- 文件路径
image_path VARCHAR(500)              -- 图片路径
```

---

## 九、JSON 字段

```sql
-- 格式：{名称} 或 {名称}_json / {名称}_data
-- 类型：JSON

settings JSON                        -- 设置
metadata JSON                        -- 元数据
extra_data JSON                      -- 扩展数据
attributes JSON                      -- 属性

-- 示例
{
    "theme": "dark",
    "language": "zh-CN",
    "notifications": {
        "email": true,
        "sms": false
    }
}
```

---

## 十、审计字段

### 标准审计字段（每张表必须）

```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
created_by BIGINT                    -- 创建人 ID
updated_by BIGINT                    -- 更新人 ID
```

### 软删除字段

```sql
is_deleted TINYINT(1) DEFAULT 0
deleted_at TIMESTAMP NULL
deleted_by BIGINT NULL               -- 删除人 ID
```

### 版本控制

```sql
version INT DEFAULT 1                -- 乐观锁版本号
```

---

## 十一、字段长度参考

| 字段类型 | 推荐长度 | 说明 |
|---------|---------|------|
| 用户名 | VARCHAR(50) | |
| 昵称 | VARCHAR(50) | |
| 邮箱 | VARCHAR(100) | |
| 手机号 | VARCHAR(20) | 含国际区号 |
| 密码哈希 | VARCHAR(255) | bcrypt 等 |
| 标题 | VARCHAR(200) | |
| 摘要 | VARCHAR(500) | |
| URL | VARCHAR(500) | |
| 编码 | VARCHAR(50) | |
| IP 地址 | VARCHAR(45) | IPv6 最长 |
| UUID | CHAR(36) | |
| 国家/省市 | VARCHAR(50) | |
| 详细地址 | VARCHAR(200) | |

---

## 십이. 명명 체크리스트

- [ ] 기본키가 `id`인가요?
- [ ] 연관 필드가 `{테이블명}_id`인가요?
- [ ] 시간 필드가 `_at`로 끝나나요?
- [ ] 날짜 필드가 `_date`로 끝나나요?
- [ ] 불린 필드가 `is_/has_/can_`으로 시작하나요?
- [ ] 금액 필드가 DECIMAL을 사용하나요?
- [ ] 상태 필드가 `status` 또는 `{명칭}_status`인가요?
- [ ] URL 필드가 `_url`로 끝나나요?
- [ ] 감사 필드(created_at, updated_at)가 있나요?

# 소프트웨어 설계 원칙 (Software Design Principles)

## 개요

본 규범은 프로젝트 개발에서 반드시 준수해야 하는 7대 설계 원칙을 정의합니다: SOLID (5개) + DRY + KISS.

---

## SOLID 원칙

### S - 단일 책임 원칙 (Single Responsibility Principle)

**정의**: 하나의 클래스/모듈은 변경되는 이유가 단 하나여야 합니다.

**✅ 올바른 방법:**
```python
# 각 클래스는 한 가지 일만 담당
class UserValidator:
    """사용자 데이터 검증만 담당"""
    def validate_email(self, email: str) -> bool: ...
    def validate_password(self, password: str) -> bool: ...

class UserRepository:
    """사용자 데이터 영속화만 담당"""
    def save(self, user: User) -> None: ...
    def find_by_id(self, id: int) -> User: ...

class UserService:
    """사용자 비즈니스 로직 조합만 담당"""
    def __init__(self, validator: UserValidator, repo: UserRepository): ...
    def register(self, data: dict) -> User: ...
```

**❌ 잘못된 방법:**
```python
# 하나의 클래스가 너무 많은 일을 담당
class UserManager:
    def validate_email(self, email: str) -> bool: ...
    def save_to_database(self, user: User) -> None: ...
    def send_welcome_email(self, user: User) -> None: ...
    def generate_report(self) -> str: ...
```

**체크리스트:**
- [ ] 이 클래스/모듈의 책임을 한 문장으로 설명할 수 있나요?
- [ ] 이 클래스를 수정하는 이유가 단 하나인가요?
- [ ] 클래스명이 유일한 책임을 정확히 반영하고 있나요?

---

### O - 개방-폐쇄 원칙 (Open/Closed Principle)

**정의**: 소프트웨어 엔티티는 확장에는 열려있고, 수정에는 닫혀있어야 합니다.

**✅ 올바른 방법:**
```python
# 인터페이스를 통한 확장, 기존 코드 수정 없음
from abc import ABC, abstractmethod

class PaymentProcessor(ABC):
    @abstractmethod
    def process(self, amount: float) -> bool: ...

class CreditCardProcessor(PaymentProcessor):
    def process(self, amount: float) -> bool:
        # 신용카드 결제 로직
        ...

class AlipayProcessor(PaymentProcessor):
    def process(self, amount: float) -> bool:
        # 알리페이 결제 로직 (신규 추가, 기존 코드 수정 불필요)
        ...

# 사용 시 인터페이스를 통해
def checkout(processor: PaymentProcessor, amount: float):
    return processor.process(amount)
```

**❌ 잘못된 방법:**
```python
# 새로운 결제 방식을 추가할 때마다 이 함수를 수정해야 함
def process_payment(payment_type: str, amount: float) -> bool:
    if payment_type == "credit_card":
        # 신용카드 로직
        ...
    elif payment_type == "alipay":
        # 알리페이 로직
        ...
    elif payment_type == "wechat":  # 신규 추가 시 반드시 수정
        ...
```

**체크리스트:**
- [ ] 새로운 기능 추가 시 기존 코드를 수정해야 하나요?
- [ ] 확장 지점을 정의하기 위해 인터페이스/추상 클래스를 사용했나요?
- [ ] 전략 패턴, 팩토리 패턴 등의 디자인 패턴을 사용했나요?

---

### L - 리스코프 치환 원칙 (Liskov Substitution Principle)

**정의**: 서브클래스는 반드시 부모클래스를 대체할 수 있어야 하며, 프로그램 동작이 변하지 않아야 합니다.

**✅ 올바른 방법:**
```python
class Bird(ABC):
    @abstractmethod
    def move(self) -> None: ...

class Sparrow(Bird):
    def move(self) -> None:
        print("Flying")

class Penguin(Bird):
    def move(self) -> None:
        print("Swimming")  # 펭귄은 날지 못하지만 이동할 수 있음

# 어떤 Bird 서브클래스든 대체 가능
def let_bird_move(bird: Bird):
    bird.move()  # 어떤 새를 전달하든 정상 작동
```

**❌ 잘못된 방법:**
```python
class Bird:
    def fly(self) -> None:
        print("Flying")

class Penguin(Bird):
    def fly(self) -> None:
        raise Exception("Penguins can't fly!")  # LSP 위반
```

**체크리스트:**
- [ ] 서브클래스가 부모클래스의 모든 메서드를 완전히 구현했나요?
- [ ] 서브클래스의 메서드가 부모클래스에서 선언하지 않은 예외를 던지나요?
- [ ] 서브클래스로 부모클래스를 대체한 후에도 프로그램이 정상 작동하나요?

---

### I - 인터페이스 분리 원칙 (Interface Segregation Principle)

**정의**: 클라이언트는 사용하지 않는 인터페이스에 의존하도록 강요받아서는 안 됩니다.

**✅ 올바른 방법:**
```python
# 작은 인터페이스로 분리
class Readable(ABC):
    @abstractmethod
    def read(self) -> str: ...

class Writable(ABC):
    @abstractmethod
    def write(self, data: str) -> None: ...

class Deletable(ABC):
    @abstractmethod
    def delete(self) -> None: ...

# 필요한 인터페이스만 구현
class ReadOnlyFile(Readable):
    def read(self) -> str: ...

class FullAccessFile(Readable, Writable, Deletable):
    def read(self) -> str: ...
    def write(self, data: str) -> None: ...
    def delete(self) -> None: ...
```

**❌ 잘못된 방법:**
```python
# 모든 메서드를 포함하는 큰 인터페이스
class FileOperations(ABC):
    @abstractmethod
    def read(self) -> str: ...
    @abstractmethod
    def write(self, data: str) -> None: ...
    @abstractmethod
    def delete(self) -> None: ...
    @abstractmethod
    def compress(self) -> None: ...
    @abstractmethod
    def encrypt(self) -> None: ...

# 읽기 전용 파일이 불필요한 메서드를 구현하도록 강요받음
class ReadOnlyFile(FileOperations):
    def read(self) -> str: ...
    def write(self, data: str) -> None:
        raise NotImplementedError()  # 강제로 구현
    def delete(self) -> None:
        raise NotImplementedError()  # 강제로 구현
    ...
```

**체크리스트:**
- [ ] 인터페이스가 충분히 작고 집중되어 있나요?
- [ ] 구현 클래스가 모든 인터페이스 메서드를 구현해야 하나요?
- [ ] 분리가 필요한 "뚱뚱한 인터페이스"가 있나요?

---

### D - 의존성 역전 원칙 (Dependency Inversion Principle)

**정의**: 고수준 모듈은 저수준 모듈에 의존해서는 안 되며, 둘 다 추상화에 의존해야 합니다.

**✅ 올바른 방법:**
```python
# 추상 인터페이스 정의
class IUserRepository(ABC):
    @abstractmethod
    def save(self, user: User) -> None: ...
    @abstractmethod
    def find_by_id(self, id: int) -> User: ...

# 고수준 모듈이 추상화에 의존
class UserService:
    def __init__(self, repo: IUserRepository):  # 인터페이스에 의존
        self._repo = repo
    
    def register(self, data: dict) -> User:
        user = User(**data)
        self._repo.save(user)
        return user

# 저수준 모듈이 추상화를 구현
class MySQLUserRepository(IUserRepository):
    def save(self, user: User) -> None: ...
    def find_by_id(self, id: int) -> User: ...

# 의존성 주입
repo = MySQLUserRepository()
service = UserService(repo)  # 구체적인 구현 주입
```

**❌ 잘못된 방법:**
```python
# 고수준이 저수준 구체 구현에 직접 의존
class UserService:
    def __init__(self):
        self._repo = MySQLUserRepository()  # 구체 클래스에 직접 의존
    
    def register(self, data: dict) -> User:
        ...
```

**체크리스트:**
- [ ] 고수준 모듈이 구체 구현이 아닌 인터페이스에 의존하나요?
- [ ] 의존성 주입을 사용하고 있나요?
- [ ] 저수준 구현을 교체할 때 고수준 코드를 수정해야 하나요?

---

## DRY 원칙 (Don't Repeat Yourself)

**정의**: 시스템에서 모든 지식은 단일하고 명확하며 권위 있는 표현을 가져야 합니다.

**✅ 올바른 방법:**
```python
# 중앙 집중 정의, 재사용
class ValidationRules:
    EMAIL_PATTERN = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    PASSWORD_MIN_LENGTH = 8
    
    @staticmethod
    def validate_email(email: str) -> bool:
        return bool(re.match(ValidationRules.EMAIL_PATTERN, email))

# 각처에서 재사용
class UserValidator:
    def validate(self, user: User) -> bool:
        return ValidationRules.validate_email(user.email)

class AdminValidator:
    def validate(self, admin: Admin) -> bool:
        return ValidationRules.validate_email(admin.email)
```

**❌ 잘못된 방법:**
```python
# 중복 코드가 여기저기 흩어져 있음
class UserValidator:
    def validate_email(self, email: str) -> bool:
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'  # 중복
        return bool(re.match(pattern, email))

class AdminValidator:
    def validate_email(self, email: str) -> bool:
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'  # 중복
        return bool(re.match(pattern, email))
```

**체크리스트:**
- [ ] 복사-붙여넣기한 코드가 있나요?
- [ ] 하나의 로직을 수정할 때 여러 곳을 바꿔야 하나요?
- [ ] 상수, 설정이 중앙 집중 관리되고 있나요?

---

## KISS 원칙 (Keep It Simple, Stupid)

**정의**: 단순하게 유지하고, 불필요한 복잡성을 피하세요.

**✅ 올바른 방법:**
```python
# 단순하고 직접적
def is_adult(age: int) -> bool:
    return age >= 18

# 내장 함수 사용
def get_max_value(numbers: list[int]) -> int:
    return max(numbers)

# 명확한 조건 판단
def get_discount(user: User) -> float:
    if user.is_vip:
        return 0.2
    if user.orders_count > 10:
        return 0.1
    return 0.0
```

**❌ 잘못된 방법:**
```python
# 과도한 설계
class AgeCheckerFactory:
    def create_checker(self, country: str) -> AgeChecker:
        ...

class AgeChecker(ABC):
    @abstractmethod
    def check(self, age: int) -> bool: ...

class AdultAgeChecker(AgeChecker):
    def __init__(self, threshold: int = 18):
        self._threshold = threshold
    
    def check(self, age: int) -> bool:
        return age >= self._threshold

# 단순히 성인 여부를 판단하는 것인데 이렇게 복잡할 필요 없음

# 디자인 패턴의 과도한 사용
def get_max_value(numbers: list[int]) -> int:
    strategy = MaxValueStrategy()
    context = CalculationContext(strategy)
    return context.execute(numbers)
```

**체크리스트:**
- [ ] 이 설계가 문제를 해결하는 가장 단순한 방법인가요?
- [ ] 디자인 패턴을 과도하게 사용하고 있나요?
- [ ] 신입 개발자가 이 코드를 빠르게 이해할 수 있나요?
- [ ] "미래의 가능한 요구사항"을 위해 과도하게 설계하고 있나요?

---

## 원칙 우선순위

원칙이 충돌할 때는 다음 우선순위에 따라 균형을 맞추세요:

1. **KISS** - 먼저 단순하게 유지
2. **SRP** - 책임의 단일성 확보
3. **DRY** - 중복 제거
4. **OCP/DIP** - 확장성 고려
5. **LSP/ISP** - 인터페이스 설계 최적화

**기억하세요**: 원칙은 지침이지 교조가 아닙니다. 실제 상황에 따라 유연하게 적용하세요.

---

## 코드 리뷰 체크포인트

코드 리뷰 시 다음 사항들을 확인하세요:

| 원칙 | 확인 질문 |
|------|---------|
| SRP | 이 클래스/함수가 한 가지 일만 하고 있나요? |
| OCP | 새로운 기능 추가 시 기존 코드를 수정해야 하나요? |
| LSP | 서브클래스가 부모클래스를 안전하게 대체할 수 있나요? |
| ISP | 인터페이스가 충분히 작고 집중되어 있나요? |
| DIP | 구체 구현이 아닌 추상화에 의존하고 있나요? |
| DRY | 중복 코드가 있나요? |
| KISS | 과도하게 설계되어 있나요? |

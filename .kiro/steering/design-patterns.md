# 디자인 패턴 (Design Patterns)

## 개요

GoF 23가지 디자인 패턴은 세 가지 대분류로 나뉩니다: 생성형, 구조형, 행동형.

---

## 일. 생성형 패턴 (Creational Patterns)

> 객체의 생성 메커니즘에 집중하여 객체 생성과 사용을 분리합니다.

### 1. 싱글톤 패턴 (Singleton)

**의도**: 클래스가 하나의 인스턴스만 가지도록 보장하고 전역 접근점을 제공합니다.

**적용 시나리오**: 설정 관리, 로그 기록, 데이터베이스 연결 풀

```python
class DatabaseConnection:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

---

### 2. 팩토리 메서드 패턴 (Factory Method)

**의도**: 객체를 생성하는 인터페이스를 정의하고, 서브클래스가 어떤 클래스를 인스턴스화할지 결정하도록 합니다.

**적용 시나리오**: 조건에 따라 다른 타입의 객체를 생성해야 할 때

```python
class NotificationFactory(ABC):
    @abstractmethod
    def create(self) -> Notification: ...

class EmailNotificationFactory(NotificationFactory):
    def create(self) -> Notification:
        return EmailNotification()

class SMSNotificationFactory(NotificationFactory):
    def create(self) -> Notification:
        return SMSNotification()
```

---

### 3. 추상 팩토리 패턴 (Abstract Factory)

**의도**: 구체적인 클래스를 지정하지 않고 일련의 관련 객체를 생성합니다.

**적용 시나리오**: 제품군 생성 (예: UI 컴포넌트 세트)

```python
class UIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...
    @abstractmethod
    def create_input(self) -> Input: ...

class DarkThemeFactory(UIFactory):
    def create_button(self) -> Button:
        return DarkButton()
    def create_input(self) -> Input:
        return DarkInput()
```

---

### 4. 빌더 패턴 (Builder)

**의도**: 복잡한 객체를 단계별로 구축하며, 동일한 구축 과정으로 다른 표현을 만들 수 있습니다.

**적용 시나리오**: 복잡한 객체 구축 (예: HTTP 요청, 쿼리 문)

```python
class QueryBuilder:
    def __init__(self):
        self._query = Query()
    
    def select(self, *fields) -> "QueryBuilder":
        self._query.fields = fields
        return self
    
    def where(self, condition: str) -> "QueryBuilder":
        self._query.conditions.append(condition)
        return self
    
    def build(self) -> Query:
        return self._query

# 사용
query = QueryBuilder().select("id", "name").where("age > 18").build()
```

---

### 5. 프로토타입 패턴 (Prototype)

**의도**: 기존 객체를 복사하여 새로운 객체를 생성합니다.

**적용 시나리오**: 생성 비용이 높은 객체, 객체 상태 보존이 필요한 경우

```python
import copy

class Document:
    def clone(self) -> "Document":
        return copy.deepcopy(self)

# 사용
template = Document(title="Template", content="...")
new_doc = template.clone()
new_doc.title = "New Document"
```

---

## 이. 구조형 패턴 (Structural Patterns)

> 클래스와 객체의 조합에 집중하여 더 큰 구조를 형성합니다.

### 6. 어댑터 패턴 (Adapter)

**의도**: 한 클래스의 인터페이스를 클라이언트가 기대하는 다른 인터페이스로 변환합니다.

**적용 시나리오**: 서드파티 라이브러리 통합, 레거시 시스템 호환

```python
# 기존 인터페이스
class LegacyPayment:
    def make_payment(self, amount: float) -> dict:
        return {"status": "ok", "amount": amount}

# 새로운 인터페이스
class PaymentProcessor(ABC):
    @abstractmethod
    def process(self, amount: float) -> bool: ...

# 어댑터
class LegacyPaymentAdapter(PaymentProcessor):
    def __init__(self, legacy: LegacyPayment):
        self._legacy = legacy
    
    def process(self, amount: float) -> bool:
        result = self._legacy.make_payment(amount)
        return result["status"] == "ok"
```

---

### 7. 브리지 패턴 (Bridge)

**의도**: 추상화와 구현을 분리하여 독립적으로 변화할 수 있게 합니다.

**적용 시나리오**: 다차원 변화가 있는 시스템 (예: 크로스 플랫폼 + 다중 테마)

```python
# 实现层
class Renderer(ABC):
    @abstractmethod
    def render(self, content: str) -> str: ...

class HTMLRenderer(Renderer):
    def render(self, content: str) -> str:
        return f"<div>{content}</div>"

# 抽象层
class Page(ABC):
    def __init__(self, renderer: Renderer):
        self._renderer = renderer
    
    @abstractmethod
    def display(self) -> str: ...

class HomePage(Page):
    def display(self) -> str:
        return self._renderer.render("Welcome!")
```

---

### 8. 组合模式 (Composite)

**意图**: 将对象组合成树形结构，使单个对象和组合对象使用一致。

**适用场景**: 文件系统、组织架构、菜单树

```python
class Component(ABC):
    @abstractmethod
    def get_size(self) -> int: ...

class File(Component):
    def __init__(self, size: int):
        self._size = size
    
    def get_size(self) -> int:
        return self._size

class Folder(Component):
    def __init__(self):
        self._children: list[Component] = []
    
    def add(self, component: Component) -> None:
        self._children.append(component)
    
    def get_size(self) -> int:
        return sum(child.get_size() for child in self._children)
```

---

### 9. 装饰器模式 (Decorator)

**意图**: 动态地给对象添加额外职责。

**适用场景**: 日志、缓存、权限检查

```python
class DataSource(ABC):
    @abstractmethod
    def read(self) -> str: ...
    @abstractmethod
    def write(self, data: str) -> None: ...

class FileDataSource(DataSource):
    def read(self) -> str: ...
    def write(self, data: str) -> None: ...

class EncryptionDecorator(DataSource):
    def __init__(self, source: DataSource):
        self._source = source
    
    def read(self) -> str:
        return self._decrypt(self._source.read())
    
    def write(self, data: str) -> None:
        self._source.write(self._encrypt(data))

# Python 函数装饰器
def log_calls(func):
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper
```

---

### 10. 外观模式 (Facade)

**意图**: 为子系统提供统一的高层接口。

**适用场景**: 简化复杂系统、提供统一 API

```python
class VideoConverter:
    """外观类，隐藏复杂子系统"""
    def convert(self, filename: str, format: str) -> str:
        file = VideoFile(filename)
        codec = CodecFactory.extract(file)
        result = BitrateReader.read(filename, codec)
        result = AudioMixer.fix(result)
        return Encoder.encode(result, format)

# 使用：简单调用
converter = VideoConverter()
mp4 = converter.convert("video.ogg", "mp4")
```

---

### 11. 享元模式 (Flyweight)

**意图**: 共享细粒度对象，减少内存使用。

**适用场景**: 大量相似对象（如字符、图标、粒子）

```python
class TreeType:
    """享元对象，存储共享状态"""
    def __init__(self, name: str, color: str, texture: str):
        self.name = name
        self.color = color
        self.texture = texture

class TreeFactory:
    _types: dict[str, TreeType] = {}
    
    @classmethod
    def get_tree_type(cls, name: str, color: str, texture: str) -> TreeType:
        key = f"{name}_{color}_{texture}"
        if key not in cls._types:
            cls._types[key] = TreeType(name, color, texture)
        return cls._types[key]

class Tree:
    """包含外部状态"""
    def __init__(self, x: int, y: int, tree_type: TreeType):
        self.x = x
        self.y = y
        self.type = tree_type
```

---

### 12. 代理模式 (Proxy)

**意图**: 为对象提供代理，控制对原对象的访问。

**适用场景**: 延迟加载、访问控制、日志记录

```python
class Database(ABC):
    @abstractmethod
    def query(self, sql: str) -> list: ...

class RealDatabase(Database):
    def query(self, sql: str) -> list:
        # 实际数据库查询
        ...

class DatabaseProxy(Database):
    def __init__(self, db: RealDatabase, user: User):
        self._db = db
        self._user = user
    
    def query(self, sql: str) -> list:
        if not self._user.has_permission("query"):
            raise PermissionError("No query permission")
        print(f"Logging: {self._user.name} executed {sql}")
        return self._db.query(sql)
```

---

## 三、行为型模式 (Behavioral Patterns)

> 关注对象之间的通信和职责分配。

### 13. 责任链模式 (Chain of Responsibility)

**意图**: 将请求沿处理链传递，直到有对象处理它。

**适用场景**: 审批流程、中间件、过滤器

```python
class Handler(ABC):
    def __init__(self):
        self._next: Handler | None = None
    
    def set_next(self, handler: "Handler") -> "Handler":
        self._next = handler
        return handler
    
    def handle(self, request: Request) -> Response | None:
        if self._next:
            return self._next.handle(request)
        return None

class AuthHandler(Handler):
    def handle(self, request: Request) -> Response | None:
        if not request.is_authenticated:
            return Response(401, "Unauthorized")
        return super().handle(request)

class RateLimitHandler(Handler):
    def handle(self, request: Request) -> Response | None:
        if self._is_rate_limited(request):
            return Response(429, "Too Many Requests")
        return super().handle(request)

# 构建链
auth = AuthHandler()
rate_limit = RateLimitHandler()
auth.set_next(rate_limit)
```

---

### 14. 命令模式 (Command)

**意图**: 将请求封装为对象，支持撤销、队列、日志。

**适用场景**: 撤销/重做、任务队列、宏命令

```python
class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...
    @abstractmethod
    def undo(self) -> None: ...

class InsertTextCommand(Command):
    def __init__(self, editor: Editor, text: str):
        self._editor = editor
        self._text = text
    
    def execute(self) -> None:
        self._editor.insert(self._text)
    
    def undo(self) -> None:
        self._editor.delete(len(self._text))

class CommandHistory:
    def __init__(self):
        self._history: list[Command] = []
    
    def execute(self, cmd: Command) -> None:
        cmd.execute()
        self._history.append(cmd)
    
    def undo(self) -> None:
        if self._history:
            self._history.pop().undo()
```

---

### 15. 解释器模式 (Interpreter)

**意图**: 定义语言的文法，并解释执行。

**适用场景**: DSL、规则引擎、表达式解析

```python
class Expression(ABC):
    @abstractmethod
    def interpret(self, context: dict) -> int: ...

class Number(Expression):
    def __init__(self, value: int):
        self._value = value
    
    def interpret(self, context: dict) -> int:
        return self._value

class Add(Expression):
    def __init__(self, left: Expression, right: Expression):
        self._left = left
        self._right = right
    
    def interpret(self, context: dict) -> int:
        return self._left.interpret(context) + self._right.interpret(context)

# 使用: 1 + 2
expr = Add(Number(1), Number(2))
result = expr.interpret({})  # 3
```

---

### 16. 迭代器模式 (Iterator)

**意图**: 顺序访问集合元素，不暴露内部结构。

**适用场景**: 遍历复杂数据结构

```python
class Iterator(ABC):
    @abstractmethod
    def has_next(self) -> bool: ...
    @abstractmethod
    def next(self) -> Any: ...

class TreeIterator(Iterator):
    def __init__(self, root: TreeNode):
        self._stack = [root] if root else []
    
    def has_next(self) -> bool:
        return len(self._stack) > 0
    
    def next(self) -> TreeNode:
        node = self._stack.pop()
        if node.right:
            self._stack.append(node.right)
        if node.left:
            self._stack.append(node.left)
        return node

# Python 内置支持
class Tree:
    def __iter__(self):
        return TreeIterator(self._root)
```

---

### 17. 中介者模式 (Mediator)

**意图**: 用中介对象封装对象间的交互。

**适用场景**: 聊天室、表单组件联动、飞机调度

```python
class Mediator(ABC):
    @abstractmethod
    def notify(self, sender: "Component", event: str) -> None: ...

class DialogMediator(Mediator):
    def __init__(self):
        self.title_input: Input = None
        self.ok_button: Button = None
    
    def notify(self, sender: "Component", event: str) -> None:
        if sender == self.title_input and event == "change":
            self.ok_button.enabled = len(self.title_input.value) > 0

class Component:
    def __init__(self, mediator: Mediator):
        self._mediator = mediator

class Input(Component):
    def on_change(self) -> None:
        self._mediator.notify(self, "change")
```

---

### 18. 备忘录模式 (Memento)

**意图**: 捕获对象内部状态，以便稍后恢复。

**适用场景**: 撤销功能、游戏存档、事务回滚

```python
class EditorMemento:
    def __init__(self, content: str, cursor: int):
        self._content = content
        self._cursor = cursor
    
    def get_state(self) -> tuple[str, int]:
        return self._content, self._cursor

class Editor:
    def __init__(self):
        self._content = ""
        self._cursor = 0
    
    def save(self) -> EditorMemento:
        return EditorMemento(self._content, self._cursor)
    
    def restore(self, memento: EditorMemento) -> None:
        self._content, self._cursor = memento.get_state()

class History:
    def __init__(self):
        self._snapshots: list[EditorMemento] = []
    
    def push(self, memento: EditorMemento) -> None:
        self._snapshots.append(memento)
    
    def pop(self) -> EditorMemento | None:
        return self._snapshots.pop() if self._snapshots else None
```

---

### 19. 观察者模式 (Observer)

**意图**: 定义对象间一对多依赖，状态变化时自动通知。

**适用场景**: 事件系统、数据绑定、消息订阅

```python
class Subject:
    def __init__(self):
        self._observers: list[Observer] = []
    
    def attach(self, observer: "Observer") -> None:
        self._observers.append(observer)
    
    def detach(self, observer: "Observer") -> None:
        self._observers.remove(observer)
    
    def notify(self, event: str) -> None:
        for observer in self._observers:
            observer.update(event)

class Observer(ABC):
    @abstractmethod
    def update(self, event: str) -> None: ...

class EmailNotifier(Observer):
    def update(self, event: str) -> None:
        print(f"Sending email: {event}")

# 使用
store = Subject()
store.attach(EmailNotifier())
store.notify("Order placed")
```

---

### 20. 状态模式 (State)

**意图**: 允许对象在内部状态改变时改变行为。

**适用场景**: 订单状态、工作流、游戏角色状态

```python
class OrderState(ABC):
    @abstractmethod
    def pay(self, order: "Order") -> None: ...
    @abstractmethod
    def ship(self, order: "Order") -> None: ...

class PendingState(OrderState):
    def pay(self, order: "Order") -> None:
        print("Payment received")
        order.state = PaidState()
    
    def ship(self, order: "Order") -> None:
        raise Exception("Cannot ship unpaid order")

class PaidState(OrderState):
    def pay(self, order: "Order") -> None:
        raise Exception("Already paid")
    
    def ship(self, order: "Order") -> None:
        print("Order shipped")
        order.state = ShippedState()

class Order:
    def __init__(self):
        self.state: OrderState = PendingState()
    
    def pay(self) -> None:
        self.state.pay(self)
    
    def ship(self) -> None:
        self.state.ship(self)
```

---

### 21. 策略模式 (Strategy)

**意图**: 定义算法族，使它们可以互相替换。

**适用场景**: 支付方式、排序算法、压缩算法

```python
class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float) -> bool: ...

class CreditCardPayment(PaymentStrategy):
    def pay(self, amount: float) -> bool:
        print(f"Paid {amount} via credit card")
        return True

class AlipayPayment(PaymentStrategy):
    def pay(self, amount: float) -> bool:
        print(f"Paid {amount} via Alipay")
        return True

class ShoppingCart:
    def __init__(self):
        self._strategy: PaymentStrategy = None
    
    def set_payment_strategy(self, strategy: PaymentStrategy) -> None:
        self._strategy = strategy
    
    def checkout(self, amount: float) -> bool:
        return self._strategy.pay(amount)

# 使用
cart = ShoppingCart()
cart.set_payment_strategy(AlipayPayment())
cart.checkout(100.0)
```

---

### 22. 模板方法模式 (Template Method)

**意图**: 定义算法骨架，将某些步骤延迟到子类。

**适用场景**: 框架钩子、数据处理流程

```python
class DataProcessor(ABC):
    def process(self, data: str) -> str:
        """模板方法，定义处理流程"""
        data = self._read(data)
        data = self._transform(data)
        data = self._save(data)
        return data
    
    @abstractmethod
    def _read(self, data: str) -> str: ...
    
    @abstractmethod
    def _transform(self, data: str) -> str: ...
    
    def _save(self, data: str) -> str:
        """默认实现，子类可覆盖"""
        return data

class CSVProcessor(DataProcessor):
    def _read(self, data: str) -> str:
        return parse_csv(data)
    
    def _transform(self, data: str) -> str:
        return clean_data(data)

class JSONProcessor(DataProcessor):
    def _read(self, data: str) -> str:
        return json.loads(data)
    
    def _transform(self, data: str) -> str:
        return validate_json(data)
```

---

### 23. 访问者模式 (Visitor)

**意图**: 在不修改类的情况下，定义作用于元素的新操作。

**适用场景**: AST 遍历、文档导出、报表生成

```python
class Visitor(ABC):
    @abstractmethod
    def visit_circle(self, circle: "Circle") -> None: ...
    @abstractmethod
    def visit_rectangle(self, rect: "Rectangle") -> None: ...

class Shape(ABC):
    @abstractmethod
    def accept(self, visitor: Visitor) -> None: ...

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius
    
    def accept(self, visitor: Visitor) -> None:
        visitor.visit_circle(self)

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height
    
    def accept(self, visitor: Visitor) -> None:
        visitor.visit_rectangle(self)

class AreaCalculator(Visitor):
    def __init__(self):
        self.total_area = 0
    
    def visit_circle(self, circle: Circle) -> None:
        self.total_area += 3.14 * circle.radius ** 2
    
    def visit_rectangle(self, rect: Rectangle) -> None:
        self.total_area += rect.width * rect.height

# 使用
shapes = [Circle(5), Rectangle(3, 4)]
calculator = AreaCalculator()
for shape in shapes:
    shape.accept(calculator)
print(calculator.total_area)
```

---

## 패턴 선택 가이드

| 요구사항 | 추천 패턴 |
|------|---------|
| 단일 인스턴스 생성 | 싱글톤 |
| 조건에 따른 객체 생성 | 팩토리 메서드 / 추상 팩토리 |
| 복잡한 객체 단계별 구축 | 빌더 |
| 기존 객체 복사 | 프로토타입 |
| 호환되지 않는 인터페이스 적응 | 어댑터 |
| 동적 기능 추가 | 데코레이터 |
| 복잡한 서브시스템 단순화 | 퍼사드 |
| 객체 접근 제어 | 프록시 |
| 체인식 요청 처리 | 책임 연쇄 |
| 요청을 객체로 캡슐화 | 커맨드 |
| 객체 상태 변화 | 상태 |
| 알고리즘 교체 가능 | 전략 |
| 일대다 알림 | 옵저버 |
| 알고리즘 골격 정의 | 템플릿 메서드 |
| 복잡한 구조 순회 | 반복자 / 방문자 |
| 상태 저장/복원 | 메멘토 |

---

## 주의사항

1. **과도한 사용 금지** - 간단한 문제에는 간단한 해결책을
2. **의도 이해** - 패턴은 특정 문제를 해결하는 방안
3. **조합 사용** - 여러 패턴을 조합할 수 있음
4. **Python 특성** - 덕 타이핑, 데코레이터, 제너레이터 등을 활용하여 구현 단순화

Kiro Steering Pack

사용 방법
1. 이 폴더의 .kiro/steering 를 프로젝트 루트에 그대로 복사
2. Kiro에서 작업 요청할 때, 아래 워크플로우 중 하나를 기준으로 진행하라고 말하기
3. 테스트 실행이 가능한 프로젝트라면, testing-and-logs.md 규칙을 항상 적용

구성 파일
1. stack.md: 프로젝트 기술 스택과 기본 선택 규칙
2. workflow-bugfix.md: 버그 수정용 워크플로우
3. workflow-feature.md: 기능 추가용 워크플로우
4. testing-and-logs.md: 테스트, 로그, 토큰 절약 규칙
5. code-style.md: 코드 스타일과 변경 안전장치

추천 사용 패턴
버그 수정: workflow-bugfix + testing-and-logs
기능 추가: workflow-feature + testing-and-logs
리팩터: workflow-feature의 계획 방식 + code-style

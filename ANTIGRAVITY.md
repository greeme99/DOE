 Project: DOE

상위 Workspace 지침을 따르며, 이 파일은 프로젝트 고유 사실과 명령만 정의한다.

## Mission
- 목적: <한 문장>
- 주요 사용자: <사용자>
- 완료 기준: <측정 가능한 기준>

## Stack
- Runtime: <예: Node.js 22>
- Package manager: <예: pnpm>
- Framework: <예: Next.js>
- Database: <예: PostgreSQL>
- Test: <예: Vitest + Playwright>

## Architecture
- `<path>`: <책임>
- `<path>`: <책임>
- 의존성 방향: <규칙>
- 공개 API/호환성 제약: <규칙>

## Canonical Commands
```powershell
# install
<command>

# lint
<command>

# typecheck
<command>

# unit test
<command>

# integration/e2e
<command>

# build
<command>
```

## Coding Rules
- 기존 코드 스타일과 네이밍을 따른다.
- 새 의존성은 필요성과 대안을 설명한 후 추가한다.
- 요청과 무관한 포맷/리팩터링을 금지한다.
- 공개 인터페이스 변경은 명시적으로 보고한다.

## Verification Matrix
| 변경 유형 | 필수 검증 |
|---|---|
| 로직 | 관련 단위 테스트 |
| API/DB | 통합 테스트 + 호환성 확인 |
| UI | 컴포넌트 테스트 또는 실제 실행 검증 |
| 설정/빌드 | clean build |
| 보안 경계 | security-reviewer 검토 |

## Memory
- 이 프로젝트 고유 사실은 `.agents\memory\MEMORY.md`에 있다. 세션 시작 시 읽는다.
- 새 기록은 `.agents\memory\pending\`에 초안으로 남기고 승인 후 반영한다
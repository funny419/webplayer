# 팀 운영 규칙 (Rules)

> 최종 업데이트: 2026-04-21 | 관리: writer

---

## 응답 언어
- **모든 팀원은 한국어로 응답한다.**

## 보고 원칙
- **실제로 실행한 작업만 보고한다.** 수행하지 않은 작업을 완료했다고 보고하는 것은 엄격히 금지된다.
- 작업 결과는 반드시 직접 확인(도구 실행, 출력 검증)한 후 보고한다.

## 완료 판단 기준
- **GitHub Project 보드 카드 Status(Done)**을 완료 기준으로 한다.
- 웹 관련 작업은 `vite build` 성공 확인 후 Done 처리한다.

## 담당자 배정 기준

| 레이블 | 담당자 |
|--------|--------|
| `web` | web-dev |
| `android` | android-dev |
| `design` | designer |
| `planning` | game-planner |
| `docs` | writer |

- 복합 레이블 이슈 배정은 **사용자가 직접 결정**한다.

## 개발 우선순위
- **기획·디자인 먼저 확정 후 개발 진행.**
- **웹 게임 완성 우선**: M1~M6 완료 후 M7(Android 배포) 진행.
- android-dev는 M6 완료 전까지 대기, **사용자 지시 시에만 재개**.

## 기획 변경 프로세스
- GDD 확정 후 변경은 **사용자 승인** 필요. `docs/GDD.md`에 변경 이력 기록.
- `docs/data/` JSON 수정 시 사용자에게 보고 후 web-dev에게 전달.
- `docs/data/dialogues.json` 대사는 **M4 시작 전 확정**. 이후 변경 시 사용자 승인 필요.

## 에셋 관리 규칙
**네이밍**: `{캐릭터}_{동작}_{방향}.png` / `{지역}_{유형}.png`
변경 시 web-dev 사전 합의 필수 (코드 key와 1:1 대응).
**배치**: 원본 → `design/` | 게임 사용본 → web-dev가 `web/public/assets/`로 복사.
**교체**: M5 이후 placeholder → 실제 에셋 교체. 파일명/key 동일 유지.
**승인**: 에셋 규격 변경(크기, 프레임 수)은 사용자에게 보고 후 진행.

## Android 연동 규칙
- **에셋 동기화**: 마일스톤 PR에 `web/dist/ → android/app/src/main/assets/` 복사 완료 체크박스 포함.
- **호환성 검증**: Android PR은 최소 API 24 기기/에뮬레이터에서 로드 확인 후 머지.
- **번들 크기**: M4 이후 JS 번들 **2MB 초과** 시 사용자에게 알림.

## 팀원 스폰 시 model 명시 규칙
- 팀원 스폰 시 반드시 **`model: "sonnet"`** 을 명시할 것 — 생략하면 오류 발생.
| model 값 | 실제 모델 |
|----------|----------|
| `"sonnet"` | claude-sonnet-4-6 |
| `"haiku"` | claude-haiku-4-5-20251001 |
- `"opus"` 및 model 생략은 현재 API에서 **유효하지 않음**.

## docs 폴더 구조 규칙
`docs/` 폴더는 업무 카테고리별로 관리한다.

| 폴더 | 담당 | 내용 |
|------|------|------|
| `docs/planning/` | game-planner | GDD, 스토리, 퀘스트 설계, 게임 데이터 JSON |
| `docs/project/` | writer | 프로젝트 계획서, 스펙 문서 |
| `docs/android/` | android-dev | Android 관련 기술 문서, 성능 테스트 결과 |

- 새 문서 작성 시 위 카테고리에 맞는 폴더에 저장한다.
- 카테고리에 맞지 않는 위치에 파일을 생성하지 않는다.

## MD 파일 관리 정책 (writer 담당)
- **writer는 프로젝트 내 모든 `.md` 파일을 관리·운영한다.**
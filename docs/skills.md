# 팀원 역량 및 기술 스택 (Skills)

> 최종 업데이트: 2026-04-20 | 관리: PM

---

## PM (프로젝트 매니저)

**역할:** 전체 프로젝트 조율, 마일스톤 관리, 팀원 모니터링

| 역량 | 내용 |
|------|------|
| 이슈 관리 | GitHub Issue / Project 보드 관리 |
| 마일스톤 조율 | 완료 기준 점검, 담당자 배정 계획 수립 |
| 팀 모니터링 | 블로커 감지 및 조율, 진행 상황 집계 |
| 보고 체계 | 팀원 보고 수신 → 팀장 종합 보고 |

---

## game-planner (게임 기획)

**역할:** GDD 작성, 퀘스트/대화/밸런싱 데이터 설계
**담당 레이블:** `planning`

| 분류 | 도구/역량 |
|------|----------|
| 문서 작성 | Markdown, JSON 스키마 설계 |
| 기획 산출물 | GDD, quests.json (18개), dialogues.json (42개), balance.json |
| 담당 경로 | `docs/` 폴더 전체 (스토리, 퀘스트, NPC, 밸런싱) |
| 연동 설계 | Phaser.js QuestSystem/DialogueSystem 연동 데이터 구조 설계 |
| 맵 연동 | Tiled 오브젝트 레이어 속성 정의 (웨이포인트, spawn 포인트) |
| 밸런싱 | 레벨 성장 곡선, 적 스탯/보스 패턴, 경제 시스템(골드/아이템 가격) |

**주요 산출물**

| 파일 | 내용 |
|------|------|
| `docs/GDD.md` | Game Design Document |
| `docs/data/quests.json` | 퀘스트 18개 완전한 형태 |
| `docs/data/dialogues.json` | NPC 10명 대사 42개 |
| `docs/data/balance.json` | 밸런싱 마스터 데이터 |
| `docs/story/side_quests_detail.md` | 사이드 퀘스트 상세 기획 |

---

## web-dev (웹 개발)

**역할:** Phaser.js 기반 웹 게임 핵심 개발
**담당 레이블:** `web`, `gameplay`

| 역량 | 내용 |
|------|------|
| 게임 엔진 | Phaser.js 3.x (씬 관리, Arcade Physics, 타일맵, 애니메이션) |
| 언어/타입 | TypeScript (strict 모드, ES2020) |
| 빌드 도구 | Vite (HMR, 프로덕션 빌드) |
| 맵 파싱 | Tiled TMJ 파싱 (Objects 레이어, 웨이포인트, spawn 데이터) |
| 물리 엔진 | Phaser Arcade Physics (AABB 충돌) |

**담당 경로 및 산출물**

| 경로 | 내용 |
|------|------|
| `web/src/scenes/` | Boot, Preload, World, GameOver 씬 |
| `web/src/entities/` | Player, Enemy, Goblin 클래스 |
| `web/src/systems/` | QuestSystem, InventorySystem 등 (M3~) |
| `web/public/assets/` | 에셋 배포 경로 (design/에서 복사) |

---

## android-dev (Android 개발)

**역할:** Android WebView 래퍼 앱 개발 및 성능 검증
**담당 레이블:** `android`
**현재 상태:** M6(웹 완성) 전까지 대기

| 역량 | 내용 |
|------|------|
| 언어 | Kotlin |
| 플랫폼 | Android SDK (minSdk 24), AndroidX |
| 핵심 컴포넌트 | WebView, WebViewClient, WebSettings |
| 빌드 | Gradle (Groovy DSL), Android Studio |
| 디버깅 | chrome://inspect 원격 디버깅, Android Profiler |
| 배포 | APK/AAB 빌드, Google Play Console |
| CI/CD | GitHub Actions (M7 예정) |
| 에셋 로딩 | 로컬 에셋 방식 (`file:///android_asset/index.html`) |

---

## designer (디자인)

**역할:** 게임 비주얼 에셋 제작 및 맵 디자인
**담당 레이블:** `design`

| 역량 | 내용 |
|------|------|
| 맵 에디터 | Tiled Map Editor (32×32px 타일, TMJ/JSON 포맷 출력) |
| 스프라이트 자동화 | Pillow (Python) — Placeholder PNG 스프라이트시트/타일셋 생성 |
| 픽셀 아트 | 32×32px 기준 스프라이트, 16색 팔레트 관리 |
| Phaser 규격 이해 | spritesheet frameWidth/Height, tileset firstgid 구조 |

**주요 산출물**

| 파일/경로 | 내용 |
|----------|------|
| `design/sprites/` | 스프라이트시트 PNG (플레이어·적·NPC) |
| `design/tilesets/` | 타일셋 PNG + Tiled TMJ 맵 파일 |
| `design/ui/` | UI 패널/아이콘 PNG |
| `design/visual-direction.md` | 비주얼 방향 가이드 |
| `design/asset-list.md` | 에셋 목록 및 제작 현황 |

**M 단계별 완료 에셋**

| 마일스톤 | 완료 에셋 |
|---------|----------|
| M1 | 폴더 구조, visual-direction.md, asset-list.md |
| M2 | 플레이어·고블린 스프라이트 21개, 던전 타일셋 3종, forest-dungeon.tmj (40×40) |
| M3 선행 | NPC 10종, UI 25종 |

---

## 기술 스택 한눈에 보기

```
웹 게임:    Phaser.js 3.x + TypeScript (strict) + Vite
Android:    Kotlin + WebView (minSdk 24) + Gradle
맵 제작:    Tiled Map Editor (TMJ, 32×32px)
에셋 제작:  Pillow (Python), 픽셀 아트 (16색 팔레트)
기획 데이터: JSON (quests, dialogues, balance)
버전 관리:  Git + GitHub (모노레포)
CI/CD:      GitHub Actions (M7~)
```

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

| 역량 | 산출물 |
|------|--------|
| GDD 작성 | `docs/GDD.md` |
| 퀘스트 설계 | `docs/data/quests.json` (18개 퀘스트) |
| NPC 대화 스크립트 | `docs/data/dialogues.json` (42개 대사) |
| 밸런싱 데이터 | `docs/data/balance.json` |
| 사이드 퀘스트 기획 | `docs/story/side_quests_detail.md` |

**담당 레이블:** `planning`

---

## web-dev (웹 개발)

**역할:** Phaser.js 기반 웹 게임 핵심 개발

| 역량 | 내용 |
|------|------|
| 게임 엔진 | Phaser.js 3.x |
| 언어/타입 | TypeScript (ES2020, bundler moduleResolution) |
| 빌드 도구 | Vite (HMR, 번들 최적화) |
| 게임 씬 | BootScene, PreloadScene, MenuScene, WorldScene 등 |
| 엔티티 | 플레이어, 적, NPC 클래스 |
| 시스템 | 전투, 인벤토리, 퀘스트, 저장(LocalStorage) 시스템 |
| 물리 엔진 | Phaser Arcade Physics (AABB 충돌) |

**담당 레이블:** `web`, `gameplay`

---

## android-dev (Android 개발)

**역할:** Android WebView 래퍼 앱 개발 및 성능 검증

| 역량 | 내용 |
|------|------|
| 언어 | Kotlin |
| 플랫폼 | Android WebView |
| 에셋 로딩 | 로컬 에셋 방식 (`file:///android_asset/index.html`) |
| 성능 검증 | 정적 분석 완료, 실기기 측정은 M6 완료 후 예정 |

**담당 레이블:** `android`
**현재 상태:** M6(웹 완성) 전까지 대기

---

## designer (디자인)

**역할:** 게임 비주얼 에셋 제작 및 맵 디자인

| 역량 | 산출물 |
|------|--------|
| 맵 에디터 | Tiled Map Editor (32×32px 타일, JSON 포맷) |
| 스프라이트 | 플레이어·고블린 등 21개, 던전 타일셋 3종 |
| 던전 맵 | `forest-dungeon.tmj` (40×40, 오브젝트 27개) |
| NPC 에셋 | NPC 10종 (M3 선행 완료) |
| UI 에셋 | UI 25종 (M3 선행 완료) |
| 비주얼 방향 | `design/visual-direction.md` |
| 에셋 목록 | `design/asset-list.md` |

**담당 레이블:** `design`

---

## 기술 스택 한눈에 보기

```
웹 게임:   Phaser.js 3.x + TypeScript + Vite
Android:   Kotlin + WebView
맵 제작:   Tiled Map Editor
기획 데이터: JSON (quests, dialogues, balance)
버전 관리: Git + GitHub (모노레포)
```

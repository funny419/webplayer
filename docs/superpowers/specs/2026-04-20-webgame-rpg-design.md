# 웹 기반 탑다운 2D 액션 RPG — 설계 문서

**날짜:** 2026-04-20
**상태:** 승인됨

---

## 1. 개요

웹 브라우저에서 실행되는 탑다운 2D 실시간 액션 RPG. Phaser.js 3 기반으로 개발하며, 동일한 코드베이스를 Android WebView로 감싸 앱으로도 배포한다. 싱글플레이어, 중규모(5~10시간 플레이, 스토리 포함) 인디 게임을 목표로 한다.

---

## 2. 게임 사양

| 항목 | 내용 |
|------|------|
| 장르 | 탑다운 2D 실시간 액션 RPG |
| 플레이어 수 | 싱글플레이어 |
| 플레이 시간 | 5~10시간 |
| 플랫폼 | 웹 (브라우저), Android (WebView 래퍼) |
| 엔진/프레임워크 | Phaser.js 3.x |

---

## 3. 프로젝트 구조 (모노레포)

```
webplayer/
├── web/                    # Phaser.js 웹 게임 메인
│   ├── src/
│   │   ├── scenes/         # 게임 씬 (Boot, World, Battle, UI...)
│   │   ├── entities/       # 플레이어, 적, NPC 클래스
│   │   ├── systems/        # 전투, 인벤토리, 퀘스트, 저장 시스템
│   │   └── assets/         # 스프라이트, 사운드, 타일맵
│   ├── public/
│   └── package.json
├── android/                # WebView 래퍼 Android 앱
│   ├── app/src/
│   └── build.gradle
├── design/                 # 디자인 에셋 원본
│   ├── sprites/
│   ├── ui/
│   └── concepts/
├── docs/                   # 기획 및 설계 문서
│   ├── GDD.md              # Game Design Document
│   └── story/
└── README.md
```

---

## 4. 기술 스택

| 레이어 | 기술 |
|--------|------|
| 게임 엔진 | Phaser.js 3.x |
| 언어 | TypeScript |
| 번들러 | Vite |
| 맵 에디터 | Tiled Map Editor |
| Android | Kotlin + WebView |
| 에셋 관리 | Phaser Asset Loader |

---

## 5. 팀 구성 및 역할

| 역할 | 주 담당 영역 | 책임 |
|------|-------------|------|
| 게임 기획 담당 | `docs/` | GDD 작성, 스토리/퀘스트 설계, 밸런싱 |
| 웹 개발 담당 | `web/` | Phaser.js 게임 구현, 씬/엔티티/시스템 개발 |
| Android 앱 담당 | `android/` | WebView 래퍼, Android 빌드/배포 |
| 디자인 담당 | `design/` | 스프라이트, UI/UX 에셋, 비주얼 디렉션 |
| 프로젝트 담당 (PM) | 전체 | 태스크 관리, 마일스톤 계획, 팀 조율 |

---

## 6. 핵심 게임 시스템

### 6.1 씬 흐름
```
BootScene → PreloadScene → MenuScene → WorldScene ↔ BattleScene
                                                 ↕
                                            InventoryScene / QuestScene
```

### 6.2 주요 시스템
- **전투 시스템**: 실시간 근접/원거리 공격, 회피, HP/MP 관리
- **퀘스트 시스템**: 메인/사이드 퀘스트, 목표 추적, 보상
- **인벤토리 시스템**: 아이템 수집, 장비 착용, 소비 아이템
- **저장 시스템**: LocalStorage 기반 자동/수동 저장
- **맵 시스템**: Tiled 맵 로드, 충돌, 레이어 관리

---

## 7. Android 배포 전략

- 웹 게임은 `web/dist/`로 빌드
- Android 앱은 해당 빌드를 WebView로 로드 (로컬 assets 또는 hosted URL)
- 최소 Android API Level 24 (Android 7.0) 타깃
- 추후 Google Play Store 배포 고려

---

## 8. 개발 마일스톤

| 마일스톤 | 내용 |
|---------|------|
| M1 | 프로젝트 하네스 구성, 팀 스폰, GDD 초안 |
| M2 | 웹 게임 프로토타입 (플레이어 이동, 전투 기초) |
| M3 | 첫 번째 던전/지역, 퀘스트 시스템 |
| M4 | 스토리 완성, UI 폴리싱 |
| M5 | Android 앱 래핑, QA, 배포 |

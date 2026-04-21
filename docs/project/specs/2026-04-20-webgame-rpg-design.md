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

### 2.1 콘텐츠 범위

| 항목 | 목표 수량 |
|------|----------|
| 지역/던전 | 4~5개 (마을 1개 포함) |
| 적 종류 | 15~20종 (일반 적 + 보스 5종) |
| NPC | 10~15명 (퀘스트 NPC 포함) |
| 메인 퀘스트 | 10~15개 |
| 사이드 퀘스트 | 5~10개 |
| 아이템 종류 | 무기 10종, 방어구 10종, 소비 아이템 10종 |

### 2.2 전투 메커닉

- **기본 공격**: 근접 (검) + 원거리 (마법/활) 중 선택
- **회피**: 대시 (짧은 무적 프레임)
- **스탯**: HP, MP, 공격력, 방어력, 이동속도
- **충돌 감지**: Phaser 내장 Arcade Physics (AABB 기반)
- **난이도**: 단일 (노멀), 이후 확장 가능

**적 AI (유한 상태 머신):**
- 순찰: Tiled 오브젝트 레이어에 정의된 웨이포인트 따라 이동
- 감지: 원형 감지 반경(픽셀 단위, 적마다 설정), 시야선 체크 없음(단순화)
- 추적: 플레이어 좌표로 직선 이동
- 공격: 사거리 진입 시 공격 애니메이션 + 데미지 판정
- 다수 적 우선순위: 각 적이 독립적으로 상태 전환 (중앙 집중 없음)

---

## 3. 기술 선택 근거

| 기술 | 선택 이유 |
|------|----------|
| **Phaser.js 3** | 2D HTML5 게임에 특화, 대규모 커뮤니티, TypeScript 지원, Arcade Physics 내장. Godot WebGL 빌드 대비 번들 크기 작고 설정 단순. |
| **Vite** | 빠른 HMR, Phaser 3 공식 템플릿 지원, 번들 최적화 우수. |
| **TypeScript** | 타입 안전성으로 시스템 간 인터페이스 명확화. `tsconfig.json`: `target: ES2020`, `moduleResolution: bundler`, Phaser 타입은 `phaser` npm 패키지에 포함. |
| **Tiled Map Editor** | Phaser와 공식 호환, JSON 포맷 출력, 레이어/오브젝트 레이어 지원. 타일 크기 32×32px, 맵 최대 100×100 타일. |
| **Kotlin + WebView** | Android 네이티브 WebView는 추가 런타임 불필요. Flutter/React Native 대비 오버헤드 없음. 이미 웹으로 구현된 게임을 감싸는 용도이므로 최소 래퍼가 적합. |

---

## 4. 프로젝트 구조 (모노레포)

```
webplayer/
├── web/                    # Phaser.js 웹 게임 메인
│   ├── src/
│   │   ├── scenes/         # 게임 씬 (Boot, Preload, Menu, World, Battle, UI...)
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

## 5. 핵심 시스템 설계

### 5.1 씬 흐름

```
BootScene → PreloadScene → MenuScene → WorldScene ↔ BattleScene
                                                 ↕
                                            InventoryScene / QuestScene
```

### 5.2 저장 시스템

- **저장 방식**: LocalStorage (키: `webplayer_save_v1`)
- **저장 슬롯**: 1개 (추후 확장 가능)
- **오염 대응**: JSON.parse 실패 시 저장 초기화 + 경고 팝업

**SaveData 스키마:**
```json
{
  "version": 1,
  "player": {
    "x": 100, "y": 200, "scene": "WorldScene",
    "hp": 100, "mp": 50, "atk": 15, "def": 10, "spd": 150
  },
  "inventory": [
    { "id": "sword_01", "qty": 1, "equipped": true }
  ],
  "quests": {
    "quest_01": { "status": "active", "objectives": { "kill_goblins": 3 } },
    "quest_02": { "status": "completed" }
  },
  "events": ["intro_cutscene_done", "boss_01_defeated"]
}
```

**마이그레이션**: `version` 필드 비교 후 하위 버전이면 변환 함수 적용 (버전별 변환 함수 배열로 관리)

### 5.3 Android 에셋 로딩 전략

- 게임 빌드(`web/dist/`)를 Android `assets/` 폴더에 포함 (**로컬 에셋 방식**)
- WebView가 `file:///android_asset/index.html` 로드
- 네트워크 불필요, 오프라인 플레이 가능
- 업데이트 시 앱 재배포 필요 (허용 가능한 트레이드오프)

### 5.4 퀘스트 시스템 상세

**퀘스트 JSON 스키마** (`docs/data/quests.json`):
```json
{
  "id": "quest_01",
  "title": "첫 번째 임무",
  "giver_npc": "npc_elder",
  "objectives": [
    { "id": "kill_goblins", "type": "kill", "target": "goblin", "count": 3 },
    { "id": "reach_cave", "type": "location", "scene": "CaveScene" }
  ],
  "reward": { "exp": 50, "items": [{ "id": "potion_01", "qty": 2 }] },
  "dialogue": {
    "start": "quest_01_start",
    "complete": "quest_01_end"
  }
}
```

**목표 타입**: `kill` (처치), `collect` (아이템 수집), `location` (장소 도달), `talk` (NPC 대화)

**NPC 대화**: 선형 구조 (분기 없음, M3 범위). 대화 ID → 대사 배열로 관리.

### 5.5 시스템 간 인터페이스

```typescript
interface CombatSystem { attack(attacker: Entity, target: Entity): void; }
interface InventorySystem { addItem(id: string, qty: number): void; useItem(id: string): void; }
interface QuestSystem { startQuest(id: string): void; completeObjective(questId: string, objId: string): void; }
interface SaveSystem { save(): void; load(): SaveData | null; }
```

### 5.6 Android 빌드 배포 흐름

```
web/npm run build → web/dist/ → 수동 복사 → android/app/src/main/assets/
                                                      ↓
                                          Android Studio 빌드 → APK/AAB
                                                      ↓
                                              Google Play Console 업로드
```
- 버전 관리: `web/package.json`의 `version`과 `android/build.gradle`의 `versionName` 동기화
- **M2~M6 에셋 동기화**: AD가 주요 마일스톤마다 `web/dist/` 빌드 결과물을 `android/app/src/main/assets/`에 수동 복사. 복사 여부는 PR 체크리스트로 확인.
- CI/CD: M7 이후 GitHub Actions 도입 고려

---

## 6. 팀 구성 및 의사결정

| 역할 | 주 담당 | 책임 | PR 리뷰 |
|------|---------|------|---------|
| 게임 기획 (GP) | `docs/` | GDD, 스토리, 퀘스트, 밸런싱 | 기획 관련 변경 최종 승인 |
| 웹 개발 (WD) | `web/` | Phaser.js 구현, 시스템 개발 | 코드 변경 최종 승인 |
| Android 개발 (AD) | `android/` | WebView 래퍼, 빌드/배포 | Android 변경 최종 승인 |
| 디자인 (DS) | `design/` | 스프라이트, UI/UX 에셋 | 에셋 변경 최종 승인 |
| PM | 전체 | 태스크 관리, 마일스톤, 팀 조율 | 아키텍처 결정 최종 승인 |

- **기술 아키텍처 결정**: PM + WD 합의
- **GDD 확정 시점**: M1 완료 전 (이후 변경은 PM 승인 필요)
- **분쟁 해결**: PM이 최종 결정권 보유

---

## 7. 개발 마일스톤

| 마일스톤 | 내용 | 완료 기준 |
|---------|------|----------|
| **M1** | 하네스 구성, 팀 스폰, GDD 확정 | 폴더 구조·보일러플레이트 동작, `docs/GDD.md` PR 머지 완료 (GP + PM 승인) |
| **M2** | 플레이어 이동, 기본 전투, 첫 지역 맵 | 플레이어 이동/대시/공격, 적 AI(순찰→추적→공격), 첫 번째 던전 맵 완성 |
| **M3** | 퀘스트·인벤토리·NPC 대화 시스템 | kill/collect/location 목표 타입 동작, 인벤토리 장착/사용, NPC 10명 선형 대화 (분기 없음) |
| **M4** | 전체 4~5개 지역 + 보스 5종 + 저장 시스템 | 모든 지역 이동 가능, 보스 전부 처치 가능, 저장/불러오기 동작 |
| **M5** | 메인 퀘스트 완주 + 스토리 엔딩 | 처음부터 엔딩 씬까지 플레이 가능 |
| **M6** | UI 폴리싱, 버그 픽스, QA | 크리티컬 버그 없음, 5시간 플레이 검증 완료 |
| **M7** | Android WebView 래핑, 스토어 배포 | Google Play Store 제출 완료 |

---

## 8. 리스크

| 리스크 | 대응 |
|--------|------|
| Phaser.js 모바일 성능 | M2에서 Android WebView 성능 검증 스파이크 |
| 에셋 제작 병목 | M2까지 임시 placeholder 에셋 사용, 디자인 팀과 병렬 진행 |
| 스코프 크리프 | GDD M1 동결 이후 기능 추가는 PM 승인 필수 |

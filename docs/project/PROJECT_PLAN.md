# 프로젝트 계획서 — 에테리아의 균열 (Crack of Eteria)

> 최초 작성: 2026-04-21 | 관리: writer

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 게임명 | 에테리아의 균열 (Crack of Eteria) |
| 장르 | 탑다운 2D 실시간 액션 RPG |
| 플랫폼 | 웹 브라우저, Android (WebView) |
| 엔진 | Phaser.js 3.x + TypeScript |
| 목표 플레이 시간 | 5~10시간 |
| 핵심 컨셉 | 평범한 청년이 세계를 구하는 영웅이 되는 성장 이야기 |

---

## 2. 팀 구성 및 역할

| 역할 | 담당자 | 참여 시점 |
|------|--------|----------|
| 게임 기획 | game-planner | M1~ |
| 웹 개발 | web-dev | M1~ |
| 디자인 | designer | M1~ |
| 문서 관리 | writer | M1~ |
| Android 개발 | android-dev | M7~ |

---

## 3. 기술 스택

| 항목 | 내용 |
|------|------|
| 게임 엔진 | Phaser.js ^3.88.2 |
| 언어 | TypeScript ^5.4.5 |
| 번들러 | Vite ^5.2.11 |
| 해상도 | 960×540, Scale.FIT + CENTER_BOTH |
| 목표 FPS | 60fps |
| 빌드 명령 | `tsc && vite build` → `web/dist/` |
| 번들 크기 제한 | M4 이후 JS 번들 2MB 초과 시 사용자 알림 |

### 폴더 구조 (주요)

```
web/
  src/
    scenes/       # Phaser Scene 파일
    entities/     # Player, Enemy 등 엔티티
    systems/      # 퀘스트, 인벤토리 등 게임 시스템 (M3~)
    ui/           # DOM 오버레이 UI 컴포넌트 (M6~)
  public/
    assets/       # 게임 사용 에셋
```

---

## 4. 마일스톤 계획

| 마일스톤 | 내용 | 상태 |
|----------|------|------|
| M1 | 하네스 구성, 팀 스폰, GDD 확정 | ✅ 완료 |
| M2 | 플레이어 이동·기본 전투·첫 지역 맵 | ✅ 완료 |
| M3 | 퀘스트·인벤토리·NPC 대화 시스템 | ✅ 완료 |
| M4 | 보스 5종 구현 + 지역 맵 3개 제작 (고대 유적·용암 동굴·마왕의 성) | ✅ 완료 |
| M5 | 메인 퀘스트 완주 + 스토리 엔딩 | ✅ 완료 |
| M6 | UI 폴리싱·버그 픽스·QA | 🔄 진행 중 |
| M7 | Android WebView 래핑·스토어 배포 | ⏳ 대기 |

### 퀘스트 범위

- 메인 퀘스트: 11개 (mq_01 ~ mq_11)
- 사이드 퀘스트: 7개 (sq_01 ~ sq_07)

---

## 5. 에셋 계획

### 비주얼 방향성

- 아트 스타일: 픽셀 아트, 다크 판타지 + 온기 대비
- 기본 타일 크기: 32×32px
- 보스 스프라이트: 64×64px

### 네이밍 규칙

- 캐릭터: `{캐릭터}_{동작}_{방향}.png`
- 타일/지역: `{지역}_{유형}.png`

### 배치 규칙

- 원본: `design/`
- 게임 사용본: `web/public/assets/` (web-dev가 복사)

### 현황 및 M2 우선 납기

| 상태 | 항목 |
|------|------|
| 완료 (Placeholder) | player_walk_*.png 등 플레이어 10종 |
| M2 우선 납기 | player_walk_*.png, goblin_walk_*.png, dungeon_floor.png, dungeon_walls.png |
| 미시작 | 적·NPC·UI 다수 |

---

## 6. 규칙 및 프로세스

- **작업 지시 체계**: 사용자 → 팀원 순서, 명시적 지시 없이 착수 금지
- **완료 기준**: GitHub Project 보드 카드 Status(Done)
- **웹 완료 조건**: `vite build` 성공 확인 후 Done 처리
- **기획 변경**: GDD 확정 후 변경 시 사용자 승인 필요, `docs/planning/GDD.md`에 변경 이력 기록
- **에셋 규격 변경**: 사용자 보고 후 진행
- **Android 개발**: M6 완료 전까지 대기, 사용자 지시 시에만 재개

---

## 7. 단일 진실 원천 (Source of Truth)

| 구분 | 기준 문서 | 설명 |
|------|----------|------|
| 게임 설계·밸런스·시스템 사양 | `docs/planning/GDD.md` | 최신 확정본. 코드·에셋·문서와 충돌 시 GDD 우선 |
| 프로젝트 일정·팀 운영·마일스톤 | `docs/project/PROJECT_PLAN.md` | 본 문서 |
| 기술 스펙·구현 사양 | `docs/project/specs/2026-04-20-webgame-rpg-design.md` | GDD 보완, 충돌 시 GDD 우선 |

> GDD 변경 시 반드시 사용자 승인 후 변경 이력(GDD 부록)에 기록한다.

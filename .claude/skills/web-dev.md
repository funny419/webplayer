# web-dev (웹 개발) 역량

> 관리: writer

---

**역할:** Phaser.js 기반 웹 게임 핵심 개발
**담당 레이블:** `web`, `gameplay`

| 역량 | 내용 |
|------|------|
| 게임 엔진 | Phaser.js 3.x (씬 관리, Arcade Physics, 타일맵, 애니메이션) |
| 언어/타입 | TypeScript (strict 모드, ES2020) |
| 빌드 도구 | Vite (HMR, 프로덕션 빌드) |
| 맵 파싱 | Tiled TMJ 파싱 (Objects 레이어, 웨이포인트, spawn 데이터) |
| 물리 엔진 | Phaser Arcade Physics (AABB 충돌) |

## 담당 경로 및 산출물

| 경로 | 내용 |
|------|------|
| `web/src/scenes/` | Boot, Preload, World, GameOver 씬 |
| `web/src/entities/` | Player, Enemy, Goblin 클래스 |
| `web/src/systems/` | QuestSystem, InventorySystem 등 (M3~) |
| `web/public/assets/` | 에셋 배포 경로 (design/에서 복사) |

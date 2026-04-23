# 지역 시스템 (Area System) 설계 스펙

**날짜:** 2026-04-23
**마일스톤:** M6 — 그룹 A-2
**담당:** web-dev
**상태:** 확정

---

## 1. 배경 및 목표

현재 WorldScene은 `createPlaceholderMap()`으로 단색 사각형 맵만 그린다. GDD 3.1절의 5개 지역(하벤 마을·어둠의 숲·고대 유적·용암 동굴·마왕의 성)을 실제로 로드하고, 지역 간 이동·적·NPC·보스 스폰을 구현한다.

---

## 2. 아키텍처

### 2.1 파일 구조

```
web/src/
  systems/
    AreaManager.ts    # 신규 — 지역 로딩·스폰·출구 전담
  entities/
    NPC.ts            # 신규 — NPC 스프라이트 + 상호작용 트리거
  scenes/
    WorldScene.ts     # 수정 — AreaManager 연동
```

### 2.2 WorldScene 변경 방향

- 기존 `createPlaceholderMap()`, `spawnEnemies()` 제거
- `create()` 내에서 `AreaManager` 초기화 후 `loadArea('scene_haven')` 호출
- 지역별 콘텐츠 관리는 AreaManager에 위임
- `setupInput()`에 Space 키 추가 — `npc_interact_ready` 이벤트 상태일 때 `DialogueSystem.start(npcId)` 호출

### 2.3 NPC 상호작용 흐름

```
AreaManager.spawnNPC() → overlap 감지 → events.emit('npc_interact_ready', npcId)
WorldScene(Space 키 수신) → DialogueSystem.start(npcId)
DialogueSystem 완료 → quest.onTalkedToNpc(npcId)
```

dialogues.json의 최상위 키가 npcId와 동일하므로 별도 매핑 불필요.

### 2.3 AreaManager 인터페이스

```ts
class AreaManager {
  constructor(scene: WorldScene, walls: Phaser.Physics.Arcade.StaticGroup)

  /** 지역 로드: 맵 교체 + 적·NPC·보스·출구 스폰 */
  loadArea(areaId: string): void

  /** 현재 지역 ID */
  get currentAreaId(): string

  /** 지역 전환 시 이전 오브젝트 제거 */
  clearArea(): void
}
```

---

## 3. Tiled 맵 오브젝트 레이어 규칙

각 맵(.tmj)의 `objects` 레이어에 아래 타입으로 오브젝트를 배치한다.

| type | name 값 | 용도 |
|------|---------|------|
| `enemy_spawn` | `enemy_goblin` 등 GDD 6.1절 ID | 일반 적 스폰 위치 |
| `boss_spawn` | `boss_goblin_king` 등 GDD 6.2절 ID | 보스 스폰 위치 |
| `npc_spawn` | `npc_elder` 등 GDD 2.3절 ID | NPC 스폰 위치 |
| `exit_zone` | 이동할 지역 ID (`scene_forest` 등) | 출구 영역 |
| `player_start` | — | 플레이어 초기 위치 |

**AreaManager 오브젝트 레이어 파싱:**
```ts
map.getObjectLayer('objects')?.objects.forEach(obj => {
  switch (obj.type) {
    case 'enemy_spawn': this.spawnEnemy(obj.name, obj.x!, obj.y!); break;
    case 'boss_spawn':  this.spawnBoss(obj.name, obj.x!, obj.y!); break;
    case 'npc_spawn':   this.spawnNPC(obj.name, obj.x!, obj.y!); break;
    case 'exit_zone':   this.createExitZone(obj); break;
    case 'player_start': this.scene.player.setPosition(obj.x!, obj.y!); break;
  }
});
```

---

## 4. NPC 시스템

### 4.1 NPC 클래스

```ts
class NPC extends Phaser.Physics.Arcade.Sprite {
  readonly npcId: string;
  constructor(scene: Phaser.Scene, x: number, y: number, npcId: string)
}
```

- NPC 스프라이트: `assets/sprites/npc/{npcId}.png` (2프레임 idle)
- 플레이어 접근 시(overlap 감지): 말풍선 아이콘 표시
- Space 키 → `DialogueSystem`으로 대화 시작 (WorldScene.setupInput()에서 처리)
- 대화 완료 → `QuestSystem` 트리거 연결 (`quest.onTalkedToNpc(npcId)`)

### 4.2 AreaManager의 NPC 관리

```ts
private npcs: NPC[] = [];

spawnNPC(npcId: string, x: number, y: number): void {
  const npc = new NPC(this.scene, x, y, npcId);
  this.scene.physics.add.overlap(
    this.scene.player, npc,
    () => this.scene.events.emit('npc_interact_ready', npcId)
  );
  this.npcs.push(npc);
}
```

---

## 5. 출구(Exit Zone) 시스템

### 5.1 잠금 조건 테이블

| 출구 | 이동 지역 | 잠금 해제 퀘스트 |
|------|----------|----------------|
| 하벤 마을 → 숲 | `scene_forest` | `mq_01` |
| 숲 → 고대 유적 | `scene_ruins` | `mq_04` (고블린 왕 처치) |
| 유적 → 용암 동굴 | `scene_cavern` | `mq_07` (리치 처치) |
| 동굴 → 마왕의 성 | `scene_fortress` | `mq_09` (드래곤 처치) |

```ts
private readonly EXIT_UNLOCK: Record<string, string> = {
  scene_forest:   'mq_01',
  scene_ruins:    'mq_04',
  scene_cavern:   'mq_07',
  scene_fortress: 'mq_09',
};
```

### 5.2 출구 동작 흐름

1. 플레이어가 exit_zone 영역에 overlap
2. `EXIT_UNLOCK[nextAreaId]` 퀘스트 완료 여부 확인
3. **미완료:** "아직 이곳으로 갈 수 없습니다." 메시지 표시 (1.5초 후 사라짐)
4. **완료:** 카메라 페이드 아웃 (300ms) → `clearArea()` → `loadArea(nextAreaId)` → 페이드 인

### 5.3 지역 전환 처리 순서

```
clearArea()                    // 이전 맵·적·NPC·출구 제거
WorldScene.currentArea 갱신    // 세이브 탭 활성화 조건
새 맵 로드 (Tilemap)           // TMJ 파싱
오브젝트 레이어 파싱            // 적·NPC·보스·출구·시작점 스폰
카메라 바운드 재설정            // 새 맵 크기로
MenuOverlay 세이브 탭 상태 갱신 // 하벤이면 활성화
```

---

## 6. PreloadScene 수정 사항

AreaManager가 맵을 로드하려면 PreloadScene에서 사전 로드가 필요하다.

```ts
// PreloadScene.preload()에 추가
this.load.tilemapTiledJSON('map_haven',    'assets/maps/haven-village.tmj');
this.load.tilemapTiledJSON('map_forest',   'assets/maps/forest-dungeon.tmj');
this.load.tilemapTiledJSON('map_ruins',    'assets/maps/ancient-ruins.tmj');
this.load.tilemapTiledJSON('map_cavern',   'assets/maps/lava-cave.tmj');
this.load.tilemapTiledJSON('map_fortress', 'assets/maps/dark-castle.tmj');

// 타일셋 이미지 (맵에서 사용하는 것만)
this.load.image('dungeon_floor', 'assets/tilesets/dungeon/dungeon_floor.png');
this.load.image('dungeon_walls', 'assets/tilesets/dungeon/dungeon_walls.png');
// haven 마을용 타일셋은 맵 완성 시 추가
```

**AreaManager의 맵 키 규칙:** `'map_' + areaId.replace('scene_', '')`
예: `scene_forest` → `map_forest`

---

## 7. 구현 선행 조건

구현 시작 전 반드시 완료:
1. `design/` 디렉토리의 맵 파일 3개를 `web/public/assets/maps/`로 복사:
   - `ancient-ruins.tmj`, `lava-cave.tmj`, `dark-castle.tmj`
2. 하벤 마을 맵(`haven-village.tmj`) 미존재 → 임시로 `forest-dungeon.tmj`를 복사하여 사용, 추후 교체
3. 각 맵의 `objects` 레이어에 `enemy_spawn`, `npc_spawn`, `exit_zone`, `player_start` 오브젝트 배치 (game-planner 또는 designer 담당)

---

## 8. 지역별 맵 파일 경로

| 지역 ID | 맵 파일 |
|---------|--------|
| `scene_haven` | `assets/maps/haven-village.tmj` *(신규 제작 필요)* |
| `scene_forest` | `assets/maps/forest-dungeon.tmj` *(기존)* |
| `scene_ruins` | `assets/maps/ancient-ruins.tmj` *(design/에서 복사 필요)* |
| `scene_cavern` | `assets/maps/lava-cave.tmj` *(design/에서 복사 필요)* |
| `scene_fortress` | `assets/maps/dark-castle.tmj` *(design/에서 복사 필요)* |

> **haven-village.tmj 미존재:** 하벤 마을 맵은 game-planner 또는 designer가 Tiled로 제작 필요. 구현 시 임시로 forest-dungeon.tmj를 사용하고 마을 맵 완성 후 교체.

---

## 9. 성공 기준

1. `areaManager.loadArea('scene_haven')` 호출 시 Tiled 맵이 실제 렌더링됨
2. 맵 내 NPC가 스폰되고 플레이어 접근 시 상호작용 UI 표시
3. 출구 영역 접근 시 잠금 조건 확인 후 메시지 또는 전환 동작
4. 지역 전환 후 플레이어 위치가 새 맵 `player_start`로 이동
5. 보스 스폰 확인 (GoblinKing WorldScene에서 정상 동작)
6. `tsc --noEmit` 오류 없음, `vite build` 성공

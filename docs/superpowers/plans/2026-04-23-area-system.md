# 지역 시스템 (Area System) 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AreaManager 클래스로 5개 지역 맵 전환·NPC 스폰·보스 스폰·출구 잠금을 구현한다.

**Architecture:** WorldScene이 `AreaManager`에 지역 로딩을 위임한다. AreaManager는 Tiled 맵 파일을 로드하고 오브젝트 레이어를 파싱해 적·NPC·보스·출구를 스폰한다. 출구는 퀘스트 완료 여부를 확인해 잠금/해제한다.

**Tech Stack:** Phaser.js 3.x, TypeScript, Tiled Map Editor (TMJ/JSON)

**Spec:** `docs/superpowers/specs/2026-04-23-area-system-design.md`

---

## Chunk 1: 선행 조건 — 맵 파일 준비 + PreloadScene

### Task 1: 맵 파일 준비 (복사 + 오브젝트 수정)

**Files:**
- Modify: `web/public/assets/maps/forest-dungeon.tmj` (오브젝트 타입/이름 수정)
- Create: `web/public/assets/maps/haven-village.tmj` (신규)
- Copy: `design/tilesets/world/ancient-ruins.tmj` → `web/public/assets/maps/ancient-ruins.tmj`
- Copy: `design/tilesets/world/lava-cave.tmj` → `web/public/assets/maps/lava-cave.tmj`
- Copy: `design/tilesets/world/dark-castle.tmj` → `web/public/assets/maps/dark-castle.tmj`

- [ ] **Step 1: 맵 파일 3개 복사**

```bash
cp design/tilesets/world/ancient-ruins.tmj web/public/assets/maps/ancient-ruins.tmj
cp design/tilesets/world/lava-cave.tmj     web/public/assets/maps/lava-cave.tmj
cp design/tilesets/world/dark-castle.tmj   web/public/assets/maps/dark-castle.tmj
```

- [ ] **Step 2: forest-dungeon.tmj 오브젝트 레이어 수정**

현재 `forest-dungeon.tmj`의 Objects 레이어를 수정하는 Python 스크립트를 실행한다:

```bash
python3 << 'PYEOF'
import json

with open('web/public/assets/maps/forest-dungeon.tmj') as f:
    d = json.load(f)

obj_layer = next(l for l in d['layers'] if l['name'] == 'Objects')
objs = obj_layer['objects']

# player_spawn → player_start
for o in objs:
    if o['name'] == 'player_spawn':
        o['type'] = 'player_start'

# goblin_spawn_* → type=enemy_spawn, name=enemy_goblin
for o in objs:
    if o['type'] == 'enemy_spawn':
        o['name'] = 'enemy_goblin'

# exit_portal → type=exit_zone, name=scene_ruins (숲→유적, mq_04 잠금)
for o in objs:
    if o['name'] == 'exit_portal':
        o['type'] = 'exit_zone'
        o['name'] = 'scene_ruins'

# boss_goblin_king 스폰 추가 (맵 중앙 하단)
max_id = max(o['id'] for o in objs)
objs.append({
    'id': max_id + 1,
    'name': 'boss_goblin_king',
    'type': 'boss_spawn',
    'x': 640.0, 'y': 1100.0,
    'width': 32, 'height': 32,
    'visible': True, 'rotation': 0,
    'properties': []
})

with open('web/public/assets/maps/forest-dungeon.tmj', 'w') as f:
    json.dump(d, f, indent=2)

print('forest-dungeon.tmj 수정 완료')
PYEOF
```

예상 출력: `forest-dungeon.tmj 수정 완료`

- [ ] **Step 3: haven-village.tmj 생성**

하벤 마을 임시 맵을 생성한다 (forest-dungeon 타일셋 재사용, 마을 맵 완성 후 교체 예정):

```bash
python3 << 'PYEOF'
import json

haven = {
    "height": 25,
    "infinite": False,
    "layers": [
        {
            "data": [1] * (40 * 25),
            "height": 25, "width": 40,
            "id": 1, "name": "Ground",
            "opacity": 1, "type": "tilelayer",
            "visible": True, "x": 0, "y": 0
        },
        {
            "id": 2, "name": "Objects",
            "objects": [
                {"id": 1, "name": "player_start", "type": "player_start",
                 "x": 320.0, "y": 400.0, "width": 32, "height": 32,
                 "visible": True, "rotation": 0, "properties": []},
                {"id": 2, "name": "npc_elder", "type": "npc_spawn",
                 "x": 480.0, "y": 400.0, "width": 32, "height": 32,
                 "visible": True, "rotation": 0, "properties": []},
                {"id": 3, "name": "npc_blacksmith", "type": "npc_spawn",
                 "x": 640.0, "y": 350.0, "width": 32, "height": 32,
                 "visible": True, "rotation": 0, "properties": []},
                {"id": 4, "name": "npc_merchant", "type": "npc_spawn",
                 "x": 200.0, "y": 350.0, "width": 32, "height": 32,
                 "visible": True, "rotation": 0, "properties": []},
                {"id": 5, "name": "scene_forest", "type": "exit_zone",
                 "x": 1100.0, "y": 350.0, "width": 64, "height": 64,
                 "visible": True, "rotation": 0, "properties": []}
            ],
            "opacity": 1, "type": "objectgroup",
            "visible": True, "x": 0, "y": 0
        }
    ],
    "nextlayerid": 3, "nextobjectid": 6,
    "orientation": "orthogonal",
    "renderorder": "right-down",
    "tiledversion": "1.10.2",
    "tileheight": 32, "tilewidth": 32,
    "tilesets": [{
        "firstgid": 1,
        "name": "dungeon_floor",
        "image": "../tilesets/dungeon/dungeon_floor.png",
        "imageheight": 128, "imagewidth": 128,
        "tilewidth": 32, "tileheight": 32,
        "tilecount": 16, "columns": 4,
        "margin": 0, "spacing": 0
    }],
    "type": "map", "version": "1.10",
    "width": 40
}

with open('web/public/assets/maps/haven-village.tmj', 'w') as f:
    json.dump(haven, f, indent=2)

print('haven-village.tmj 생성 완료')
PYEOF
```

예상 출력: `haven-village.tmj 생성 완료`

- [ ] **Step 4: NPC 스프라이트 PreloadScene 로드 확인**

`web/public/assets/sprites/npc/npc_elder.png` 존재 확인:
```bash
ls web/public/assets/sprites/npc/ | grep elder
```
예상 출력: `npc_elder.png`

- [ ] **Step 5: 커밋**

```bash
git add web/public/assets/maps/
git commit -m "feat: [A-2] 지역 맵 파일 준비 (haven, forest 수정, ruins/cavern/fortress 복사)"
```

---

### Task 2: PreloadScene 맵 + NPC 스프라이트 로드 추가

**Files:**
- Modify: `web/src/scenes/PreloadScene.ts`

- [ ] **Step 1: PreloadScene 수정**

`web/src/scenes/PreloadScene.ts`의 `preload()` 메서드 끝에 추가:

```ts
    // NPC 스프라이트시트
    const nf = { frameWidth: 32, frameHeight: 32 };
    this.load.spritesheet('npc_elder',      'assets/sprites/npc/npc_elder.png',      nf);
    this.load.spritesheet('npc_blacksmith', 'assets/sprites/npc/npc_blacksmith.png', nf);
    this.load.spritesheet('npc_merchant',   'assets/sprites/npc/npc_merchant.png',   nf);

    // 보스 텍스처 (placeholder — BossBase.ensureAndGetTexture가 없을 때 fallback)
    // 보스는 각 Boss 클래스가 BossBase.ensureAndGetTexture로 생성하므로 별도 로드 불필요

    // Tiled 맵 파일
    this.load.tilemapTiledJSON('map_haven',    'assets/maps/haven-village.tmj');
    this.load.tilemapTiledJSON('map_forest',   'assets/maps/forest-dungeon.tmj');
    this.load.tilemapTiledJSON('map_ruins',    'assets/maps/ancient-ruins.tmj');
    this.load.tilemapTiledJSON('map_cavern',   'assets/maps/lava-cave.tmj');
    this.load.tilemapTiledJSON('map_fortress', 'assets/maps/dark-castle.tmj');
```

- [ ] **Step 2: tsc 확인**

```bash
cd web && npx tsc --noEmit
```

예상 출력: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add web/src/scenes/PreloadScene.ts
git commit -m "feat: [A-2] PreloadScene에 맵 5개 + NPC 스프라이트 로드 추가"
```

---

## Chunk 2: NPC 엔티티

### Task 3: NPC.ts 생성

**Files:**
- Create: `web/src/entities/NPC.ts`

- [ ] **Step 1: NPC.ts 구현**

`web/src/entities/NPC.ts` 파일을 생성한다:

```ts
import Phaser from 'phaser';

/**
 * NPC 엔티티
 * - 정적 스프라이트 (이동 없음)
 * - 플레이어 접근 시 말풍선 아이콘 표시
 * - 상호작용 준비 여부를 isInteractable 상태로 관리
 *
 * WorldScene에서 physics.add.overlap(player, npc) 감지 후
 * scene.events.emit('npc_interact_ready', npcId) 발행
 */
export class NPC extends Phaser.Physics.Arcade.Sprite {
  readonly npcId: string;

  private bubble!: Phaser.GameObjects.Text;
  private _interactable = false;

  constructor(scene: Phaser.Scene, x: number, y: number, npcId: string) {
    // npc_{npcId} 텍스처가 로드되어 있으면 사용, 없으면 placeholder 색상
    const textureKey = `npc_${npcId}`;
    const texture = scene.textures.exists(textureKey) ? textureKey : '__DEFAULT';

    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body — NPC는 이동하지 않음

    this.npcId = npcId;

    if (texture !== '__DEFAULT') {
      scene.anims.create({
        key: `${textureKey}_idle`,
        frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
      this.play(`${textureKey}_idle`);
    } else {
      // placeholder: 색상 사각형
      this.setTint(0xffcc44);
    }

    // 말풍선 아이콘 (상호작용 가능 표시)
    this.bubble = scene.add.text(x, y - 28, '💬', {
      fontSize: '14px',
    }).setOrigin(0.5).setDepth(15).setVisible(false);
  }

  showBubble(show: boolean): void {
    this._interactable = show;
    this.bubble.setVisible(show);
    this.bubble.setPosition(this.x, this.y - 28);
  }

  get isInteractable(): boolean {
    return this._interactable;
  }

  destroy(fromScene?: boolean): void {
    this.bubble?.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 2: tsc 확인**

```bash
cd web && npx tsc --noEmit
```

예상 출력: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add web/src/entities/NPC.ts
git commit -m "feat: [A-2] NPC 엔티티 구현 (말풍선 아이콘, 정적 바디)"
```

---

## Chunk 3: AreaManager 구현

### Task 4: AreaManager.ts 구현

**Files:**
- Create: `web/src/systems/AreaManager.ts`

**사전 지식:**
- `WorldScene.registerBoss(boss)`: 보스를 enemies[] + activeBosses[]에 추가하고 wall collider 설정
- `WorldScene.enemies: Enemy[]`: AreaManager가 직접 push해 WorldScene 루프에 포함시킴
- `WorldScene.activeCollisionLayer`: 신규 추가 프로퍼티 — 타일맵 충돌 레이어
- 맵 키 규칙: `'map_' + areaId.replace('scene_', '')` 예) `scene_forest` → `map_forest`

- [ ] **Step 1: AreaManager.ts 구현**

`web/src/systems/AreaManager.ts` 파일을 생성한다:

```ts
import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { Goblin } from '../entities/Goblin';
import { GoblinKing } from '../entities/GoblinKing';
import { Lich } from '../entities/Lich';
import { FireDragon } from '../entities/FireDragon';
import { DarkKnight } from '../entities/DarkKnight';
import { Balcor } from '../entities/Balcor';
import type { Enemy } from '../entities/Enemy';
import type { BossBase } from '../entities/BossBase';

// WorldScene의 최소 타입 정의 (순환 import 방지)
interface AreaScene extends Phaser.Scene {
  player: Phaser.Physics.Arcade.Sprite & { setPosition(x: number, y: number): void };
  enemies: Enemy[];
  activeBosses: BossBase[];
  walls: Phaser.Physics.Arcade.StaticGroup;
  currentArea: string;
  activeCollisionLayer: Phaser.Tilemaps.TilemapLayer | null;
  registerBoss(boss: BossBase): void;
}

/** 출구(exit_zone) 오브젝트를 잠금 해제에 필요한 퀘스트 ID와 매핑 */
const EXIT_UNLOCK: Record<string, string> = {
  scene_forest:   'mq_01',
  scene_ruins:    'mq_04',
  scene_cavern:   'mq_07',
  scene_fortress: 'mq_09',
};

/** 지역 ID → 맵 캐시 키 */
function mapKey(areaId: string): string {
  return 'map_' + areaId.replace('scene_', '');
}

export class AreaManager {
  private _currentAreaId = '';
  private map!: Phaser.Tilemaps.Tilemap;
  private npcs: NPC[] = [];
  private exitOverlaps: Phaser.Physics.Arcade.Collider[] = [];
  private msgText!: Phaser.GameObjects.Text;
  private nearNpcId: string | null = null;

  constructor(private scene: AreaScene) {
    // 잠금 메시지 텍스트 (카메라 고정)
    this.msgText = (scene as unknown as Phaser.Scene).add
      .text(480, 500, '', {
        fontSize: '14px', color: '#ffff00',
        stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);
  }

  get currentAreaId(): string { return this._currentAreaId; }
  get nearbyNpcId(): string | null { return this.nearNpcId; }

  // ── 지역 로드 ──────────────────────────────────────────────────────────

  loadArea(areaId: string): void {
    this.clearArea();
    this._currentAreaId = areaId;
    this.scene.currentArea = areaId;

    const key = mapKey(areaId);
    const s = this.scene as unknown as Phaser.Scene;
    if (!s.cache.tilemap.has(key)) {
      console.warn(`[AreaManager] 맵 캐시 없음: ${key} — forest 맵으로 대체`);
    }
    this.map = s.make.tilemap({ key: s.cache.tilemap.has(key) ? key : 'map_forest' });

    // 타일셋 연결
    const floorTs = this.map.addTilesetImage('dungeon_floor', 'dungeon_floor');
    const wallTs  = this.map.addTilesetImage('dungeon_walls', 'dungeon_walls');

    if (floorTs) this.map.createLayer('Ground', floorTs, 0, 0);

    // 충돌 레이어
    let collLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    if (wallTs && this.map.getLayer('Collision')) {
      collLayer = this.map.createLayer('Collision', wallTs, 0, 0)!;
      collLayer?.setCollisionByExclusion([-1]);
    }

    // WorldScene에 충돌 레이어 노출 (registerBoss 등이 활용)
    this.scene.activeCollisionLayer = collLayer;

    // 물리 + 카메라 바운드
    const pw = this.map.widthInPixels;
    const ph = this.map.heightInPixels;
    s.physics.world.setBounds(0, 0, pw, ph);
    s.cameras.main.setBounds(0, 0, pw, ph);

    // 플레이어 충돌
    if (collLayer) {
      s.physics.add.collider(this.scene.player, collLayer);
    }

    // 오브젝트 레이어 파싱
    this.map.getObjectLayer('Objects')?.objects.forEach(obj => {
      const x = obj.x ?? 100;
      const y = obj.y ?? 100;
      switch (obj.type) {
        case 'player_start': this.scene.player.setPosition(x, y); break;
        case 'enemy_spawn':  this.spawnEnemy(obj.name, x, y, collLayer); break;
        case 'boss_spawn':   this.spawnBoss(obj.name, x, y); break;
        case 'npc_spawn':    this.spawnNPC(obj.name, x, y); break;
        case 'exit_zone':    this.createExitZone(obj, collLayer); break;
      }
    });
  }

  // ── 지역 정리 ──────────────────────────────────────────────────────────

  clearArea(): void {
    // 타일맵
    this.map?.destroy();

    // NPC
    this.npcs.forEach(n => n.destroy());
    this.npcs = [];
    this.nearNpcId = null;

    // 출구 overlap
    const s = this.scene as unknown as Phaser.Scene;
    this.exitOverlaps.forEach(ov => s.physics.world.removeCollider(ov));
    this.exitOverlaps = [];

    // 적 (WorldScene.enemies 배열에서 제거 — 죽은 것 포함)
    this.scene.enemies.forEach(e => { if (e.active) e.destroy(); });
    this.scene.enemies.length = 0;
    this.scene.activeBosses.length = 0;

    // 충돌 레이어 초기화
    this.scene.activeCollisionLayer = null;
  }

  // ── 스폰 헬퍼 ─────────────────────────────────────────────────────────

  private spawnEnemy(
    enemyId: string,
    x: number, y: number,
    collLayer: Phaser.Tilemaps.TilemapLayer | null,
  ): void {
    const s = this.scene as unknown as Phaser.Scene;
    let enemy: Enemy | null = null;

    switch (enemyId) {
      case 'enemy_goblin': enemy = new Goblin(s, x, y); break;
      default:             enemy = new Goblin(s, x, y); break; // fallback
    }

    if (enemy) {
      if (collLayer) s.physics.add.collider(enemy, collLayer);
      this.scene.enemies.push(enemy);
    }
  }

  private spawnBoss(bossId: string, x: number, y: number): void {
    const s = this.scene as unknown as Phaser.Scene;
    let boss: BossBase | null = null;

    switch (bossId) {
      case 'boss_goblin_king': boss = new GoblinKing(s, x, y); break;
      case 'boss_lich':        boss = new Lich(s, x, y);       break;
      case 'boss_fire_drake':  boss = new FireDragon(s, x, y); break;
      case 'boss_dark_knight': boss = new DarkKnight(s, x, y); break;
      case 'boss_valcor':      boss = new Balcor(s, x, y);     break;
    }

    if (boss) this.scene.registerBoss(boss);
  }

  private spawnNPC(npcId: string, x: number, y: number): void {
    const s = this.scene as unknown as Phaser.Scene;
    const npc = new NPC(s, x, y, npcId);
    const player = this.scene.player;

    const ov = s.physics.add.overlap(
      player as unknown as Phaser.GameObjects.GameObject,
      npc as unknown as Phaser.GameObjects.GameObject,
      () => {
        npc.showBubble(true);
        this.nearNpcId = npcId;
        s.events.emit('npc_interact_ready', npcId);
      },
    );
    this.exitOverlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
    this.npcs.push(npc);
  }

  private createExitZone(
    obj: Phaser.Types.Tilemaps.TiledObject,
    _collLayer: Phaser.Tilemaps.TilemapLayer | null,
  ): void {
    const s = this.scene as unknown as Phaser.Scene;
    const nextAreaId = obj.name;
    const x = (obj.x ?? 0) + (obj.width ?? 64) / 2;
    const y = (obj.y ?? 0) + (obj.height ?? 64) / 2;
    const w = obj.width ?? 64;
    const h = obj.height ?? 64;

    const zone = s.add.zone(x, y, w, h);
    s.physics.world.enable(zone);
    (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // 출구 시각화 (반투명 초록)
    s.add.rectangle(x, y, w, h, 0x00ff00, 0.25).setDepth(1);

    const ov = s.physics.add.overlap(
      this.scene.player as unknown as Phaser.GameObjects.GameObject,
      zone,
      () => this.handleExitTouch(nextAreaId),
    );
    this.exitOverlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
  }

  private _transitioning = false;

  private handleExitTouch(nextAreaId: string): void {
    if (this._transitioning) return;

    const requiredQuest = EXIT_UNLOCK[nextAreaId];
    const s = this.scene as unknown as Phaser.Scene;

    if (requiredQuest) {
      // quest 시스템에 접근
      const questStatus = s.events.listenerCount('quest_status_check') > 0
        ? null  // 이벤트 방식 대신 WorldScene에서 직접 노출한 getQuestStatus 사용
        : null;

      // WorldScene이 'area_exit_request' 이벤트를 수신해 퀘스트 확인 처리
      s.events.emit('area_exit_request', nextAreaId, requiredQuest);
    } else {
      this.transitionToArea(nextAreaId);
    }
  }

  transitionToArea(nextAreaId: string): void {
    if (this._transitioning) return;
    this._transitioning = true;

    const s = this.scene as unknown as Phaser.Scene;
    s.cameras.main.fadeOut(300, 0, 0, 0);
    s.cameras.main.once('camerafadeoutcomplete', () => {
      this.loadArea(nextAreaId);
      s.cameras.main.fadeIn(300, 0, 0, 0);
      this._transitioning = false;
    });
  }

  showMessage(text: string): void {
    this.msgText.setText(text).setVisible(true);
    const s = this.scene as unknown as Phaser.Scene;
    s.time.delayedCall(1800, () => this.msgText.setVisible(false));
  }

  /** NPC 말풍선 숨김 (플레이어가 멀어졌을 때) */
  clearNpcBubbles(): void {
    this.npcs.forEach(n => n.showBubble(false));
    this.nearNpcId = null;
  }

  /** 플레이어 위치 기반 NPC 근접 체크 — update()에서 매 프레임 호출 */
  checkNpcProximity(playerX: number, playerY: number): boolean {
    const INTERACT_RANGE = 48;
    let anyNear = false;
    this.npcs.forEach(npc => {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, npc.x, npc.y);
      const near = dist <= INTERACT_RANGE;
      npc.showBubble(near);
      if (near) {
        this.nearNpcId = npc.npcId;
        anyNear = true;
      }
    });
    if (!anyNear) this.nearNpcId = null;
    return anyNear;
  }
}
```

- [ ] **Step 2: tsc 확인**

```bash
cd web && npx tsc --noEmit 2>&1
```

예상 출력: 오류 없음 (타입 캐스팅 경고 가능 — 실제 오류만 수정)

- [ ] **Step 3: 커밋**

```bash
git add web/src/systems/AreaManager.ts
git commit -m "feat: [A-2] AreaManager 구현 (맵 로딩, 적/NPC/보스/출구 스폰)"
```

---

## Chunk 4: WorldScene 연동

### Task 5: WorldScene에 AreaManager + DialogueSystem 연결

**Files:**
- Modify: `web/src/scenes/WorldScene.ts`

**변경 요약:**
1. `createPlaceholderMap()`, `spawnEnemies()`, `addWall()` 제거
2. `AreaManager`, `DialogueSystem` import 추가
3. `activeCollisionLayer`, `areaManager`, `dialogue` 프로퍼티 추가
4. `create()`: AreaManager 초기화 + `loadArea('scene_haven')`
5. `setupInput()`: Space 키 추가 (NPC 상호작용)
6. `setupQuestEventHandlers()`: `area_exit_request` + `npc_interact_ready` + dialogue 이벤트 추가
7. `update()`: NPC 말풍선 거리 체크

- [ ] **Step 1: WorldScene private → public 접근 제어자 변경**

AreaManager가 WorldScene 내부에 접근해야 하므로 다음 4개 필드를 `private` → 접근 가능하게 변경한다. `web/src/scenes/WorldScene.ts`에서:

```ts
// Before
private player!: Player;
private walls!: Phaser.Physics.Arcade.StaticGroup;
private enemies: Enemy[] = [];
private activeBosses: BossBase[] = [];

// After (private 제거)
player!: Player;
walls!: Phaser.Physics.Arcade.StaticGroup;
enemies: Enemy[] = [];
activeBosses: BossBase[] = [];
```

- [ ] **Step 2: import 추가**

`WorldScene.ts` 상단에 추가:
```ts
import { AreaManager } from '../systems/AreaManager';
import { DialogueSystem, DialogueDataMap } from '../systems/Dialogue';
```

- [ ] **Step 3: 클래스 프로퍼티 추가**

```ts
  // 지역 시스템
  areaManager!: AreaManager;
  activeCollisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private dialogue!: DialogueSystem;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
```

- [ ] **Step 3: create() 수정**

`create()` 메서드 내 `this.initSystems()` 바로 아래에 DialogueSystem 초기화를 추가하고, `createPlaceholderMap()`과 `spawnEnemies()` 호출을 `areaManager.loadArea()`로 교체:

```ts
  create(): void {
    this.projectiles = this.physics.add.group();
    this.walls = this.physics.add.staticGroup(); // AreaManager clearArea()가 참조
    this.initSystems();

    // DialogueSystem 초기화
    const dialogueData = this.cache.json.get('dialogues') as DialogueDataMap;
    this.dialogue = new DialogueSystem(dialogueData ?? {});
    this.setupDialogueUI();

    this.createAnimations();
    this.createProjectileTexture();

    // AreaManager 초기화 (맵 로딩 전 player 스폰 필요)
    this.spawnPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupUI();
    this.setupBossEventHandlers();
    this.setupQuestEventHandlers();

    // AreaManager로 맵 로드 (placeholder 대체)
    this.areaManager = new AreaManager(this as any);
    this.areaManager.loadArea('scene_haven');

    this.playtimeStart = this.time.now;
    this.menuOverlay = new MenuOverlay(
      this,
      this.inventory,
      this.quest,
      this.saveManager,
      () => this.buildSaveData(),
    );
  }
```

- [ ] **Step 4: spawnPlayer() 수정**

`spawnPlayer()`에서 `this.walls` collider를 AreaManager와 공존하도록 수정:

```ts
  private spawnPlayer(): void {
    // 맵 중앙에 임시 스폰 (AreaManager.loadArea()가 player_start 위치로 이동시킴)
    this.player = new Player(this, 320, 400);
    // 충돌은 AreaManager가 loadArea() 시 tilemap 레이어로 추가
  }
```

- [ ] **Step 6: createPlaceholderMap, spawnEnemies, addWall 삭제 + setupCamera 수정**

`WorldScene.ts`에서 다음 메서드를 완전히 제거한다:
- `private createPlaceholderMap(): void { ... }`
- `private spawnEnemies(): void { ... }`
- `private addWall(x, y, w, h): void { ... }`
- 파일 상단의 `MAP_COLS`, `MAP_ROWS` 상수도 제거

`setupCamera()`는 삭제된 MAP_COLS/MAP_ROWS 상수를 참조하므로 수정한다:

```ts
private setupCamera(): void {
  // 초기 바운드는 AreaManager.loadArea()가 맵 크기에 맞게 재설정한다
  // 임시값으로 큰 값을 설정
  this.cameras.main.setBounds(0, 0, 2000, 2000);
  this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  this.cameras.main.setZoom(2);
}
```

- [ ] **Step 6: setupInput()에 Space 키 추가**

`setupInput()` 내 기존 코드 아래에 추가:

```ts
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
```

- [ ] **Step 7: setupQuestEventHandlers()에 지역/NPC/대화 이벤트 추가**

`setupQuestEventHandlers()` 메서드 내에 추가:

```ts
    // 출구 요청 → 퀘스트 확인 후 전환 또는 잠금 메시지
    this.events.on('area_exit_request', (nextAreaId: string, requiredQuest: string) => {
      if (this.quest.getStatus(requiredQuest) === 'completed') {
        this.areaManager.transitionToArea(nextAreaId);
      } else {
        this.areaManager.showMessage('아직 이곳으로 갈 수 없습니다.');
      }
    });

    // NPC 상호작용 준비 (말풍선 표시됨)
    this.events.on('npc_interact_ready', (_npcId: string) => {
      // Space 키는 update()에서 처리
    });
```

- [ ] **Step 8: update()에 NPC 거리 체크 + Space 키 처리 추가**

`update()` 메서드의 `this.updateUI()` 호출 아래에 추가:

```ts
    // NPC 말풍선 거리 기반 표시/숨김 (실제 거리 체크)
    if (this.areaManager) {
      const npcNearby = this.areaManager.checkNpcProximity(this.player.x, this.player.y);
      if (!npcNearby) {
        this.areaManager.clearNpcBubbles();
      }
    }

    // Space 키: NPC 대화 또는 다음 대사
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.dialogue.isPlaying()) {
        this.dialogue.next();
      } else if (this.areaManager?.nearbyNpcId) {
        this.dialogue.start(this.areaManager.nearbyNpcId);
      }
    }
```

- [ ] **Step 9: setupDialogueUI() 추가**

WorldScene에 새 private 메서드 추가:

```ts
  private setupDialogueUI(): void {
    const s = (obj: Phaser.GameObjects.GameObject) =>
      (obj as any).setScrollFactor(0);

    // 배경 패널 (화면 하단 20%)
    const bg = this.add.rectangle(480, 485, 920, 130, 0x111122, 0.9)
      .setOrigin(0.5).setDepth(30);
    s(bg);

    // 화자 이름
    const nameText = this.add.text(40, 430, '', {
      fontSize: '13px', color: '#f1c40f', fontStyle: 'bold',
    }).setDepth(31);
    s(nameText);

    // 대사 텍스트
    this.dialogueText = this.add.text(40, 452, '', {
      fontSize: '12px', color: '#eee',
      wordWrap: { width: 880 },
    }).setDepth(31) as Phaser.GameObjects.Text;
    s(this.dialogueText);

    // 안내 텍스트
    const hintText = this.add.text(880, 530, '[SPACE] 다음', {
      fontSize: '10px', color: '#666',
    }).setDepth(31);
    s(hintText);

    // 컨테이너로 묶어 visibility 제어
    this.dialogueBox = this.add.container(0, 0, [bg, nameText, this.dialogueText, hintText]);
    (this.dialogueBox as any).setScrollFactor(0);
    this.dialogueBox.setDepth(30).setVisible(false);

    // DialogueSystem 이벤트 연결
    this.dialogue.on('dialogue_start', () => {
      this.dialogueBox.setVisible(true);
      this.scene.pause();  // 대화 중 게임 일시정지
    });

    this.dialogue.on('dialogue_line', (line: { speaker: string; text: string }) => {
      nameText.setText(line.speaker);
      this.dialogueText.setText(line.text);
    });

    this.dialogue.on('dialogue_end', () => {
      this.dialogueBox.setVisible(false);
      this.scene.resume();
      // 대화 완료 → QuestSystem 트리거
      if (this.areaManager?.nearbyNpcId) {
        this.quest.onTalkedToNpc(this.areaManager.nearbyNpcId);
      }
      this.areaManager?.clearNpcBubbles();
    });
  }
```

- [ ] **Step 10: registerBoss() 수정 — activeCollisionLayer 활용**

기존 `registerBoss()`를 수정:

```ts
  registerBoss(boss: BossBase): void {
    if (this.activeCollisionLayer) {
      this.physics.add.collider(boss, this.activeCollisionLayer);
    }
    this.enemies.push(boss);
    this.activeBosses.push(boss);
  }
```

- [ ] **Step 11: boss_summon 핸들러 activeCollisionLayer 적용**

WorldScene의 `setupBossEventHandlers()` 내 `boss_summon` 핸들러를 수정한다 — 소환 적도 tilemap 충돌 레이어와 연결:

```ts
    this.events.on('boss_summon', (type: string, x: number, y: number) => {
      let enemy: Enemy | null = null;
      if (type === 'goblin') enemy = new Goblin(this, x, y);
      if (type === 'skeleton') enemy = new Goblin(this, x, y); // fallback
      if (enemy) {
        if (this.activeCollisionLayer) {
          this.physics.add.collider(enemy, this.activeCollisionLayer);
        }
        this.enemies.push(enemy);
      }
    });
```

- [ ] **Step 13: tsc + 테스트**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
npm test
```

예상 출력:
- tsc: 오류 없음 (또는 minor 타입 오류 수정)
- 테스트: 기존 테스트 모두 통과

- [ ] **Step 12: vite build 확인**

```bash
cd web && npm run build 2>&1 | tail -10
```

예상 출력: 빌드 성공

- [ ] **Step 14: vite build 확인**

```bash
cd web && npm run build 2>&1 | tail -10
```

예상 출력: 빌드 성공

- [ ] **Step 15: 커밋**

```bash
git add web/src/scenes/WorldScene.ts
git commit -m "feat: [A-2] WorldScene — AreaManager 연동, DialogueSystem 연결, Space 키, 출구 잠금"
```

---

### Task 6: 최종 검증 + 보드 업데이트

- [ ] **Step 1: 브라우저 수동 체크리스트**

`npm run dev` 후 http://localhost:5173 에서 확인:

```
[ ] 게임 시작 시 하벤 마을 맵(타일) 렌더링됨
[ ] 플레이어가 장로 에릭 NPC에 접근 시 💬 표시
[ ] Space 키 → 대화창 표시, 다시 Space → 다음 대사, 종료 시 창 닫힘
[ ] 우측 출구 접근 시 "아직 이곳으로 갈 수 없습니다." 메시지 표시 (mq_01 미완료)
[ ] mq_01 퀘스트 완료 후 출구 → 숲 맵으로 전환됨
[ ] 숲 맵에서 고블린 5마리 스폰 확인
[ ] 고블린 왕 보스 스폰 확인 (맵 내 boss_goblin_king 위치)
[ ] I키 메뉴 → 세이브 탭: 하벤 마을이면 활성화, 다른 지역이면 비활성
[ ] vite build 성공
```

- [ ] **Step 2: GitHub Project 보드 업데이트**

완료된 카드 Done 처리:
```bash
# WorldScene 지역 맵 미연결
gh project item-edit --project-id PVT_kwHOABN2es4BVOnj \
  --id PVTI_lAHOABN2es4BVOnjzgqrDzM \
  --field-id PVTSSF_lAHOABN2es4BVOnjzhQr4a4 \
  --single-select-option-id ef4eb1bd

# NPC 대화 시스템 WorldScene 미연결
gh project item-edit --project-id PVT_kwHOABN2es4BVOnj \
  --id PVTI_lAHOABN2es4BVOnjzgqrD0s \
  --field-id PVTSSF_lAHOABN2es4BVOnjzhQr4a4 \
  --single-select-option-id ef4eb1bd

# 보스 5종 WorldScene 미스폰
gh project item-edit --project-id PVT_kwHOABN2es4BVOnj \
  --id PVTI_lAHOABN2es4BVOnjzgqrENU \
  --field-id PVTSSF_lAHOABN2es4BVOnjzhQr4a4 \
  --single-select-option-id ef4eb1bd

# 다중 지역 맵 전환 구현
gh project item-edit --project-id PVT_kwHOABN2es4BVOnj \
  --id PVTI_lAHOABN2es4BVOnjzgqpfQg \
  --field-id PVTSSF_lAHOABN2es4BVOnjzhQr4a4 \
  --single-select-option-id ef4eb1bd

# NPC 스폰 및 WorldScene 연결
gh project item-edit --project-id PVT_kwHOABN2es4BVOnj \
  --id PVTI_lAHOABN2es4BVOnjzgqrEX0 \
  --field-id PVTSSF_lAHOABN2es4BVOnjzhQr4a4 \
  --single-select-option-id ef4eb1bd
```

- [ ] **Step 3: team-lead에게 완료 보고**

`to: "team-lead"`로 SendMessage:
- 수동 체크리스트 통과 항목
- vite build 결과
- 미해결 이슈 별도 보고

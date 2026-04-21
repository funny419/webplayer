# design/ 폴더 가이드

디자인 에셋 원본 보관 폴더입니다.

## 폴더 구조

```
design/
├── sprites/
│   ├── player/      # 플레이어 스프라이트시트
│   ├── enemies/     # 적 스프라이트시트
│   ├── npc/         # NPC 스프라이트
│   └── effects/     # 전투/환경 이펙트
├── ui/
│   ├── hud/         # HP/MP 바, 미니맵 등
│   ├── menus/       # 인벤토리, 퀘스트, 대화창
│   └── icons/       # 아이템, 퀘스트 마커 아이콘
├── concepts/        # 컨셉 아트, 레이아웃 스케치
└── tilesets/
    ├── town/        # 마을 타일셋
    ├── world/       # 야외 필드 타일셋
    └── dungeon/     # 던전 타일셋
```

## Placeholder 에셋 규격 (M2용)

현재 모든 `📦 Placeholder` 파일은 단색 사각형 PNG입니다.

### 스프라이트시트 포맷

| 에셋 | 전체 크기 | 프레임 수 | 프레임 크기 |
|------|-----------|-----------|-------------|
| player_walk_* | 128×32 | 4 | 32×32 |
| player_idle | 64×32 | 2 | 32×32 |
| player_attack_melee | 128×32 | 4 | 32×32 |
| player_attack_ranged | 128×32 | 4 | 32×32 |
| player_dash | 96×32 | 3 | 32×32 |
| player_hurt | 64×32 | 2 | 32×32 |
| player_death | 128×32 | 4 | 32×32 |
| goblin_walk_* | 128×32 | 4 | 32×32 |
| goblin_attack | 128×32 | 4 | 32×32 |
| goblin_death | 96×32 | 3 | 32×32 |
| slime_walk | 128×32 | 4 | 32×32 |
| slime_death | 128×32 | 4 | 32×32 |

### 타일셋 포맷

| 에셋 | 전체 크기 | 타일 크기 | 타일 수 |
|------|-----------|-----------|---------|
| dungeon_floor | 128×128 | 32×32 | 4×4=16 |
| dungeon_walls | 128×128 | 32×32 | 4×4=16 |
| dungeon_props | 128×96 | 32×32 | 4×3=12 |

## Phaser.js 로딩 방법 (web-dev 참고)

### 스프라이트시트 로드 (PreloadScene)

```typescript
// 스프라이트시트: (key, path, { frameWidth, frameHeight })
this.load.spritesheet('player_walk_down',
  'assets/sprites/player/player_walk_down.png',
  { frameWidth: 32, frameHeight: 32 }
);
this.load.spritesheet('goblin_walk_down',
  'assets/sprites/enemies/goblin_walk_down.png',
  { frameWidth: 32, frameHeight: 32 }
);
```

### 애니메이션 생성 (WorldScene 또는 AnimationsPlugin)

```typescript
// 플레이어 걷기 애니메이션 (4프레임, 반복)
this.anims.create({
  key: 'player-walk-down',
  frames: this.anims.generateFrameNumbers('player_walk_down', { start: 0, end: 3 }),
  frameRate: 8,
  repeat: -1
});

// 공격 (4프레임, 1회)
this.anims.create({
  key: 'player-attack-melee',
  frames: this.anims.generateFrameNumbers('player_attack_melee', { start: 0, end: 3 }),
  frameRate: 12,
  repeat: 0
});
```

### 타일셋 로드 (Tiled 맵과 연동)

```typescript
// PreloadScene — 맵 및 타일셋 로드
this.load.tilemapTiledJSON('forest-dungeon', 'assets/maps/forest-dungeon.tmj');
this.load.image('dungeon_floor', 'assets/tilesets/dungeon/dungeon_floor.png');
this.load.image('dungeon_walls', 'assets/tilesets/dungeon/dungeon_walls.png');

// DungeonScene create() — 타일맵 생성
const map = this.make.tilemap({ key: 'forest-dungeon' });
const floorTiles = map.addTilesetImage('dungeon_floor', 'dungeon_floor');
const wallTiles  = map.addTilesetImage('dungeon_walls', 'dungeon_walls');

const groundLayer    = map.createLayer('Ground',    floorTiles);
const collisionLayer = map.createLayer('Collision', wallTiles);
collisionLayer.setCollisionByExclusion([-1]); // 비어있지 않은 모든 타일 충돌
collisionLayer.setAlpha(0);                   // 충돌 레이어는 숨김 (개발 중엔 1로)

// Objects 레이어에서 스폰 포인트 읽기
const objectLayer = map.getObjectLayer('Objects');
objectLayer.objects.forEach((obj) => {
  if (obj.type === 'spawn') {
    // 플레이어 스폰: obj.x, obj.y (픽셀 단위)
    this.player = new Player(this, obj.x, obj.y);
  } else if (obj.type === 'enemy_spawn') {
    const enemyType = obj.properties?.find(p => p.name === 'enemy_type')?.value;
    const patrolGroup = obj.properties?.find(p => p.name === 'patrol_group')?.value;
    // 같은 patrol_group의 waypoint 오브젝트들 찾아서 전달
    const waypoints = objectLayer.objects
      .filter(o => o.type === 'waypoint' &&
                   o.properties?.find(p => p.name === 'patrol_group')?.value === patrolGroup)
      .map(o => ({ x: o.x, y: o.y }));
    this.enemies.add(new Goblin(this, obj.x, obj.y, waypoints));
  } else if (obj.type === 'portal') {
    const dest = obj.properties?.find(p => p.name === 'destination')?.value;
    this.portals.add(new Portal(this, obj.x, obj.y, obj.width, obj.height, dest));
  }
});
```

### 맵 레이아웃 (forest-dungeon.tmj)

```
y\x  0    5    10   15   20   25   30   35  39
 0:  WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
 1:  W....Room A (spawn)..W....Room B...........W
 4:  W...P................W.........G2..........W  (P=플레이어)
 6:  W..........G1........W....WWWWWWWWWWWWWWWWW  (G=고블린)
 8:  W....WWWWWWWWWW......D....W................W
14:  WWWWWWWWWWDDWWWWWWWWWWWWWWWWWWWWWDDWWWWWWW
15:  W....Room C..........W....Room D...........W
17:  W..G3................W.................G4...W
20:  W....WWWWWWWWWWWWW..D....WWWWWWWWWWWWWWW..W
27:  WWWWWWWWWWWWWWWWWWWWDDWWWWWWWWWWWWWWWWWWWW
28:  W....Room E..........W....Room F..........W
33:  W.WWWWWWWWWW.WWWWWWWWW....G5.......W......W
35:  W....G(E)....W.......W...........Portal.W..W
39:  WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
     D = 통로(문), P = 플레이어 스폰 (3,4), Portal = (35,35)
```

## 에셋 배치 규칙

- `design/` 폴더는 **원본 에셋 보관** 용도
- 실제 게임에 사용되는 에셋은 `web/src/assets/` 또는 `web/public/assets/`에 복사
- M2~M4: placeholder 에셋 사용, M5 이후 실제 픽셀 아트로 교체
- 에셋 교체 시 key 이름은 유지 (코드 변경 최소화)

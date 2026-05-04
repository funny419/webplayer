import Phaser from 'phaser';
import { NPC } from '../entities/NPC';
import { Goblin } from '../entities/Goblin';
import { GenericEnemy } from '../entities/GenericEnemy';
import { GoblinKing } from '../entities/GoblinKing';
import { Lich } from '../entities/Lich';
import { FireDragon } from '../entities/FireDragon';
import { DarkKnight } from '../entities/DarkKnight';
import { Balcor } from '../entities/Balcor';
import type { Enemy, EnemyStats } from '../entities/Enemy';
import type { BossBase } from '../entities/BossBase';

/** 각 적 ID별 스탯 및 placeholder tint 색상 (balance.json 기준) */
type EnemyConfig = { stats: EnemyStats; tint: number };
const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  enemy_goblin:            { stats: { hp: 30,  attackDamage: 8,  detectRange: 150, attackRange: 40, moveSpeed: 80,  attackCooldown: 1200, def: 3  }, tint: 0xffffff },
  enemy_goblin_archer:     { stats: { hp: 20,  attackDamage: 12, detectRange: 200, attackRange: 180,moveSpeed: 60,  attackCooldown: 1800, def: 2,  isRanged: true }, tint: 0xaaddaa },
  enemy_wolf:              { stats: { hp: 25,  attackDamage: 10, detectRange: 180, attackRange: 35, moveSpeed: 120, attackCooldown: 1000, def: 2  }, tint: 0x888866 },
  enemy_spider:            { stats: { hp: 15,  attackDamage: 6,  detectRange: 120, attackRange: 30, moveSpeed: 70,  attackCooldown: 1500, def: 1  }, tint: 0x442200 },
  enemy_zombie:            { stats: { hp: 60,  attackDamage: 12, detectRange: 100, attackRange: 40, moveSpeed: 50,  attackCooldown: 2000, def: 5  }, tint: 0x44aa44 },
  enemy_skeleton:          { stats: { hp: 35,  attackDamage: 15, detectRange: 150, attackRange: 45, moveSpeed: 75,  attackCooldown: 1300, def: 8  }, tint: 0xdddddd },
  enemy_skeleton_archer:   { stats: { hp: 25,  attackDamage: 18, detectRange: 220, attackRange: 200,moveSpeed: 55,  attackCooldown: 2000, def: 4,  isRanged: true }, tint: 0xaaaaaa },
  enemy_dark_mage:         { stats: { hp: 40,  attackDamage: 22, detectRange: 200, attackRange: 180,moveSpeed: 60,  attackCooldown: 2500, def: 5,  isRanged: true }, tint: 0x4422aa },
  enemy_bat:               { stats: { hp: 20,  attackDamage: 8,  detectRange: 160, attackRange: 30, moveSpeed: 140, attackCooldown: 800,  def: 0  }, tint: 0x662266 },
  enemy_fire_slime:        { stats: { hp: 45,  attackDamage: 18, detectRange: 120, attackRange: 35, moveSpeed: 55,  attackCooldown: 1600, def: 6  }, tint: 0xff4400 },
  enemy_gargoyle:          { stats: { hp: 55,  attackDamage: 20, detectRange: 180, attackRange: 40, moveSpeed: 90,  attackCooldown: 1400, def: 10 }, tint: 0x888899 },
  enemy_lava_golem:        { stats: { hp: 100, attackDamage: 25, detectRange: 140, attackRange: 50, moveSpeed: 45,  attackCooldown: 2200, def: 15 }, tint: 0xff2200 },
  enemy_orc:               { stats: { hp: 80,  attackDamage: 22, detectRange: 140, attackRange: 45, moveSpeed: 65,  attackCooldown: 1500, def: 12 }, tint: 0x226622 },
  enemy_troll:             { stats: { hp: 120, attackDamage: 28, detectRange: 120, attackRange: 55, moveSpeed: 40,  attackCooldown: 2500, def: 18 }, tint: 0x885500 },
  enemy_dark_knight_grunt: { stats: { hp: 90,  attackDamage: 30, detectRange: 160, attackRange: 45, moveSpeed: 70,  attackCooldown: 1300, def: 20 }, tint: 0x224488 },
};

// WorldScene의 최소 타입 정의 (순환 import 방지)
export interface AreaScene extends Phaser.Scene {
  player: Phaser.Physics.Arcade.Sprite;
  enemies: Enemy[];
  activeBosses: BossBase[];
  walls: Phaser.Physics.Arcade.StaticGroup;
  currentArea: string;
  activeCollisionLayer: Phaser.Tilemaps.TilemapLayer | null;
  registerBoss(boss: BossBase): void;
  isHeartPieceCollected(id: string): boolean;
}

/** 출구(exit_zone) 잠금 해제에 필요한 퀘스트 ID 매핑 */
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
  private overlaps: Phaser.Physics.Arcade.Collider[] = [];
  private heartVisuals: Phaser.GameObjects.GameObject[] = [];
  private msgText!: Phaser.GameObjects.Text;
  private nearNpcId: string | null = null;
  private _transitioning = false;

  constructor(private scene: AreaScene) {
    // 잠금 메시지 텍스트 (카메라 고정)
    this.msgText = (scene as unknown as Phaser.Scene).add
      .text(480, 490, '', {
        fontSize: '14px',
        color: '#ffff00',
        stroke: '#000000',
        strokeThickness: 3,
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

    // 타일셋 연결 (맵에 있는 타일셋 이름으로 자동 선택)
    const floorTs = this.map.addTilesetImage('dungeon_floor', 'dungeon_floor')
                 ?? this.map.addTilesetImage('town_ground', 'town_ground');
    const wallTs  = this.map.addTilesetImage('dungeon_walls', 'dungeon_walls');
    const groundLayer = floorTs ? this.map.createLayer('Ground', floorTs, 0, 0) : null;
    if (groundLayer) groundLayer.setDepth(-1); // 플레이어(depth 0) 아래에 렌더링

    // 충돌 레이어
    let collLayer: Phaser.Tilemaps.TilemapLayer | null = null;
    if (wallTs && this.map.getLayer('Collision')) {
      collLayer = this.map.createLayer('Collision', wallTs, 0, 0)!;
      collLayer?.setCollisionByExclusion([-1]);
    }

    // WorldScene에 충돌 레이어 노출
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
        case 'exit_zone':    this.createExitZone(obj); break;
        case 'gate':         this.emitGate(obj, s); break;
        case 'heart_piece':  this.spawnHeartPiece(obj); break;
      }
    });

    s.events.emit('area_loaded', areaId);
  }

  // ── 지역 정리 ──────────────────────────────────────────────────────────

  clearArea(): void {
    this.map?.destroy();

    this.npcs.forEach(n => n.destroy());
    this.npcs = [];
    this.nearNpcId = null;

    this.heartVisuals.forEach(v => { if ((v as Phaser.GameObjects.GameObject).active) v.destroy(); });
    this.heartVisuals = [];

    const s = this.scene as unknown as Phaser.Scene;
    this.overlaps.forEach(ov => s.physics.world.removeCollider(ov));
    this.overlaps = [];

    this.scene.enemies.forEach(e => { if (e.active) e.destroy(); });
    this.scene.enemies.length = 0;
    this.scene.activeBosses.length = 0;
    this.scene.activeCollisionLayer = null;
  }

  // ── 스폰 헬퍼 ─────────────────────────────────────────────────────────

  private spawnEnemy(
    enemyId: string,
    x: number, y: number,
    collLayer: Phaser.Tilemaps.TilemapLayer | null,
  ): void {
    const s = this.scene as unknown as Phaser.Scene;
    // TMJ name에서 _숫자 suffix 제거 ('enemy_skeleton_1' → 'enemy_skeleton')
    const baseId = enemyId.replace(/_\d+$/, '');

    let enemy: Enemy;
    if (baseId === 'enemy_goblin') {
      enemy = new Goblin(s, x, y);
    } else {
      const config = ENEMY_CONFIGS[baseId];
      if (!config) {
        console.warn(`[AreaManager] 알 수 없는 적 ID: ${baseId}`);
        return;
      }
      enemy = new GenericEnemy(s, x, y, baseId, config.stats, config.tint);
    }
    if (collLayer) s.physics.add.collider(enemy, collLayer);
    this.scene.enemies.push(enemy);
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
      default: console.warn(`[AreaManager] 알 수 없는 보스 ID: ${bossId}`);
    }

    if (boss) this.scene.registerBoss(boss);
  }

  private spawnNPC(npcId: string, x: number, y: number): void {
    const s = this.scene as unknown as Phaser.Scene;
    const npc = new NPC(s, x, y, npcId);

    const ov = s.physics.add.overlap(
      this.scene.player as unknown as Phaser.GameObjects.GameObject,
      npc as unknown as Phaser.GameObjects.GameObject,
      () => {
        // 근접 감지는 checkNpcProximity()로 처리
      },
    );
    this.overlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
    this.npcs.push(npc);
  }

  private spawnHeartPiece(obj: Phaser.Types.Tilemaps.TiledObject): void {
    const pieceId = obj.name;
    if (this.scene.isHeartPieceCollected(pieceId)) return;

    const s = this.scene as unknown as Phaser.Scene;
    const w = Math.max(obj.width ?? 16, 24);
    const h = Math.max(obj.height ?? 16, 24);
    const x = (obj.x ?? 0) + (obj.width ?? 16) / 2;
    const y = (obj.y ?? 0) + (obj.height ?? 16) / 2;

    const visual = s.add.text(x, y, '💗', { fontSize: '14px' }).setOrigin(0.5).setDepth(5);
    this.heartVisuals.push(visual);

    const zone = s.add.zone(x, y, w, h);
    s.physics.world.enable(zone);
    (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.heartVisuals.push(zone);

    const ov = s.physics.add.overlap(
      this.scene.player as unknown as Phaser.GameObjects.GameObject,
      zone,
      () => {
        if (!visual.active) return;
        visual.destroy();
        s.events.emit('heart_piece_found', pieceId);
      },
    );
    this.overlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
  }

  private emitGate(obj: Phaser.Types.Tilemaps.TiledObject, s: Phaser.Scene): void {
    const requires = obj.properties?.find((p: { name: string }) => p.name === 'requires')?.value as string | undefined;
    if (!requires) return;
    s.events.emit('gate_found', {
      gateId:   obj.name,
      requires,
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      w: obj.width  ?? 64,
      h: obj.height ?? 32,
    });
  }

  private createExitZone(obj: Phaser.Types.Tilemaps.TiledObject): void {
    const s = this.scene as unknown as Phaser.Scene;
    const nextAreaId = obj.name;
    const w = obj.width ?? 64;
    const h = obj.height ?? 64;
    const x = (obj.x ?? 0) + w / 2;
    const y = (obj.y ?? 0) + h / 2;

    const zone = s.add.zone(x, y, w, h);
    s.physics.world.enable(zone);
    (zone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // 출구 시각화
    s.add.rectangle(x, y, w, h, 0x00ff00, 0.3).setDepth(1);

    const ov = s.physics.add.overlap(
      this.scene.player as unknown as Phaser.GameObjects.GameObject,
      zone,
      () => this.handleExitTouch(nextAreaId),
    );
    this.overlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
  }

  private handleExitTouch(nextAreaId: string): void {
    if (this._transitioning) return;
    const s = this.scene as unknown as Phaser.Scene;
    const requiredQuest = EXIT_UNLOCK[nextAreaId];

    if (requiredQuest) {
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
    const s = this.scene as unknown as Phaser.Scene;
    this.msgText.setText(text).setVisible(true);
    s.time.delayedCall(1800, () => this.msgText.setVisible(false));
  }

  /** 말풍선 숨김 */
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

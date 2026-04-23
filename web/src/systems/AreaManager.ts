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
export interface AreaScene extends Phaser.Scene {
  player: Phaser.Physics.Arcade.Sprite;
  enemies: Enemy[];
  activeBosses: BossBase[];
  walls: Phaser.Physics.Arcade.StaticGroup;
  currentArea: string;
  activeCollisionLayer: Phaser.Tilemaps.TilemapLayer | null;
  registerBoss(boss: BossBase): void;
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
      }
    });
  }

  // ── 지역 정리 ──────────────────────────────────────────────────────────

  clearArea(): void {
    this.map?.destroy();

    this.npcs.forEach(n => n.destroy());
    this.npcs = [];
    this.nearNpcId = null;

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
    // 현재 구현된 적은 Goblin뿐 — 향후 적 추가 시 switch 확장
    const enemy: Enemy = new Goblin(s, x, y);
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
        s.events.emit('npc_interact_ready', npcId);
      },
    );
    this.overlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
    this.npcs.push(npc);
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

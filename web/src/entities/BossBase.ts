import Phaser from 'phaser';
import { Enemy, EnemyStats } from './Enemy';

/**
 * 보스 공통 기반 클래스.
 * - 화면 하단 보스 HP바 (Graphics)
 * - 발사체 그룹 (WorldScene에서 플레이어 overlap 등록 필요)
 * - onDeath: HP바 정리 + 키 아이템 drop 이벤트 발행
 *
 * 씬 이벤트 (WorldScene에서 수신):
 *   boss_key_item(itemId)              — 처치 후 키 아이템 지급
 *   boss_summon(type, x, y)            — 소환 요청
 *   boss_melee_hit(x, y, dmg, range)   — 근접 범위 데미지
 *   boss_aoe_hit(x, y, dmg, range)     — 광역 원형 데미지
 *   boss_cone_hit(x, y, angle, halfAngle, range, dmg) — 원뿔형 브레스
 *   boss_zone(x, y, dmg, range, dur)   — 지속 장판 (초당 dmg)
 *   boss_shield_on(boss)               — 방어막 활성
 *   boss_shield_off(boss)              — 방어막 해제
 *   boss_rage(boss)                    — 분노 모드 진입
 */
export abstract class BossBase extends Enemy {
  readonly projectiles: Phaser.Physics.Arcade.Group;
  protected isCharging = false;

  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    enemyId: string,
    stats: EnemyStats,
    protected readonly keyItemId: string | null,
  ) {
    super(scene, x, y, texture, enemyId, stats);
    this.projectiles = scene.physics.add.group();
    this.ensureProjTexture();
    this.createHpBar();
  }

  /**
   * super() 인자로 호출 가능한 static 헬퍼.
   * 텍스처가 없으면 단색 32×32 placeholder를 생성 후 key를 반환.
   */
  protected static ensureAndGetTexture(
    scene: Phaser.Scene,
    key: string,
    color: number,
  ): string {
    if (!scene.textures.exists(key)) {
      const g = scene.add.graphics();
      g.fillStyle(color);
      g.fillRect(0, 0, 32, 32);
      g.generateTexture(key, 32, 32);
      g.destroy();
    }
    return key;
  }

  private ensureProjTexture(): void {
    if (this.scene.textures.exists('boss_proj')) return;
    const g = this.scene.add.graphics();
    g.fillStyle(0xaa00ff);
    g.fillCircle(5, 5, 5);
    g.generateTexture('boss_proj', 10, 10);
    g.destroy();
  }

  private createHpBar(): void {
    const cx = this.scene.scale.width / 2;
    const cy = 20; // 화면 상단 중앙
    this.hpBarBg = this.scene.add
      .rectangle(cx, cy, 200, 14, 0x222222)
      .setScrollFactor(0)
      .setDepth(20);
    this.hpBarFill = this.scene.add
      .rectangle(cx - 100, cy, 200, 12, 0xff2222)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(21);
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);
    if (this.hpBarFill?.active) {
      this.hpBarFill.width = 200 * (this.hp / this.maxHp);
    }
  }

  updateAI(playerX: number, playerY: number, delta: number): void {
    if (this.isDead) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    // 돌진 중에는 이동 velocity를 덮어쓰지 않음
    if (!this.isCharging) {
      if (dist > this.attackRange && dist <= this.detectRange) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
        this.setVelocity(
          Math.cos(angle) * this.moveSpeed,
          Math.sin(angle) * this.moveSpeed,
        );
      } else {
        this.setVelocity(0, 0);
      }
    }
    this.runPatterns(delta, dist, playerX, playerY);
  }

  protected fireProjectile(vx: number, vy: number): void {
    const proj = this.projectiles.create(
      this.x,
      this.y,
      'boss_proj',
    ) as Phaser.Physics.Arcade.Image;
    if (proj) proj.setVelocity(vx, vy);
  }

  protected onDeath(): void {
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    this.projectiles.destroy(true);
    if (this.keyItemId) {
      this.scene.events.emit('boss_key_item', this.keyItemId);
    }
    this.onBossDeath();
  }

  // 하위 클래스 구현 필수
  protected abstract runPatterns(
    delta: number,
    dist: number,
    px: number,
    py: number,
  ): void;
  protected abstract onBossDeath(): void;

  // 패턴은 updateAI → runPatterns에서 처리하므로 빈 구현
  protected onAttackRange(): void {}
  protected onChase(_px: number, _py: number): void {}
  protected onIdle(): void {}
}

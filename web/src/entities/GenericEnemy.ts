import Phaser from 'phaser';
import { Enemy, EnemyStats } from './Enemy';

/**
 * 전용 스프라이트가 없는 적에 사용하는 범용 구현체.
 * 고블린 스프라이트에 tint 색상을 적용해 적을 시각적으로 구분한다.
 */
export class GenericEnemy extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyId: string,
    stats: EnemyStats,
    tint = 0xffffff,
  ) {
    super(scene, x, y, 'goblin_walk_down', enemyId, stats);
    if (tint !== 0xffffff) this.setTint(tint);
    this.onIdle();
  }

  protected onDeath(): void {
    this.play('goblin-death');
    this.scene.time.delayedCall(500, () => { if (this.active) this.destroy(); });
  }

  protected onAttackRange(): void {
    if (this.anims.currentAnim?.key !== 'goblin-attack') this.play('goblin-attack');
  }

  protected onChase(playerX: number, playerY: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const key = Math.abs(dx) >= Math.abs(dy)
      ? (dx > 0 ? 'goblin-walk-right' : 'goblin-walk-left')
      : (dy > 0 ? 'goblin-walk-down' : 'goblin-walk-up');
    if (this.anims.currentAnim?.key !== key) this.play(key);
  }

  protected onIdle(): void {
    if (this.anims.currentAnim?.key !== 'goblin-idle') this.play('goblin-idle');
  }
}

import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Goblin extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'goblin_walk_down', {
      hp: 30,
      attackDamage: 10,
      detectRange: 160,
      attackRange: 36,
      moveSpeed: 80,
      attackCooldown: 1500,
    });
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

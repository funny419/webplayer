import Phaser from 'phaser';
import { BossBase } from './BossBase';

/** 고블린 왕 (boss_goblin_king) — 어둠의 숲 보스
 *  패턴1: 3연타 콤보 (쿨다운 2초, 공격 범위 내)
 *  패턴2: 고블린 2마리 소환 (쿨다운 15초, HP 50% 이하)
 *  처치 시: key_compass 드롭
 */
export class GoblinKing extends BossBase {
  private comboTimer = 0;
  private summonTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene, x, y,
      BossBase.ensureAndGetTexture(scene, 'boss_goblin_king', 0x8B4513),
      {
        hp: 300,
        attackDamage: 20,
        detectRange: 300,
        attackRange: 50,
        moveSpeed: 70,
        attackCooldown: 2000,
      },
      'key_compass',
    );
  }

  protected runPatterns(delta: number, dist: number, _px: number, _py: number): void {
    this.comboTimer = Math.max(0, this.comboTimer - delta);
    this.summonTimer = Math.max(0, this.summonTimer - delta);

    // 패턴1: 3연타 콤보 (공격 범위 내)
    if (dist <= this.attackRange && this.comboTimer === 0) {
      this.doComboSlash();
      this.comboTimer = 2000;
    }

    // 패턴2: 고블린 소환 (HP 50% 이하, 쿨다운 15초)
    if (this.hp / this.maxHp <= 0.5 && this.summonTimer === 0) {
      this.doSummon();
      this.summonTimer = 15000;
    }
  }

  private doComboSlash(): void {
    [0, 300, 600].forEach(delay => {
      this.scene.time.delayedCall(delay, () => {
        if (!this.isDead) {
          this.scene.events.emit(
            'boss_melee_hit',
            this.x, this.y,
            this.attackDamage * 0.8,
            this.attackRange + 10,
          );
        }
      });
    });
  }

  private doSummon(): void {
    this.scene.events.emit('boss_summon', 'goblin', this.x - 48, this.y);
    this.scene.events.emit('boss_summon', 'goblin', this.x + 48, this.y);
  }

  protected onBossDeath(): void {
    this.setTint(0x444444);
    this.scene.time.delayedCall(600, () => { if (this.active) this.destroy(); });
  }
}

import Phaser from 'phaser';
import { BossBase } from './BossBase';

/** 어둠의 기사 (boss_dark_knight) — 마왕의 성 중간 보스
 *  패턴1: 방패 막기 2초 (쿨다운 6초) — 정면 피해 무효
 *  패턴2: 강력한 내리치기 ATK×1.5 (쿨다운 3초, 방어 중 비활성)
 *  패턴3: 회전 베기 반경 180px (쿨다운 8초)
 *  드롭 없음
 */
export class DarkKnight extends BossBase {
  private shieldTimer = 6000;     // 처음 방패는 6초 후
  private heavyStrikeTimer = 0;
  private spinSlashTimer = 8000;  // 처음 회전 베기는 8초 후
  private isBlocking = false;
  private blockDuration = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene, x, y,
      BossBase.ensureAndGetTexture(scene, 'boss_dark_knight', 0x222244),
      'boss_dark_knight',
      {
        hp: 500,
        attackDamage: 45,
        detectRange: 350,
        attackRange: 55,
        moveSpeed: 85,
        attackCooldown: 3000,
      },
      null,
    );
  }

  protected runPatterns(
    delta: number,
    dist: number,
    _px: number,
    _py: number,
  ): void {
    this.shieldTimer      = Math.max(0, this.shieldTimer - delta);
    this.heavyStrikeTimer = Math.max(0, this.heavyStrikeTimer - delta);
    this.spinSlashTimer   = Math.max(0, this.spinSlashTimer - delta);

    // 방어막 지속 처리
    if (this.isBlocking) {
      this.blockDuration -= delta;
      if (this.blockDuration <= 0) {
        this.isBlocking = false;
        this.clearTint();
        this.scene.events.emit('boss_shield_off', this);
      }
    }

    // 패턴1: 방패 막기
    if (!this.isBlocking && this.shieldTimer === 0) {
      this.doShieldBlock();
      this.shieldTimer = 6000;
    }

    // 패턴2: 강타 (방어 중이 아닐 때, 공격 범위 내)
    if (!this.isBlocking && dist <= this.attackRange && this.heavyStrikeTimer === 0) {
      this.doHeavyStrike();
      this.heavyStrikeTimer = 3000;
    }

    // 패턴3: 회전 베기
    if (this.spinSlashTimer === 0) {
      this.doSpinSlash();
      this.spinSlashTimer = 8000;
    }
  }

  private doShieldBlock(): void {
    this.isBlocking = true;
    this.blockDuration = 2000;
    this.setTint(0x8888ff);
    this.scene.events.emit('boss_shield_on', this);
  }

  private doHeavyStrike(): void {
    // ATK×1.5, 넉백 포함
    this.scene.events.emit(
      'boss_melee_hit',
      this.x, this.y,
      this.attackDamage * 1.5,
      this.attackRange + 10,
      true,  // knockback
    );
  }

  private doSpinSlash(): void {
    // 주위 180px 원형, ATK×1.1
    this.scene.events.emit(
      'boss_aoe_hit',
      this.x, this.y,
      this.attackDamage * 1.1,
      180,
    );
  }

  protected onBossDeath(): void {
    this.setTint(0x444444);
    this.scene.time.delayedCall(600, () => { if (this.active) this.destroy(); });
  }
}

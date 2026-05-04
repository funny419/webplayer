import Phaser from 'phaser';
import { BossBase } from './BossBase';

/** 화염 드래곤 (boss_fire_drake) — 용암 동굴 보스
 *  패턴1: 화염 브레스 (전방 90도 부채꼴 240px, 쿨다운 3초)
 *  패턴2: 직선 돌진 300ms (쿨다운 5초)
 *  패턴3: 화염구 장판 3개 (쿨다운 8초, HP 40% 이하)
 *  처치 시: key_flameshield 드롭
 */
export class FireDragon extends BossBase {
  private breathTimer = 0;
  private chargePatternTimer = 5000;  // 처음 돌진은 5초 후
  private fireballTimer = 0;
  private chargeDuration = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene, x, y,
      BossBase.ensureAndGetTexture(scene, 'boss_fire_drake', 0xff4400),
      'boss_fire_drake',
      {
        hp: 600,
        attackDamage: 40,
        detectRange: 400,
        attackRange: 60,
        moveSpeed: 80,
        attackCooldown: 3000,
        def: 0,
      },
      'key_flameshield',
    );
  }

  protected runPatterns(delta: number, dist: number, px: number, py: number): void {
    this.breathTimer        = Math.max(0, this.breathTimer - delta);
    this.chargePatternTimer = Math.max(0, this.chargePatternTimer - delta);
    this.fireballTimer      = Math.max(0, this.fireballTimer - delta);

    // 돌진 지속 처리
    if (this.isCharging) {
      this.chargeDuration -= delta;
      if (this.chargeDuration <= 0) {
        this.isCharging = false;
        this.setVelocity(0, 0);
        this.scene.events.emit('boss_melee_hit', this.x, this.y, this.attackDamage, 80);
      }
      return; // 돌진 중에는 다른 패턴 스킵
    }

    // 패턴1: 화염 브레스 (공격 범위 내)
    if (dist <= this.attackRange && this.breathTimer === 0) {
      this.doFlameBreath(px, py);
      this.breathTimer = 3000;
    }

    // 패턴2: 돌진
    if (this.chargePatternTimer === 0) {
      this.doCharge(px, py);
      this.chargePatternTimer = 5000;
    }

    // 패턴3: 화염구 장판 (HP 40% 이하)
    if (this.hp / this.maxHp <= 0.4 && this.fireballTimer === 0) {
      this.doFireballExplosion(px, py);
      this.fireballTimer = 8000;
    }
  }

  private doFlameBreath(px: number, py: number): void {
    // 전방 90도 부채꼴 240px AoE
    const angle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
    this.scene.events.emit(
      'boss_cone_hit',
      this.x, this.y,
      angle,
      Math.PI / 2,  // halfAngle: 90도
      240,
      this.attackDamage * 1.2,
    );
  }

  private doCharge(px: number, py: number): void {
    this.isCharging = true;
    this.chargeDuration = 300;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
    this.setVelocity(
      Math.cos(angle) * this.moveSpeed * 6,
      Math.sin(angle) * this.moveSpeed * 6,
    );
  }

  private doFireballExplosion(px: number, py: number): void {
    // 플레이어 주변 3곳에 반경 60px 화염구 장판 (3초)
    const offsets: [number, number][] = [[0, 0], [-60, 40], [60, 40]];
    offsets.forEach(([ox, oy]) => {
      this.scene.events.emit(
        'boss_zone',
        px + ox, py + oy,
        this.attackDamage * 0.5,
        60,
        3000,
      );
    });
  }

  protected onBossDeath(): void {
    this.setTint(0x444444);
    this.scene.time.delayedCall(600, () => { if (this.active) this.destroy(); });
  }
}

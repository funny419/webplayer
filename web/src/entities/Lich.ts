import Phaser from 'phaser';
import { BossBase } from './BossBase';

const PROJ_SPEED = 180;

/** 리치 (boss_lich) — 고대 유적 보스
 *  패턴1: 마법탄 3발 방사 (쿨다운 2.5초, 공격 범위 내)
 *  패턴2: 스켈레톤 2마리 소환 (쿨다운 12초)
 *  패턴3: 저주 장판 (쿨다운 10초, HP 30% 이하)
 *  처치 시: key_hookshot 드롭
 */
export class Lich extends BossBase {
  private magicBurstTimer = 0;
  private summonTimer = 12000;  // 처음 소환은 12초 후
  private curseZoneTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene, x, y,
      BossBase.ensureAndGetTexture(scene, 'boss_lich', 0x6600cc),
      'boss_lich',
      {
        hp: 400,
        attackDamage: 30,
        detectRange: 350,
        attackRange: 220,
        moveSpeed: 50,
        attackCooldown: 2500,
        def: 0,
      },
      'key_hookshot',
    );
  }

  protected runPatterns(delta: number, dist: number, px: number, py: number): void {
    this.magicBurstTimer = Math.max(0, this.magicBurstTimer - delta);
    this.summonTimer     = Math.max(0, this.summonTimer - delta);
    this.curseZoneTimer  = Math.max(0, this.curseZoneTimer - delta);

    // 패턴1: 마법탄 3방향 (공격 범위 내)
    if (dist <= this.attackRange && this.magicBurstTimer === 0) {
      this.doMagicBurst(px, py);
      this.magicBurstTimer = 2500;
    }

    // 패턴2: 스켈레톤 소환
    if (this.summonTimer === 0) {
      this.doSummon();
      this.summonTimer = 12000;
    }

    // 패턴3: 저주 장판 (HP 30% 이하)
    if (this.hp / this.maxHp <= 0.3 && this.curseZoneTimer === 0) {
      this.doCurseZone(px, py);
      this.curseZoneTimer = 10000;
    }
  }

  private doMagicBurst(px: number, py: number): void {
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach(offset => {
      const a = baseAngle + offset;
      this.fireProjectile(Math.cos(a) * PROJ_SPEED, Math.sin(a) * PROJ_SPEED);
    });
  }

  private doSummon(): void {
    this.scene.events.emit('boss_summon', 'skeleton', this.x - 48, this.y);
    this.scene.events.emit('boss_summon', 'skeleton', this.x + 48, this.y);
  }

  private doCurseZone(px: number, py: number): void {
    // 플레이어 위치 중심, 반경 80px, 3초 지속, 초당 ATK*30% 데미지
    this.scene.events.emit(
      'boss_zone',
      px, py,
      this.attackDamage * 0.3,
      80,
      3000,
    );
  }

  protected onBossDeath(): void {
    this.setTint(0x444444);
    this.scene.time.delayedCall(600, () => { if (this.active) this.destroy(); });
  }
}

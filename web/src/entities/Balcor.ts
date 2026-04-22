import Phaser from 'phaser';
import { BossBase } from './BossBase';

const PROJ_SPEED = 200;

/** 마왕 발코르 (boss_valcor) — 최종 보스
 *  패턴1: 암흑 마법탄 4방향 십자형 (쿨다운 1.8초)
 *  패턴2: 다크 나이트 2마리 소환 (쿨다운 20초)
 *  패턴3: 암흑 장판 (쿨다운 12초)
 *  패턴4: 분노 모드 (HP 25% 이하, 1회성) — 모든 패턴 속도 1.5배, ATK+15
 *  드롭 없음 (mq_11 완료로 처리)
 */
export class Balcor extends BossBase {
  private darkShotTimer = 0;
  private summonTimer = 20000;   // 처음 소환은 20초 후
  private darkZoneTimer = 12000; // 처음 장판은 12초 후
  private rageActive = false;
  private rageAtk = 0;           // 분노 모드 추가 ATK

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(
      scene, x, y,
      BossBase.ensureAndGetTexture(scene, 'boss_valcor', 0x1a0033),
      'boss_valcor',
      {
        hp: 1000,
        attackDamage: 55,
        detectRange: 500,
        attackRange: 200,
        moveSpeed: 90,
        attackCooldown: 1800,
      },
      null,
    );
  }

  protected runPatterns(delta: number, dist: number, px: number, py: number): void {
    // 분노 모드 진입 체크 (1회성)
    if (!this.rageActive && this.hp / this.maxHp <= 0.25) {
      this.activateRage();
    }

    // 분노 시 쿨다운을 2/3으로 단축 (속도 1.5배)
    const cdMul = this.rageActive ? 2 / 3 : 1;

    this.darkShotTimer = Math.max(0, this.darkShotTimer - delta);
    this.summonTimer   = Math.max(0, this.summonTimer - delta);
    this.darkZoneTimer = Math.max(0, this.darkZoneTimer - delta);

    // 패턴1: 암흑 마법탄 4방향 (공격 범위 내)
    if (dist <= this.attackRange && this.darkShotTimer === 0) {
      this.doDarkShot();
      this.darkShotTimer = Math.round(1800 * cdMul);
    }

    // 패턴2: 다크 나이트 소환
    if (this.summonTimer === 0) {
      this.doSummon();
      this.summonTimer = Math.round(20000 * cdMul);
    }

    // 패턴3: 암흑 장판
    if (this.darkZoneTimer === 0) {
      this.doDarkZone(px, py);
      this.darkZoneTimer = Math.round(12000 * cdMul);
    }
  }

  private activateRage(): void {
    this.rageActive = true;
    this.rageAtk = 15;
    this.setTint(0xff4444);
    this.scene.events.emit('boss_rage', this);
  }

  private doDarkShot(): void {
    const dmg = this.attackDamage * 0.8 + this.rageAtk;
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach(angle => {
      const proj = this.projectiles.create(
        this.x, this.y, 'boss_proj',
      ) as Phaser.Physics.Arcade.Image & { bossDmg: number };
      if (proj) {
        proj.bossDmg = dmg;
        proj.setVelocity(Math.cos(angle) * PROJ_SPEED, Math.sin(angle) * PROJ_SPEED);
      }
    });
  }

  private doSummon(): void {
    this.scene.events.emit('boss_summon', 'dark_knight', this.x - 64, this.y);
    this.scene.events.emit('boss_summon', 'dark_knight', this.x + 64, this.y);
  }

  private doDarkZone(px: number, py: number): void {
    // 화면 1/3 범위, 4초 지속, 초당 ATK*40% 데미지
    const range = this.scene.scale.width / 3;
    this.scene.events.emit(
      'boss_zone',
      px, py,
      (this.attackDamage + this.rageAtk) * 0.4,
      range,
      4000,
    );
  }

  protected onBossDeath(): void {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(800, () => { if (this.active) this.destroy(); });
  }
}

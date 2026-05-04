import type { Player } from '../entities/Player';

const TICK_INTERVAL = 1000; // 1초마다 틱 데미지

export class StatusEffectSystem {
  private poisoned = false;
  private poisonTimeRemaining = 0; // ms
  private poisonDps = 0;
  private tickAccumulator = 0;

  get isPoisoned(): boolean { return this.poisoned; }

  constructor(private readonly player: Player) {}

  /**
   * 독 상태 적용. 이미 중독 중이면 지속 시간만 초기화.
   * @param duration ms 단위 지속 시간
   * @param dps 초당 HP 피해
   */
  applyPoison(duration: number, dps: number): void {
    this.poisoned = true;
    this.poisonTimeRemaining = duration;
    this.poisonDps = dps;
    this.tickAccumulator = 0;
  }

  /** 해독제 사용 시 즉시 해제 */
  clearPoison(): void {
    this.poisoned = false;
    this.poisonTimeRemaining = 0;
    this.tickAccumulator = 0;
  }

  /**
   * 매 프레임 호출. 틱 피해 처리 및 만료 감지.
   * @returns true면 이번 프레임에 틱 데미지가 발생함
   */
  update(delta: number): boolean {
    if (!this.poisoned) return false;

    this.poisonTimeRemaining -= delta;
    if (this.poisonTimeRemaining <= 0) {
      this.clearPoison();
      return false;
    }

    this.tickAccumulator += delta;
    if (this.tickAccumulator >= TICK_INTERVAL) {
      this.tickAccumulator -= TICK_INTERVAL;
      if (!this.player.isDead) {
        this.player.takeDamage(Math.round(this.poisonDps));
      }
      return true;
    }
    return false;
  }
}

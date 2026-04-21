import Phaser from 'phaser';

export interface EnemyStats {
  hp: number;
  attackDamage: number;
  detectRange: number;
  attackRange: number;
  moveSpeed: number;
  attackCooldown: number;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  readonly maxHp: number;
  readonly attackDamage: number;
  readonly detectRange: number;
  readonly attackRange: number;
  readonly moveSpeed: number;

  private _isDead = false;
  private readonly _attackCooldown: number;
  private attackCooldownRemaining = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    stats: EnemyStats,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.attackDamage = stats.attackDamage;
    this.detectRange = stats.detectRange;
    this.attackRange = stats.attackRange;
    this.moveSpeed = stats.moveSpeed;
    this._attackCooldown = stats.attackCooldown;

    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
  }

  get isDead(): boolean { return this._isDead; }
  get canAttack(): boolean { return this.attackCooldownRemaining === 0 && !this._isDead; }

  takeDamage(amount: number): void {
    if (this._isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => { if (!this._isDead) this.clearTint(); });
    if (this.hp === 0) this.die();
  }

  triggerAttackCooldown(): void {
    this.attackCooldownRemaining = this._attackCooldown;
  }

  updateAI(playerX: number, playerY: number, delta: number): void {
    if (this._isDead) return;

    this.attackCooldownRemaining = Math.max(0, this.attackCooldownRemaining - delta);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist <= this.attackRange) {
      this.setVelocity(0, 0);
      this.onAttackRange();
    } else if (dist <= this.detectRange) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY);
      this.setVelocity(Math.cos(angle) * this.moveSpeed, Math.sin(angle) * this.moveSpeed);
      this.onChase(playerX, playerY);
    } else {
      this.setVelocity(0, 0);
      this.onIdle();
    }
  }

  private die(): void {
    this._isDead = true;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.clearTint();
    this.onDeath();
  }

  protected abstract onDeath(): void;
  protected abstract onAttackRange(): void;
  protected abstract onChase(playerX: number, playerY: number): void;
  protected abstract onIdle(): void;
}

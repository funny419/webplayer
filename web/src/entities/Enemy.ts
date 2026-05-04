import Phaser from 'phaser';

export interface EnemyStats {
  hp: number;
  attackDamage: number;
  detectRange: number;
  attackRange: number;
  moveSpeed: number;
  attackCooldown: number;
  def: number;
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly enemyId: string;
  hp: number;
  readonly maxHp: number;
  readonly attackDamage: number;
  readonly detectRange: number;
  readonly attackRange: number;
  readonly moveSpeed: number;
  readonly def: number;

  private _isDead = false;
  private readonly _attackCooldown: number;
  private attackCooldownRemaining = 0;
  private _enemyHpBg!: Phaser.GameObjects.Rectangle;
  private _enemyHpFill!: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    enemyId: string,
    stats: EnemyStats,
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.enemyId = enemyId;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.attackDamage = stats.attackDamage;
    this.detectRange = stats.detectRange;
    this.attackRange = stats.attackRange;
    this.moveSpeed = stats.moveSpeed;
    this._attackCooldown = stats.attackCooldown;
    this.def = stats.def;

    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
    this._createEnemyHpBar();
  }

  private _createEnemyHpBar(): void {
    this._enemyHpBg   = this.scene.add.rectangle(0, 0, 28, 4, 0x333333).setDepth(10);
    this._enemyHpFill = this.scene.add.rectangle(0, 0, 28, 4, 0xff3344).setOrigin(0, 0.5).setDepth(11);
  }

  private _updateEnemyHpBar(): void {
    const bx = this.x - 14;
    const by = this.y - 22;
    this._enemyHpBg.setPosition(this.x, by);
    this._enemyHpFill.setPosition(bx, by);
    this._enemyHpFill.width = 28 * (this.hp / this.maxHp);
  }

  get isDead(): boolean { return this._isDead; }
  get canAttack(): boolean { return this.attackCooldownRemaining === 0 && !this._isDead; }

  takeDamage(amount: number): void {
    if (this._isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => { if (!this._isDead) this.clearTint(); });
    this._updateEnemyHpBar();
    if (this.hp === 0) this.die();
  }

  triggerAttackCooldown(): void {
    this.attackCooldownRemaining = this._attackCooldown;
  }

  updateAI(playerX: number, playerY: number, delta: number): void {
    if (this._isDead) return;
    this._updateEnemyHpBar();

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
    this._enemyHpBg.destroy();
    this._enemyHpFill.destroy();
    this.scene.events.emit('enemy_killed', this.enemyId, this.x, this.y);
    this.onDeath();
  }

  protected abstract onDeath(): void;
  protected abstract onAttackRange(): void;
  protected abstract onChase(playerX: number, playerY: number): void;
  protected abstract onIdle(): void;
}

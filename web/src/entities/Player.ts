import Phaser from 'phaser';


// 레벨별 다음 레벨까지 필요 EXP (index 0 = Lv1→2, ..., index 18 = Lv19→20)
const EXP_THRESHOLDS = [71, 130, 200, 280, 371, 471, 580, 698, 825, 961, 1104, 1255, 1413, 1579, 1752, 1931, 2117, 2309, 2507];
const DASH_SPEED = 600;
const DASH_DURATION = 180;
const DASH_COOLDOWN = 1500;
const DASH_INVINCIBLE = DASH_DURATION + 50;
const HURT_INVINCIBLE = 1000;
const MP_REGEN_INTERVAL = 200; // ms per +1 MP

type Dir4 = 'down' | 'up' | 'left' | 'right';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Stats
  hp = 100;
  maxHp = 100;
  heartPieces = 0;
  mp = 50;
  maxMp = 50;
  level = 1;
  exp = 0;
  atk = 15;
  def = 10;
  gold = 0;
  private _expToNextLevel: number | null = EXP_THRESHOLDS[0];

  // State
  private _isDead = false;
  private _isDashing = false;
  private _isAttacking = false;
  private isInvincible = false;
  private dashCooldownRemaining = 0;
  private _facing: Dir4 = 'down';
  private mpRegenAccum = 0;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private dashKey!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(20, 20);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.dashKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.play('player-idle');
  }

  get isDead(): boolean { return this._isDead; }
  get isDashing(): boolean { return this._isDashing; }
  get isAttacking(): boolean { return this._isAttacking; }
  get facing(): Dir4 { return this._facing; }
  get dashReady(): boolean { return this.dashCooldownRemaining === 0 && !this._isDashing; }
  get canBeHit(): boolean { return !this.isInvincible && !this._isDead; }
  get expToNextLevel(): number | null { return this._expToNextLevel; }
  get moveSpeed(): number { return Math.round(150 + (this.level - 1) * (70 / 19)); }

  gainExp(amount: number): void {
    if (this.level >= 20 || this._expToNextLevel === null) return;
    this.exp += amount;
    while (this._expToNextLevel !== null && this.exp >= this._expToNextLevel) {
      this.exp -= this._expToNextLevel;
      this._levelUp();
    }
  }

  private _levelUp(): void {
    this.level += 1;
    this.maxHp += 15;
    this.maxMp += 5;
    this.atk += 3;
    this.def += 2;
    this.hp = Math.min(this.hp + 15, this.maxHp);
    this.mp = Math.min(this.mp + 5, this.maxMp);
    this._expToNextLevel = this.level < 20 ? (EXP_THRESHOLDS[this.level - 1] ?? null) : null;
    this.scene.events.emit('player_levelup', this.level);
  }

  update(delta: number): void {
    if (this._isDead) return;

    // MP 자동 회복
    this.mpRegenAccum += delta;
    if (this.mpRegenAccum >= MP_REGEN_INTERVAL) {
      this.mp = Math.min(this.maxMp, this.mp + 1);
      this.mpRegenAccum -= MP_REGEN_INTERVAL;
    }

    this.dashCooldownRemaining = Math.max(0, this.dashCooldownRemaining - delta);
    if (this._isDashing || this._isAttacking) return;

    const dx = this.getAxisX();
    const dy = this.getAxisY();

    if (Phaser.Input.Keyboard.JustDown(this.dashKey) && this.dashCooldownRemaining === 0) {
      this.startDash(dx, dy);
      return;
    }

    if (dx !== 0 || dy !== 0) {
      this._facing = this.toDir4(dx, dy);
      const len = Math.sqrt(dx * dx + dy * dy);
      this.setVelocity((dx / len) * this.moveSpeed, (dy / len) * this.moveSpeed);
      this.playWalkAnim();
    } else {
      this.setVelocity(0, 0);
      this.playIdleAnim();
    }
  }

  takeDamage(amount: number): void {
    if (this._isDead || this.isInvincible) return;
    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;
    this.setTint(0xff4444);
    this.scene.time.delayedCall(HURT_INVINCIBLE, () => {
      if (!this._isDead) {
        this.clearTint();
        this.isInvincible = false;
      }
    });
    if (this.hp === 0) this.die();
  }

  collectHeartPiece(): void {
    this.heartPieces++;
    if (this.heartPieces % 4 === 0) {
      this.maxHp += 100;
      this.hp = Math.min(this.hp + 100, this.maxHp);
      this.scene.events.emit('max_hp_up');
    }
    this.scene.events.emit('heart_piece_collected', this.heartPieces);
  }

  /** 세이브 로드 시 레벨·스탯 직접 복원 (레벨업 누적 없이) */
  restoreStats(level: number, exp: number, atk: number, def: number, maxMp: number): void {
    this.level = level;
    this.exp = exp;
    this.atk = atk;
    this.def = def;
    this.maxMp = maxMp;
    this._expToNextLevel = this.level < 20 ? (EXP_THRESHOLDS[this.level - 1] ?? null) : null;
  }

  spendMp(amount: number): boolean {
    if (this.mp < amount) return false;
    this.mp -= amount;
    return true;
  }

  playMeleeAnim(): void {
    this._isAttacking = true;
    this.play('player-attack-melee');
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this._isAttacking = false;
      this.playIdleAnim();
    });
  }

  playRangedAnim(): void {
    this._isAttacking = true;
    this.play('player-attack-ranged');
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this._isAttacking = false;
      this.playIdleAnim();
    });
  }

  private die(): void {
    this._isDead = true;
    this._isDashing = false;
    this._isAttacking = false;
    this.setVelocity(0, 0);
    this.clearTint();
    this.isInvincible = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.play('player-death');
  }

  private startDash(dx: number, dy: number): void {
    const dirX = dx || (this._facing === 'right' ? 1 : this._facing === 'left' ? -1 : 0);
    const dirY = dy || (this._facing === 'down' ? 1 : this._facing === 'up' ? -1 : 0);
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

    this._isDashing = true;
    this.isInvincible = true;
    this.setVelocity((dirX / len) * DASH_SPEED, (dirY / len) * DASH_SPEED);
    this.play('player-dash');

    this.scene.time.delayedCall(DASH_DURATION, () => {
      this._isDashing = false;
      this.setVelocity(0, 0);
      this.dashCooldownRemaining = DASH_COOLDOWN;
    });
    this.scene.time.delayedCall(DASH_INVINCIBLE, () => {
      if (!this._isDead) this.isInvincible = false;
    });
  }

  private getAxisX(): number {
    return (this.cursors.right.isDown || this.wasd.right.isDown) ? 1
      : (this.cursors.left.isDown || this.wasd.left.isDown) ? -1 : 0;
  }

  private getAxisY(): number {
    return (this.cursors.down.isDown || this.wasd.down.isDown) ? 1
      : (this.cursors.up.isDown || this.wasd.up.isDown) ? -1 : 0;
  }

  private toDir4(dx: number, dy: number): Dir4 {
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  private playWalkAnim(): void {
    const key = `player-walk-${this._facing}`;
    if (this.anims.currentAnim?.key !== key) this.play(key);
  }

  private playIdleAnim(): void {
    if (this.anims.currentAnim?.key !== 'player-idle') this.play('player-idle');
  }
}

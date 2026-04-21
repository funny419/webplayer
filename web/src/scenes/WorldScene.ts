import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Goblin } from '../entities/Goblin';

const TILE = 32;
const MAP_COLS = 30;
const MAP_ROWS = 17;

const MELEE_DAMAGE = 20;
const MELEE_REACH = 28;   // player center → hitbox center (px)
const MELEE_RANGE = 44;   // hitbox radius (px)
const MELEE_COOLDOWN = 600;

const RANGED_DAMAGE = 15;
const RANGED_SPEED = 400;
const RANGED_MAX_RANGE = 320;
const RANGED_MP_COST = 10;
const RANGED_COOLDOWN = 800;

interface Projectile extends Phaser.Physics.Arcade.Image {
  startX: number;
  startY: number;
}

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private enemies: Enemy[] = [];
  private projectiles!: Phaser.Physics.Arcade.Group;

  // Combat input
  private attackKey!: Phaser.Input.Keyboard.Key;
  private rangedKey!: Phaser.Input.Keyboard.Key;
  private meleeCooldownRemaining = 0;
  private rangedCooldownRemaining = 0;

  // HUD
  private hpFill!: Phaser.GameObjects.Rectangle;
  private mpFill!: Phaser.GameObjects.Rectangle;
  private dashIndicator!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;

  private gameOverTriggered = false;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.projectiles = this.physics.add.group();
    this.createAnimations();
    this.createProjectileTexture();
    this.createPlaceholderMap();
    this.spawnPlayer();
    this.spawnEnemies();
    this.setupCamera();
    this.setupInput();
    this.setupUI();
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);

    if (!this.player.isDead) {
      this.handleCombatInput(delta);
    }

    this.updateEnemies(delta);
    this.updateProjectiles();
    this.checkEnemyPlayerContact();

    if (this.player.isDead && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      this.time.delayedCall(1500, () => this.scene.start('GameOverScene'));
    }

    this.updateUI();

    if (import.meta.env.DEV) {
      this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
    }
  }

  // ── 애니메이션 ───────────────────────────────────────────────────────────

  private createAnimations(): void {
    const a = this.anims;

    // Player
    (['down', 'up', 'left', 'right'] as const).forEach(dir => {
      a.create({
        key: `player-walk-${dir}`,
        frames: a.generateFrameNumbers(`player_walk_${dir}`, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    });
    a.create({ key: 'player-idle',          frames: a.generateFrameNumbers('player_idle',          { start: 0, end: 1 }), frameRate: 4,  repeat: -1 });
    a.create({ key: 'player-dash',          frames: a.generateFrameNumbers('player_dash',          { start: 0, end: 2 }), frameRate: 12, repeat: 0  });
    a.create({ key: 'player-attack-melee',  frames: a.generateFrameNumbers('player_attack_melee',  { start: 0, end: 3 }), frameRate: 12, repeat: 0  });
    a.create({ key: 'player-attack-ranged', frames: a.generateFrameNumbers('player_attack_ranged', { start: 0, end: 3 }), frameRate: 12, repeat: 0  });
    a.create({ key: 'player-death',         frames: a.generateFrameNumbers('player_death',         { start: 0, end: 3 }), frameRate: 8,  repeat: 0  });

    // Goblin
    (['down', 'up', 'left', 'right'] as const).forEach(dir => {
      a.create({
        key: `goblin-walk-${dir}`,
        frames: a.generateFrameNumbers(`goblin_walk_${dir}`, { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1,
      });
    });
    a.create({ key: 'goblin-idle',   frames: [{ key: 'goblin_walk_down', frame: 0 }], frameRate: 1,  repeat: -1 });
    a.create({ key: 'goblin-attack', frames: a.generateFrameNumbers('goblin_attack', { start: 0, end: 3 }), frameRate: 10, repeat: 0 });
    a.create({ key: 'goblin-death',  frames: a.generateFrameNumbers('goblin_death',  { start: 0, end: 2 }), frameRate: 8,  repeat: 0 });
  }

  // ── 프로젝타일 텍스처 ────────────────────────────────────────────────────

  private createProjectileTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x00e5ff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('projectile', 8, 8);
    g.destroy();
  }

  // ── 맵 ──────────────────────────────────────────────────────────────────

  private createPlaceholderMap(): void {
    const mapW = MAP_COLS * TILE;
    const mapH = MAP_ROWS * TILE;

    this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0x1a3a1a);
    this.walls = this.physics.add.staticGroup();

    // 외벽
    this.addWall(0, 0, mapW, TILE);
    this.addWall(0, mapH - TILE, mapW, TILE);
    this.addWall(0, 0, TILE, mapH);
    this.addWall(mapW - TILE, 0, TILE, mapH);

    // 내부 장애물
    this.addWall(5 * TILE, 4 * TILE, 4 * TILE, TILE);
    this.addWall(12 * TILE, 8 * TILE, TILE, 4 * TILE);
    this.addWall(20 * TILE, 3 * TILE, 3 * TILE, TILE);

    this.physics.world.setBounds(0, 0, mapW, mapH);
  }

  private addWall(x: number, y: number, w: number, h: number): void {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x555566);
    this.physics.add.existing(rect, true);
    this.walls.add(rect);
  }

  // ── 스폰 ────────────────────────────────────────────────────────────────

  private spawnPlayer(): void {
    this.player = new Player(this, (MAP_COLS * TILE) / 2, (MAP_ROWS * TILE) / 2);
    this.physics.add.collider(this.player, this.walls);
  }

  private spawnEnemies(): void {
    const positions: [number, number][] = [
      [5 * TILE, 3 * TILE],
      [22 * TILE, 5 * TILE],
      [8 * TILE, 12 * TILE],
      [20 * TILE, 12 * TILE],
      [15 * TILE, 7 * TILE],
    ];
    positions.forEach(([x, y]) => {
      const goblin = new Goblin(this, x, y);
      this.physics.add.collider(goblin, this.walls);
      this.enemies.push(goblin);
    });
  }

  // ── 카메라 ──────────────────────────────────────────────────────────────

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, MAP_COLS * TILE, MAP_ROWS * TILE);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  // ── 입력 ────────────────────────────────────────────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.rangedKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  }

  // ── 전투 ────────────────────────────────────────────────────────────────

  private handleCombatInput(delta: number): void {
    this.meleeCooldownRemaining = Math.max(0, this.meleeCooldownRemaining - delta);
    this.rangedCooldownRemaining = Math.max(0, this.rangedCooldownRemaining - delta);

    if (
      Phaser.Input.Keyboard.JustDown(this.attackKey) &&
      this.meleeCooldownRemaining === 0 &&
      !this.player.isDashing &&
      !this.player.isAttacking
    ) {
      this.doMeleeAttack();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.rangedKey) &&
      this.rangedCooldownRemaining === 0 &&
      !this.player.isDashing &&
      !this.player.isAttacking
    ) {
      this.doRangedAttack();
    }
  }

  private doMeleeAttack(): void {
    this.meleeCooldownRemaining = MELEE_COOLDOWN;
    this.player.playMeleeAnim();

    const offsets: Record<string, [number, number]> = {
      down: [0, MELEE_REACH], up: [0, -MELEE_REACH],
      left: [-MELEE_REACH, 0], right: [MELEE_REACH, 0],
    };
    const [ox, oy] = offsets[this.player.facing];
    const hitX = this.player.x + ox;
    const hitY = this.player.y + oy;

    this.enemies.forEach(enemy => {
      if (enemy.isDead || !enemy.active) return;
      if (Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y) <= MELEE_RANGE) {
        enemy.takeDamage(MELEE_DAMAGE);
      }
    });
  }

  private doRangedAttack(): void {
    if (!this.player.spendMp(RANGED_MP_COST)) return;
    this.rangedCooldownRemaining = RANGED_COOLDOWN;
    this.player.playRangedAnim();

    const dirMap: Record<string, [number, number]> = {
      down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0],
    };
    const [dx, dy] = dirMap[this.player.facing];
    const proj = this.projectiles.create(this.player.x, this.player.y, 'projectile') as Projectile;
    proj.startX = this.player.x;
    proj.startY = this.player.y;
    proj.setVelocity(dx * RANGED_SPEED, dy * RANGED_SPEED);
  }

  private updateProjectiles(): void {
    this.projectiles.getChildren().forEach(child => {
      const proj = child as Projectile;
      if (!proj.active) return;

      if (Phaser.Math.Distance.Between(proj.startX, proj.startY, proj.x, proj.y) > RANGED_MAX_RANGE) {
        proj.destroy();
        return;
      }

      for (const enemy of this.enemies) {
        if (enemy.isDead || !enemy.active) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y) <= 16) {
          enemy.takeDamage(RANGED_DAMAGE);
          proj.destroy();
          return;
        }
      }
    });
  }

  private updateEnemies(delta: number): void {
    this.enemies.forEach(enemy => {
      if (enemy.active) enemy.updateAI(this.player.x, this.player.y, delta);
    });
    this.enemies = this.enemies.filter(e => e.active);
  }

  private checkEnemyPlayerContact(): void {
    if (!this.player.canBeHit) return;
    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.active || !enemy.canAttack) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= enemy.attackRange) {
        this.player.takeDamage(enemy.attackDamage);
        enemy.triggerAttackCooldown();
        break;
      }
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  private setupUI(): void {
    const s = (obj: Phaser.GameObjects.GameObject) =>
      (obj as Phaser.GameObjects.Components.ScrollFactor & typeof obj).setScrollFactor(0);

    // HP bar
    s(this.add.text(10, 8, 'HP', { fontSize: '10px', color: '#ffffff' }));
    s(this.add.rectangle(80, 13, 100, 10, 0x333333).setOrigin(0.5, 0.5));
    this.hpFill = this.add.rectangle(30, 13, 100, 8, 0xff3344).setOrigin(0, 0.5) as Phaser.GameObjects.Rectangle;
    s(this.hpFill);

    // MP bar
    s(this.add.text(10, 22, 'MP', { fontSize: '10px', color: '#ffffff' }));
    s(this.add.rectangle(80, 27, 100, 10, 0x333333).setOrigin(0.5, 0.5));
    this.mpFill = this.add.rectangle(30, 27, 100, 8, 0x3388ff).setOrigin(0, 0.5) as Phaser.GameObjects.Rectangle;
    s(this.mpFill);

    // Dash & controls
    this.dashIndicator = this.add.text(10, 38, 'DASH: READY', { fontSize: '11px', color: '#00ff88' }) as Phaser.GameObjects.Text;
    s(this.dashIndicator);
    s(this.add.text(10, 52, '[Z] Sword  [X] Magic  [Shift] Dash', { fontSize: '9px', color: '#888888' }));

    // FPS (dev only)
    this.fpsText = this.add.text(10, 64, '', { fontSize: '10px', color: '#ffff00' }) as Phaser.GameObjects.Text;
    s(this.fpsText);
    this.fpsText.setVisible(import.meta.env.DEV);
  }

  private updateUI(): void {
    this.hpFill.width = 100 * (this.player.hp / this.player.maxHp);
    this.mpFill.width = 100 * (this.player.mp / this.player.maxMp);

    if (this.player.dashReady) {
      this.dashIndicator.setText('DASH: READY').setColor('#00ff88');
    } else {
      this.dashIndicator.setText('DASH: COOLDOWN').setColor('#ff4444');
    }
  }
}

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Goblin } from '../entities/Goblin';
import { BossBase } from '../entities/BossBase';
import { QuestSystem, QuestData } from '../systems/Quest';
import { InventorySystem, type PlayerClass } from '../systems/Inventory';
import { MenuOverlay } from '../ui/MenuOverlay';
import { ShopOverlay } from '../ui/ShopOverlay';
import { SaveManager } from '../systems/SaveManager';
import type { SaveData } from '../systems/SaveManager';
import { AreaManager, type AreaScene } from '../systems/AreaManager';
import { PuzzleSystem } from '../systems/PuzzleSystem';
import { GateSystem, type GateObjectData } from '../systems/GateSystem';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { DialogueSystem, type DialogueDataMap } from '../systems/Dialogue';

const MELEE_REACH = 28;   // player center → hitbox center (px)
const MELEE_RANGE = 44;   // hitbox radius (px)
const MELEE_COOLDOWN = 600;

const RANGED_SPEED = 400;
const RANGED_MAX_RANGE = 320;
const RANGED_MP_COST = 10;
const RANGED_COOLDOWN = 800;

interface Projectile extends Phaser.Physics.Arcade.Image {
  startX: number;
  startY: number;
}

export class WorldScene extends Phaser.Scene {
  player!: Player;
  walls!: Phaser.Physics.Arcade.StaticGroup;
  enemies: Enemy[] = [];
  enemiesGroup!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  activeBosses: BossBase[] = [];
  areaManager!: AreaManager;
  activeCollisionLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private dialogue!: DialogueSystem;
  private dialogueBox!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private dialogueNameText!: Phaser.GameObjects.Text;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private quest!: QuestSystem;
  private inventory!: InventorySystem;
  private saveManager = new SaveManager();
  private menuOverlay!: MenuOverlay;
  private shopOverlay!: ShopOverlay;
  private puzzleSystem!: PuzzleSystem;
  private gateSystem!: GateSystem;
  private statusEffectSystem!: StatusEffectSystem;
  // 하트 조각
  private collectedHeartPieceIds = new Set<string>();
  private heartPieceHudText!: Phaser.GameObjects.Text;
  // 독 상태 UI
  private poisonText!: Phaser.GameObjects.Text;
  private poisonTweenActive = false;
  // flameshield 효과
  private flameshieldKey!: Phaser.Input.Keyboard.Key;
  private antidoteKey!: Phaser.Input.Keyboard.Key;
  private recallKey!: Phaser.Input.Keyboard.Key;
  private flameshieldActive = false;
  private flameshieldCooldown = 0;  // ms
  private flameshieldHudText!: Phaser.GameObjects.Text;
  private playtimeStart = 0;

  // Combat input
  private attackKey!: Phaser.Input.Keyboard.Key;
  private rangedKey!: Phaser.Input.Keyboard.Key;
  private specialKey!: Phaser.Input.Keyboard.Key;
  private meleeCooldownRemaining = 0;
  private rangedCooldownRemaining = 0;
  private specialCooldownRemaining = 0;

  // HUD 오브젝트 추적 (미니맵 카메라 ignore용)
  private hudObjects: Phaser.GameObjects.GameObject[] = [];
  // 미니맵
  private minimapCamera!: Phaser.Cameras.Scene2D.Camera;
  private minimapDot!: Phaser.GameObjects.Rectangle;
  private minimapZoom = 0;
  private minimapX = 0;
  private minimapY = 0;
  // HUD
  private hpFill!: Phaser.GameObjects.Rectangle;
  private mpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private dashIndicator!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;

  currentArea = 'scene_haven';  // 현재 지역 ID — 세이브 탭 활성화 조건에 사용

  private startPlayerClass: PlayerClass = 'class_swordsman';
  private _initFromSave = false;
  private gameOverTriggered = false;
  private dialogueActive = false;
  private enemyExpMap: Record<string, number> = {};
  private enemyDropMap: Record<string, { goldMin: number; goldMax: number; drops: Array<{ id: string; rate: number }> }> = {};
  private levelText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private shortcutLabels: Phaser.GameObjects.Text[] = [];
  private damageTextPool: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data?: { playerClass?: PlayerClass; fromSave?: boolean }): void {
    this.startPlayerClass = data?.playerClass ?? 'class_swordsman';
    this._initFromSave = data?.fromSave ?? false;
  }

  create(): void {
    this.projectiles = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();
    this.enemiesGroup = this.physics.add.group();
    this.walls = this.physics.add.staticGroup();
    this.initSystems();

    // DialogueSystem 초기화
    const dialogueData = this.cache.json.get('dialogues') as DialogueDataMap;
    this.dialogue = new DialogueSystem(dialogueData ?? {});
    this.setupDialogueUI();

    this.createAnimations();
    this.createProjectileTexture();
    this.createEnemyProjectileTexture();

    this.spawnPlayer();
    this.physics.add.overlap(this.enemyProjectiles, this.player, (_, proj) => {
      const p = proj as Phaser.Physics.Arcade.Image & { attackDamage: number };
      if (!p.active) return;
      if (!this.player.canBeHit) return;
      p.setActive(false).setVisible(false);
      const d = this.reducedIncoming(p.attackDamage);
      this.player.takeDamage(d);
      this.spawnDamageNumber(this.player.x, this.player.y, d, true);
      p.destroy();
    });
    // PERF 1: Phaser broadphase overlap으로 발사체↔적 충돌 처리
    this.physics.add.overlap(
      this.projectiles,
      this.enemiesGroup,
      (projObj, enemyObj) => {
        const proj = projObj as Projectile;
        const enemy = enemyObj as Enemy;
        if (!proj.active || enemy.isDead || !enemy.active) return;
        const rdmg = Math.max(1,
          Math.floor((this.player.atk + this.inventory.getWeaponBonus()) * 0.75)
          - Math.floor(enemy.def / 2));
        enemy.takeDamage(rdmg);
        this.spawnDamageNumber(enemy.x, enemy.y, rdmg);
        proj.destroy();
      },
    );
    this.statusEffectSystem = new StatusEffectSystem(this.player);
    this.setupCamera();
    this.setupInput();
    this.setupUI();
    this.setupMinimap();
    this.setupBossEventHandlers();
    this.setupQuestEventHandlers();
    this.setupGateEventHandlers();
    this.setupPuzzleEventHandlers();

    // AreaManager로 맵 로드
    this.areaManager = new AreaManager(this as unknown as AreaScene);
    this.areaManager.loadArea('scene_haven');

    this.playtimeStart = this.time.now;
    this.menuOverlay = new MenuOverlay(
      this,
      this.inventory,
      this.quest,
      this.saveManager,
      () => this.buildSaveData(),
    );
    this.shopOverlay = new ShopOverlay(
      this,
      this.inventory,
      () => this.player,
      this.cache.json.get('balance'),
    );

    this.initDamageTextPool();

    // 게임오버 후 세이브 복원
    if (this._initFromSave) {
      const saveData = this.saveManager.load();
      if (saveData) this.events.emit('load_save', saveData);
    }
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);

    if (!this.player.isDead && !this.dialogueActive) {
      this.handleCombatInput(delta);
    }

    if (!this.dialogueActive) {
      this.updateEnemies(delta);
      this.updateProjectiles();
      this.updateBossProjectiles();
      this.updateEnemyProjectiles();
      this.checkEnemyPlayerContact();
    }

    if (this.player.isDead && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      this.time.delayedCall(1500, () => this.scene.start('GameOverScene'));
    }

    this.updateUI();

    // NPC 말풍선 거리 기반 체크
    if (this.areaManager) {
      this.areaManager.checkNpcProximity(this.player.x, this.player.y);
    }

    // 게이트 근접 체크
    this.gateSystem?.update(delta);

    // 독 상태 업데이트
    this.updatePoison(delta);

    // flameshield E키 처리
    this.updateFlameshield(delta);

    // 미니맵 플레이어 도트 갱신
    this.updateMinimapPlayerDot();

    // R 키: 귀환석 사용
    if (
      !this.dialogueActive &&
      !this.player.isDead &&
      Phaser.Input.Keyboard.JustDown(this.recallKey) &&
      this.inventory.hasItem('item_recall_stone')
    ) {
      this.inventory.removeItem('item_recall_stone', 1);
      this.areaManager.transitionToArea('scene_haven');
    }

    // Space 키: 대화 진행 → NPC 상호작용 → 퍼즐 상호작용
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.dialogue?.isPlaying()) {
        this.dialogue.next();
      } else if (this.areaManager?.nearbyNpcId) {
        const npcId = this.areaManager.nearbyNpcId;
        if (npcId === 'npc_merchant' || npcId === 'npc_healer') {
          this.shopOverlay.open(npcId);
        } else {
          this.dialogue.start(npcId);
        }
      } else if (this.puzzleSystem?.nearInteractable) {
        this.puzzleSystem.tryInteract();
      }
    }

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

  private createEnemyProjectileTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff8800);
    g.fillCircle(2, 2, 2);
    g.generateTexture('enemy_projectile', 4, 4);
    g.destroy();
  }

  // ── 스폰 ────────────────────────────────────────────────────────────────

  private spawnPlayer(): void {
    this.player = new Player(this, 320, 400);
    // 충돌은 AreaManager.loadArea() 시 tilemap 레이어로 추가
  }

  // ── 카메라 ──────────────────────────────────────────────────────────────

  private setupCamera(): void {
    // 초기 바운드 — AreaManager.loadArea()가 맵 크기에 맞게 재설정
    this.cameras.main.setBounds(0, 0, 2000, 2000);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  // ── 입력 ────────────────────────────────────────────────────────────────

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.attackKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.O);
    this.rangedKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    // I/Q 열기: Phaser addKey() — 메뉴 닫힌 상태(pause 아님)에서만 수신
    const iKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    const qKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    iKey.on('down', () => this.menuOverlay.open('inventory'));
    qKey.on('down', () => this.menuOverlay.open('quest'));
    // 닫기(I/Q 토글·ESC): MenuOverlay 생성자의 DOM 리스너가 처리
    this.spaceKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.flameshieldKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.antidoteKey    = kb.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.recallKey      = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.specialKey     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K);
  }

  // ── 전투 ────────────────────────────────────────────────────────────────

  private handleCombatInput(delta: number): void {
    this.meleeCooldownRemaining = Math.max(0, this.meleeCooldownRemaining - delta);
    this.rangedCooldownRemaining = Math.max(0, this.rangedCooldownRemaining - delta);
    this.specialCooldownRemaining = Math.max(0, this.specialCooldownRemaining - delta);

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

    if (
      Phaser.Input.Keyboard.JustDown(this.specialKey) &&
      this.specialCooldownRemaining === 0 &&
      !this.player.isDashing
    ) {
      this.handleSpecialAttack();
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

    const weaponBonus = this.inventory.getWeaponBonus();
    this.enemies.forEach(enemy => {
      if (enemy.isDead || !enemy.active) return;
      if (Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y) <= MELEE_RANGE) {
        const dmg = Math.max(1, this.player.atk + weaponBonus - Math.floor(enemy.def / 2));
        enemy.takeDamage(dmg);
        this.spawnDamageNumber(enemy.x, enemy.y, dmg);
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
      if (proj.active && Phaser.Math.Distance.Between(proj.startX, proj.startY, proj.x, proj.y) > RANGED_MAX_RANGE) {
        proj.destroy();
      }
    });
  }

  private handleSpecialAttack(): void {
    const SPECIAL_RANGE = 80;
    const SPECIAL_COOLDOWN = 2000;
    const playerClass = this.inventory.getPlayerClass();

    if (playerClass === 'class_swordsman') {
      if (!this.player.spendMp(10)) return;
      const weaponBonus = this.inventory.getWeaponBonus();
      this.enemies.forEach(enemy => {
        if (enemy.isDead || !enemy.active) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= SPECIAL_RANGE) {
          const dmg = Math.max(1, this.player.atk + weaponBonus - Math.floor(enemy.def / 2));
          enemy.takeDamage(dmg);
          this.spawnDamageNumber(enemy.x, enemy.y, dmg);
        }
      });
      // 흰색 원형 flash
      const flash = this.add.circle(this.player.x, this.player.y, SPECIAL_RANGE, 0xffffff, 0.35).setDepth(15);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    } else {
      if (!this.player.spendMp(20)) return;
      const weaponBonus = this.inventory.getWeaponBonus();
      this.enemies.forEach(enemy => {
        if (enemy.isDead || !enemy.active) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= SPECIAL_RANGE) {
          const dmg = Math.max(1, Math.floor((this.player.atk + weaponBonus) * 0.7) - Math.floor(enemy.def / 2));
          enemy.takeDamage(dmg);
          this.spawnDamageNumber(enemy.x, enemy.y, dmg);
        }
      });
      // 보라색 원형 flash
      const flash = this.add.circle(this.player.x, this.player.y, SPECIAL_RANGE, 0x9b59b6, 0.45).setDepth(15);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
    }

    this.specialCooldownRemaining = SPECIAL_COOLDOWN;
  }

  private updateEnemies(delta: number): void {
    this.enemies.forEach(enemy => {
      if (!enemy.active) return;
      enemy.updateAI(this.player.x, this.player.y, delta);
      if (enemy.isRanged && enemy.canAttack && !enemy.isDead) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (dist <= enemy.attackRange) {
          this.handleEnemyRangedAttack(enemy);
          enemy.triggerAttackCooldown();
        }
      }
    });
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].active) this.enemies.splice(i, 1);
    }
  }

  private checkEnemyPlayerContact(): void {
    if (!this.player.canBeHit) return;
    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.active || !enemy.canAttack || enemy.isRanged) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= enemy.attackRange) {
        const incoming = this.reducedIncoming(enemy.attackDamage);
        this.player.takeDamage(incoming);
        this.spawnDamageNumber(this.player.x, this.player.y, incoming, true);
        enemy.triggerAttackCooldown();
        // 거미 공격 시 25% 확률로 독 발동
        if (enemy.enemyId === 'enemy_spider' && Math.random() < 0.25) {
          this.statusEffectSystem?.applyPoison(4000, 3);
        }
        break;
      }
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  private setupUI(): void {
    const s = (obj: Phaser.GameObjects.GameObject): void => {
      (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
      this.hudObjects.push(obj);
    };

    const BAR_W = 120;
    const BAR_H = 10;
    const LX = 10; // label x
    const BX = 36; // bar x

    // 독 상태 표시 (HP 바 위, 기본 숨김)
    this.poisonText = this.add.text(LX, 1, '💜 독!', {
      fontSize: '9px', color: '#cc44ff', fontStyle: 'bold',
    }) as Phaser.GameObjects.Text;
    s(this.poisonText);
    this.poisonText.setVisible(false);

    // HP bar
    s(this.add.text(LX, 10, 'HP', { fontSize: '11px', color: '#ff6666', fontStyle: 'bold' }));
    s(this.add.rectangle(BX + BAR_W / 2, 16, BAR_W + 2, BAR_H + 2, 0x111111).setOrigin(0.5, 0.5));
    s(this.add.rectangle(BX + BAR_W / 2, 16, BAR_W, BAR_H, 0x441111).setOrigin(0.5, 0.5));
    this.hpFill = this.add.rectangle(BX, 16, BAR_W, BAR_H, 0xee2244).setOrigin(0, 0.5) as Phaser.GameObjects.Rectangle;
    s(this.hpFill);
    this.hpText = this.add.text(BX + BAR_W + 4, 16, '', { fontSize: '10px', color: '#ffaaaa' }).setOrigin(0, 0.5) as Phaser.GameObjects.Text;
    s(this.hpText);

    // MP bar
    s(this.add.text(LX, 24, 'MP', { fontSize: '11px', color: '#6699ff', fontStyle: 'bold' }));
    s(this.add.rectangle(BX + BAR_W / 2, 30, BAR_W + 2, BAR_H + 2, 0x111111).setOrigin(0.5, 0.5));
    s(this.add.rectangle(BX + BAR_W / 2, 30, BAR_W, BAR_H, 0x111144).setOrigin(0.5, 0.5));
    this.mpFill = this.add.rectangle(BX, 30, BAR_W, BAR_H, 0x2266ee).setOrigin(0, 0.5) as Phaser.GameObjects.Rectangle;
    s(this.mpFill);
    this.mpText = this.add.text(BX + BAR_W + 4, 30, '', { fontSize: '10px', color: '#aabbff' }).setOrigin(0, 0.5) as Phaser.GameObjects.Text;
    s(this.mpText);

    // Dash indicator
    this.dashIndicator = this.add.text(LX, 42, '● DASH READY', { fontSize: '10px', color: '#00ff88' }) as Phaser.GameObjects.Text;
    s(this.dashIndicator);

    // Key guide
    s(this.add.text(LX, 56, '[O] 공격  [P] 마법  [Shift] 대시', { fontSize: '9px', color: '#666666' }));
    s(this.add.text(LX, 66, '[I] 인벤토리  [Q] 퀘스트', { fontSize: '9px', color: '#666666' }));

    // FPS (dev only)
    this.fpsText = this.add.text(LX, 78, '', { fontSize: '10px', color: '#ffff00' }) as Phaser.GameObjects.Text;
    s(this.fpsText);
    this.fpsText.setVisible(import.meta.env.DEV);

    // 레벨 / EXP
    this.levelText = this.add.text(LX, 90, 'Lv.1', { fontSize: '10px', color: '#ffee66' }) as Phaser.GameObjects.Text;
    s(this.levelText);

    // 골드 상시 표시
    this.goldText = this.add.text(LX, 103, 'G: 0', { fontSize: '10px', color: '#ffdd00' }) as Phaser.GameObjects.Text;
    s(this.goldText);

    // flameshield 쿨다운 HUD (숨김 상태로 시작)
    this.flameshieldHudText = this.add.text(LX, 117, '', { fontSize: '10px', color: '#ff9900' }) as Phaser.GameObjects.Text;
    s(this.flameshieldHudText);
    this.flameshieldHudText.setVisible(false);

    // 하트 조각 HUD
    this.heartPieceHudText = this.add.text(LX, 130, '💗 x0', { fontSize: '10px', color: '#ff88aa' }) as Phaser.GameObjects.Text;
    s(this.heartPieceHudText);

    // 단축키 슬롯 4칸 (하단 중앙, 시각 표시만)
    const SLOT_SIZE = 36;
    const SLOT_GAP = 4;
    const totalW = 4 * SLOT_SIZE + 3 * SLOT_GAP;
    const slotStartX = (this.scale.width - totalW) / 2;
    const slotY = this.scale.height - SLOT_SIZE - 10;
    for (let i = 0; i < 4; i++) {
      const cx = slotStartX + i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
      const cy = slotY + SLOT_SIZE / 2;
      s(this.add.rectangle(cx, cy, SLOT_SIZE, SLOT_SIZE, 0x111122).setOrigin(0.5).setDepth(15).setStrokeStyle(1, 0x4444aa));
      const lbl = this.add.text(cx, cy, '', { fontSize: '8px', color: '#aaaacc', align: 'center', wordWrap: { width: SLOT_SIZE - 4 } })
        .setOrigin(0.5).setDepth(16) as Phaser.GameObjects.Text;
      s(lbl);
      this.shortcutLabels.push(lbl);
    }
  }

  private updateUI(): void {
    const BAR_W = 120;
    this.hpFill.width = BAR_W * (this.player.hp / this.player.maxHp);
    this.mpFill.width = BAR_W * (this.player.mp / this.player.maxMp);
    this.hpText.setText(`${this.player.hp}/${this.player.maxHp}`);
    this.mpText.setText(`${this.player.mp}/${this.player.maxMp}`);

    if (this.player.dashReady) {
      this.dashIndicator.setText('● DASH READY').setColor('#00ff88');
    } else {
      this.dashIndicator.setText('○ DASH...').setColor('#ff4444');
    }

    const expNext = this.player.expToNextLevel;
    this.levelText.setText(`Lv.${this.player.level}  EXP ${this.player.exp}/${expNext ?? 'MAX'}`);

    // 골드 상시 표시
    this.goldText.setText(`G: ${this.player.gold}`);

    // 하트 조각
    this.heartPieceHudText.setText(`💗 x${this.player.heartPieces}`);

    // 단축키 슬롯 업데이트
    const eq = this.inventory.getEquipment();
    const snap = this.inventory.toJSON();
    this.shortcutLabels[0].setText(eq.weapon ? eq.weapon.replace('weapon_', '').substring(0, 8) : '-');
    const consumables = Object.entries(snap.items).filter(([, qty]) => qty > 0).slice(0, 3);
    for (let i = 0; i < 3; i++) {
      if (consumables[i]) {
        const [id, qty] = consumables[i];
        this.shortcutLabels[1 + i].setText(id.replace('item_', '').substring(0, 7) + '\n×' + qty);
      } else {
        this.shortcutLabels[1 + i].setText('-');
      }
    }
  }

  // ── 플로팅 데미지 숫자 (오브젝트 풀) ─────────────────────────────────────

  private initDamageTextPool(): void {
    for (let i = 0; i < 10; i++) {
      this.damageTextPool.push(
        this.add.text(0, 0, '', {
          fontSize: '12px', color: '#ffee44', fontStyle: 'bold',
          stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 1).setDepth(20).setActive(false).setVisible(false),
      );
    }
  }

  private spawnDamageNumber(x: number, y: number, amount: number, isPlayer = false): void {
    const color = isPlayer ? '#ff4444' : '#ffee44';
    let txt = this.damageTextPool.find(t => !t.active);
    if (!txt) {
      txt = this.add.text(0, 0, '', {
        fontSize: '12px', color, fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(20);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (txt as any)._tweenToken = 0;
      this.damageTextPool.push(txt);
    }
    this.tweens.killTweensOf(txt);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = ++((txt as any)._tweenToken);
    txt.setText(`-${amount}`)
      .setColor(color)
      .setFontSize(isPlayer ? 14 : 12)
      .setPosition(x, y - 8)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true);

    this.tweens.add({
      targets: txt,
      y: y - 36,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.Out',
      onComplete: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((txt as any)._tweenToken === token) {
          txt!.setActive(false).setVisible(false);
        }
      },
    });
  }

  /** 적 처치 시 골드·아이템 드롭 처리 */
  private processDrops(enemyId: string, x: number, y: number): void {
    const config = this.enemyDropMap[enemyId];
    if (!config) return;

    // 골드 드롭
    if (config.goldMax > 0) {
      const gold = Phaser.Math.Between(config.goldMin, config.goldMax);
      this.player.gold += gold;
      this.spawnPickupText(x, y, `+${gold}G`, '#ffdd00');
    }

    // 아이템 드롭 (확률)
    for (const drop of config.drops) {
      if (Math.random() < drop.rate) {
        this.inventory.addItem(drop.id, 1);
        this.spawnPickupText(x, y - 14, `+${drop.id}`, '#88ffaa');
      }
    }
  }

  private spawnPickupText(x: number, y: number, text: string, color: string): void {
    const txt = this.add.text(x, y - 8, text, {
      fontSize: '11px', color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }

  /** 플레이어 방어력(def + 장착 보너스)을 적용한 받는 피해량. flameshield 활성 시 0 */
  private reducedIncoming(raw: number): number {
    if (this.flameshieldActive) return 0;
    return Math.max(1, raw - Math.floor((this.player.def + this.inventory.getArmorBonus()) / 2));
  }

  private showLevelUpNotification(level: number): void {
    const txt = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 60,
      `LEVEL UP!  Lv.${level}`,
      { fontSize: '22px', color: '#ffee00', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 },
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: txt,
      y: txt.y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }

  // ── 시스템 초기화 ────────────────────────────────────────────────────────

  private initSystems(): void {
    this.puzzleSystem = new PuzzleSystem();
    this.gateSystem   = new GateSystem();
    this.inventory = new InventorySystem();
    const questData = this.cache.json.get('quests') as { main_quests: QuestData[]; side_quests: QuestData[] };
    this.quest = new QuestSystem(questData, this.inventory);
    // mq_01은 게임 시작 시 즉시 수락
    this.quest.accept('mq_01');

    // 직업 적용 및 초기 무기 지급
    this.inventory.setPlayerClass(this.startPlayerClass);
    this.quest.setPlayerClass(this.startPlayerClass);
    if (this.startPlayerClass === 'class_mage') {
      this.inventory.equipWeapon('weapon_basic_staff');
    } else {
      this.inventory.equipWeapon('weapon_wood_sword');
    }

    // 적 처치 EXP·드롭 조회 테이블 빌드
    type RegularEnemy = { id: string; exp: number; gold_drop: [number, number]; item_drops: Array<{ id: string; rate: number }> };
    const balance = this.cache.json.get('balance') as { enemies: { regular: RegularEnemy[]; bosses?: Array<{ id: string; exp: number }> } };
    if (balance?.enemies?.regular) {
      for (const e of balance.enemies.regular) {
        this.enemyExpMap[e.id] = e.exp;
        this.enemyDropMap[e.id] = {
          goldMin: e.gold_drop?.[0] ?? 0,
          goldMax: e.gold_drop?.[1] ?? 0,
          drops: e.item_drops ?? [],
        };
      }
    }
    if (balance?.enemies?.bosses) {
      for (const b of balance.enemies.bosses) this.enemyExpMap[b.id] = b.exp;
    }
  }

  isHeartPieceCollected(id: string): boolean {
    return this.collectedHeartPieceIds.has(id);
  }

  private setupQuestEventHandlers(): void {
    // 출구 요청 → 퀘스트 확인 후 전환 또는 잠금 메시지
    this.events.on('area_exit_request', (nextAreaId: string, requiredQuest: string) => {
      if (this.quest.getStatus(requiredQuest) === 'completed') {
        this.areaManager.transitionToArea(nextAreaId);
      } else {
        this.areaManager.showMessage('아직 이곳으로 갈 수 없습니다.');
      }
    });

    // 세이브 불러오기 → 인벤토리·퀘스트·퍼즐 상태 복원
    this.events.on('load_save', (data: import('../systems/SaveManager').SaveData) => {
      this.inventory.fromJSON(data.inventory);
      this.inventory.setPlayerClass(data.player.playerClass);
      this.quest.fromJSON(data.quests);
      this.quest.setPlayerClass(data.player.playerClass);
      if (data.player.maxHp) this.player.maxHp = data.player.maxHp;
      this.player.hp = Math.min(data.player.hp, this.player.maxHp);
      this.player.mp = Math.min(data.player.mp, this.player.maxMp);
      if (data.puzzles) this.puzzleSystem?.loadSolved(data.puzzles);
      if (data.gates)   this.gateSystem?.loadSaved(data.gates);
      if (data.heartPieces) {
        this.collectedHeartPieceIds = new Set(
          Object.keys(data.heartPieces).filter(k => data.heartPieces[k]),
        );
        this.player.heartPieces = this.collectedHeartPieceIds.size;
      }
      // 저장된 지역으로 이동 (GDD 9.3: 마지막 세이브 포인트에서 재개)
      this.areaManager.loadArea(data.currentArea ?? 'scene_haven');
    });

    // 퀘스트 보상 지급
    this.quest.on('quest_reward', (_id: string, reward: { exp: number; gold: number }) => {
      if (reward.exp > 0) this.player.gainExp(reward.exp);
      if (reward.gold > 0) this.player.gold += reward.gold;
    });

    // 적 처치 → QuestSystem 연동 + EXP + 드롭
    this.events.on('enemy_killed', (enemyId: string, ex: number, ey: number) => {
      this.quest.onEnemyKilled(enemyId);
      const exp = this.enemyExpMap[enemyId] ?? 0;
      if (exp > 0) this.player.gainExp(exp);
      this.processDrops(enemyId, ex, ey);
    });

    // 레벨업 알림
    this.events.on('player_levelup', (newLevel: number) => {
      this.showLevelUpNotification(newLevel);
    });

    // 아이템 획득 → QuestSystem 연동
    this.inventory.on('item_added', (id: string, qty: number) => {
      this.quest.onItemCollected(id, qty);
    });

    // 아이템 사용 → 폭탄 AOE 처리
    this.events.on('item_used', (itemId: string) => {
      if (itemId !== 'item_bomb') return;
      const AOE_RANGE = 100;
      this.enemies.forEach(enemy => {
        if (enemy.isDead || !enemy.active) return;
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) <= AOE_RANGE) {
          enemy.takeDamage(50);
          this.spawnDamageNumber(enemy.x, enemy.y, 50);
        }
      });
      const flash = this.add.circle(this.player.x, this.player.y, AOE_RANGE, 0xffff00, 0.4).setDepth(15);
      this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    });

    // 하트 조각 수집
    this.events.on('heart_piece_found', (pieceId: string) => {
      if (this.collectedHeartPieceIds.has(pieceId)) return;
      this.collectedHeartPieceIds.add(pieceId);
      this.player.collectHeartPiece();
    });

    this.events.on('heart_piece_collected', (total: number) => {
      const inSet = total % 4 === 0 ? 4 : total % 4;
      this.showHeartPieceNotification(`💗 하트 조각 획득! (${inSet}/4)`);
    });

    this.events.on('max_hp_up', () => {
      this.showHeartPieceNotification('❤️ 최대 HP +100!');
    });

    // 엔딩 트리거 (mq_11 완료)
    this.quest.on('game_ending', () => {
      this.time.delayedCall(2000, () => {
        const clearData = {
          playtime: this.time.now,
          level: this.player.level,
          questsPct: Math.round(
            (this.quest.getAllQuests().filter(q =>
              this.quest.getStatus(q.id) === 'completed',
            ).length / 18) * 100,
          ),
          date: new Date().toISOString(),
        };
        this.scene.start('EndingScene', clearData);
      });
    });
  }

  // ── 퍼즐 연동 ────────────────────────────────────────────────────────────

  // ── 독 상태이상 ─────────────────────────────────────────────────────────

  private updatePoison(delta: number): void {
    const wasPoisoned = this.statusEffectSystem.isPoisoned;
    this.statusEffectSystem.update(delta);
    const nowPoisoned = this.statusEffectSystem.isPoisoned;

    // UI 표시/숨김
    this.poisonText.setVisible(nowPoisoned);

    // 독 해제 시 틴트 초기화
    if (wasPoisoned && !nowPoisoned) {
      this.player.clearTint();
      this.poisonTweenActive = false;
    }

    // 독 진입 시 보라색 깜빡임 트윈 시작
    if (!wasPoisoned && nowPoisoned) {
      this.startPoisonTween();
    }

    // U 키: 해독제 사용
    if (Phaser.Input.Keyboard.JustDown(this.antidoteKey) && nowPoisoned && this.inventory.hasItem('item_antidote')) {
      this.inventory.removeItem('item_antidote', 1);
      this.statusEffectSystem.clearPoison();
      this.player.clearTint();
      this.poisonTweenActive = false;
      this.poisonText.setVisible(false);
    }
  }

  private startPoisonTween(): void {
    if (this.poisonTweenActive) return;
    this.poisonTweenActive = true;
    let tintOn = false;
    const timer = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        if (!this.statusEffectSystem.isPoisoned) {
          timer.remove();
          this.player.clearTint();
          this.poisonTweenActive = false;
          return;
        }
        tintOn = !tintOn;
        if (tintOn) this.player.setTint(0x9900cc);
        else        this.player.clearTint();
      },
    });
  }

  private setupGateEventHandlers(): void {
    // gate_found는 loadArea 내 오브젝트 파싱 중 area_loaded보다 먼저 발행됨.
    // 지역별로 수집 후 area_loaded 시 일괄 초기화.
    let pendingGates: GateObjectData[] = [];

    this.events.on('gate_found', (obj: GateObjectData) => {
      pendingGates.push(obj);
    });

    this.events.on('area_loaded', () => {
      if (pendingGates.length > 0) {
        this.gateSystem.initGates(pendingGates, this, this.player, this.inventory);
        pendingGates = [];
      }
    });

    // 키 아이템 획득 시 해당 게이트 자동 개방
    this.inventory.on('key_item_added', (id: string) => {
      this.gateSystem.tryOpenByKeyItem(id);
    });
  }

  private updateFlameshield(delta: number): void {
    if (this.flameshieldCooldown > 0) {
      this.flameshieldCooldown = Math.max(0, this.flameshieldCooldown - delta);
      const secLeft = Math.ceil(this.flameshieldCooldown / 1000);
      this.flameshieldHudText.setText(`[E] 불꽃방패 쿨다운: ${secLeft}s`).setVisible(true);
    } else if (!this.flameshieldActive) {
      if (this.inventory.hasKeyItem('key_flameshield')) {
        this.flameshieldHudText.setText('[E] 불꽃방패').setVisible(true);
      } else {
        this.flameshieldHudText.setVisible(false);
      }
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.flameshieldKey) &&
      this.inventory.hasKeyItem('key_flameshield') &&
      this.flameshieldCooldown === 0 &&
      !this.flameshieldActive
    ) {
      this.activateFlameshield();
    }
  }

  private activateFlameshield(): void {
    this.flameshieldActive = true;
    this.flameshieldHudText.setText('[E] 불꽃방패 활성!').setColor('#ff6600').setVisible(true);

    const indicator = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 60,
      '불꽃방패 활성! (5초)',
      { fontSize: '16px', color: '#ff9900', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 },
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: indicator, alpha: 0, duration: 2000, delay: 2000, onComplete: () => indicator.destroy() });

    this.time.delayedCall(5000, () => {
      this.flameshieldActive = false;
      this.flameshieldCooldown = 30000;
      this.flameshieldHudText.setColor('#ff9900');
    });
  }

  private setupPuzzleEventHandlers(): void {
    this.events.on('area_loaded', (areaId: string) => {
      this.puzzleSystem.initPuzzle(areaId, this, this.player);
    });

    this.events.on('puzzle_solved', () => {
      this.showPuzzleSolvedNotification();
    });

    this.events.on('puzzle_already_solved', () => {
      // 이미 해결된 퍼즐 — 필요 시 문 개방 처리 확장
    });
  }

  // ── 미니맵 ──────────────────────────────────────────────────────────────

  private setupMinimap(): void {
    const MM_W = 120;
    const MM_H = 120;
    this.minimapX = this.scale.width  - MM_W - 10;
    this.minimapY = this.scale.height - MM_H - 10;

    // 배경 (반투명 검정)
    const bg = this.add.rectangle(
      this.minimapX + MM_W / 2, this.minimapY + MM_H / 2,
      MM_W, MM_H, 0x000000, 0.5,
    ).setScrollFactor(0).setDepth(19) as Phaser.GameObjects.Rectangle;

    // 테두리 (1px 흰색)
    const border = this.add.rectangle(
      this.minimapX + MM_W / 2, this.minimapY + MM_H / 2,
      MM_W + 2, MM_H + 2, 0x000000, 0,
    ).setScrollFactor(0).setDepth(18).setStrokeStyle(1, 0xffffff) as Phaser.GameObjects.Rectangle;

    // 플레이어 도트 (4×4 흰색)
    this.minimapDot = this.add.rectangle(
      this.minimapX, this.minimapY, 4, 4, 0xffffff,
    ).setScrollFactor(0).setDepth(21) as Phaser.GameObjects.Rectangle;

    // 미니맵 카메라 — HUD 오브젝트와 미니맵 UI를 제외하고 월드만 렌더
    this.minimapCamera = this.cameras.add(this.minimapX, this.minimapY, MM_W, MM_H);
    this.minimapCamera.setScroll(0, 0);
    this.minimapCamera.ignore([...this.hudObjects, bg, border, this.minimapDot]);

    // area_loaded 시 맵 크기에 맞게 zoom 갱신
    this.events.on('area_loaded', () => {
      const { width, height } = this.physics.world.bounds;
      this.minimapZoom = Math.min(MM_W / width, MM_H / height);
      this.minimapCamera.setZoom(this.minimapZoom);
    });
  }

  private updateMinimapPlayerDot(): void {
    if (this.minimapZoom === 0) return;
    this.minimapDot.x = this.minimapX + this.player.x * this.minimapZoom;
    this.minimapDot.y = this.minimapY + this.player.y * this.minimapZoom;
  }

  private showHeartPieceNotification(msg: string): void {
    const txt = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 80,
      msg,
      { fontSize: '16px', color: '#ff88aa', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 },
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: txt,
      y: txt.y - 40,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }

  private showPuzzleSolvedNotification(): void {
    const txt = this.add.text(
      this.scale.width / 2, this.scale.height / 2 - 40,
      '퍼즐 해결!',
      { fontSize: '20px', color: '#44ff88', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 },
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: txt,
      y: txt.y - 50,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }

  // ── 보스 연동 ────────────────────────────────────────────────────────────

  /** 보스를 씬에 등록. enemies 배열 + activeBosses 배열에 추가. */
  registerBoss(boss: BossBase): void {
    if (this.activeCollisionLayer) {
      this.physics.add.collider(boss, this.activeCollisionLayer);
    }
    this.enemies.push(boss);
    this.enemiesGroup.add(boss);
    this.activeBosses.push(boss);
  }

  private setupBossEventHandlers(): void {
    // 근접 범위 데미지 (원형)
    this.events.on('boss_melee_hit', (x: number, y: number, dmg: number, range: number) => {
      if (!this.player.canBeHit) return;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= range) {
        const d = this.reducedIncoming(Math.round(dmg));
        this.player.takeDamage(d); this.spawnDamageNumber(this.player.x, this.player.y, d, true);
      }
    });

    // 광역 원형 데미지
    this.events.on('boss_aoe_hit', (x: number, y: number, dmg: number, range: number) => {
      if (!this.player.canBeHit) return;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= range) {
        const d = this.reducedIncoming(Math.round(dmg));
        this.player.takeDamage(d); this.spawnDamageNumber(this.player.x, this.player.y, d, true);
      }
    });

    // 원뿔형 브레스 데미지
    this.events.on(
      'boss_cone_hit',
      (x: number, y: number, angle: number, halfAngle: number, range: number, dmg: number) => {
        if (!this.player.canBeHit) return;
        const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (dist > range) return;
        const toPlayer = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
        const diff = Math.abs(Phaser.Math.Angle.Wrap(toPlayer - angle));
        if (diff <= halfAngle) {
          const d = this.reducedIncoming(Math.round(dmg));
          this.player.takeDamage(d); this.spawnDamageNumber(this.player.x, this.player.y, d, true);
        }
      },
    );

    // 지속 장판 (초당 dmg, duration ms)
    this.events.on(
      'boss_zone',
      (zx: number, zy: number, dmg: number, range: number, duration: number) => {
        const endTime = this.time.now + duration;
        const tick = this.time.addEvent({
          delay: 1000,
          callback: () => {
            if (this.time.now > endTime) { tick.destroy(); return; }
            if (!this.player.canBeHit) return;
            if (Phaser.Math.Distance.Between(zx, zy, this.player.x, this.player.y) <= range) {
              const d = this.reducedIncoming(Math.round(dmg));
              this.player.takeDamage(d); this.spawnDamageNumber(this.player.x, this.player.y, d, true);
            }
          },
          loop: true,
        });
      },
    );

    // 소환 요청
    this.events.on('boss_summon', (type: string, x: number, y: number) => {
      let enemy: Enemy | null = null;
      if (type === 'goblin') enemy = new Goblin(this, x, y);
      // skeleton, dark_knight 클래스는 M4 이후 추가
      if (enemy) {
        if (this.activeCollisionLayer) {
          this.physics.add.collider(enemy, this.activeCollisionLayer);
        }
        this.enemies.push(enemy);
        this.enemiesGroup.add(enemy);
      }
    });

    // 키 아이템 드롭 → Inventory 연동
    this.events.on('boss_key_item', (itemId: string) => {
      this.inventory.addKeyItem(itemId);
    });
  }

  private setupDialogueUI(): void {
    const s = (obj: Phaser.GameObjects.GameObject): void => {
      (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
      this.hudObjects.push(obj);
    };

    // 배경 패널
    const bg = this.add.rectangle(480, 490, 920, 110, 0x111122, 0.9)
      .setOrigin(0.5).setDepth(30);
    s(bg);

    // 화자 이름
    this.dialogueNameText = this.add.text(40, 445, '', {
      fontSize: '12px', color: '#f1c40f', fontStyle: 'bold',
    }).setDepth(31) as Phaser.GameObjects.Text;
    s(this.dialogueNameText);

    // 대사 텍스트
    this.dialogueText = this.add.text(40, 462, '', {
      fontSize: '11px', color: '#eeeeee',
      wordWrap: { width: 880 },
    }).setDepth(31) as Phaser.GameObjects.Text;
    s(this.dialogueText);

    // 안내 텍스트
    const hint = this.add.text(870, 532, '[SPACE] 다음', {
      fontSize: '9px', color: '#666666',
    }).setDepth(31);
    s(hint);

    this.dialogueBox = this.add.container(0, 0, [bg, this.dialogueNameText, this.dialogueText, hint]);
    (this.dialogueBox as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);
    this.dialogueBox.setDepth(30).setVisible(false);
    this.hudObjects.push(this.dialogueBox);

    // DialogueSystem 이벤트
    this.dialogue.on('dialogue_start', () => {
      this.dialogueBox.setVisible(true);
      this.dialogueActive = true;
    });

    this.dialogue.on('dialogue_line', (line: { speaker: string; text: string }) => {
      this.dialogueNameText.setText(line.speaker);
      this.dialogueText.setText(line.text);
    });

    this.dialogue.on('dialogue_end', () => {
      this.dialogueBox.setVisible(false);
      this.dialogueActive = false;
      const npcId = this.areaManager?.nearbyNpcId;
      this.areaManager?.clearNpcBubbles();
      if (npcId) {
        this.quest.onTalkedToNpc(npcId);
      }
    });
  }

  private buildSaveData(): Omit<SaveData, 'version' | 'timestamp'> {
    return {
      playtime: this.time.now - this.playtimeStart,
      currentArea: this.areaManager?.currentAreaId ?? 'scene_haven',
      player: {
        hp:          this.player.hp,
        maxHp:       this.player.maxHp,
        mp:          this.player.mp,
        level:       this.player.level,
        exp:         this.player.exp,
        gold:        this.player.gold,
        playerClass: this.inventory.getPlayerClass(),
      },
      inventory:   this.inventory.toJSON(),
      quests:      this.quest.toJSON(),
      puzzles:     this.puzzleSystem?.toJSON() ?? {},
      gates:       this.gateSystem?.toJSON()   ?? {},
      heartPieces: Object.fromEntries([...this.collectedHeartPieceIds].map(id => [id, true])),
    };
  }

  private handleEnemyRangedAttack(enemy: import('../entities/Enemy').Enemy): void {
    const PROJ_SPEED = 250;
    const proj = this.enemyProjectiles.create(enemy.x, enemy.y, 'enemy_projectile') as Phaser.Physics.Arcade.Image & { attackDamage: number; startX: number; startY: number };
    proj.attackDamage = enemy.attackDamage;
    proj.startX = enemy.x;
    proj.startY = enemy.y;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    proj.setVelocity(Math.cos(angle) * PROJ_SPEED, Math.sin(angle) * PROJ_SPEED);
    proj.setDepth(5);
  }

  private updateEnemyProjectiles(): void {
    const MAX_RANGE = 300;
    this.enemyProjectiles.getChildren().forEach(child => {
      const proj = child as Phaser.Physics.Arcade.Image & { startX: number; startY: number };
      if (!proj.active) return;
      if (Phaser.Math.Distance.Between(proj.startX, proj.startY, proj.x, proj.y) > MAX_RANGE) {
        proj.destroy();
      }
    });
  }

  /** 활성 보스의 발사체와 플레이어 충돌 처리 */
  private updateBossProjectiles(): void {
    this.activeBosses = this.activeBosses.filter(b => !b.isDead);
    for (const boss of this.activeBosses) {
      boss.projectiles.getChildren().forEach(child => {
        const proj = child as Phaser.Physics.Arcade.Image;
        if (!proj.active) return;
        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y);
        if (dist <= 12 && this.player.canBeHit) {
          const d = this.reducedIncoming(Math.round(boss.attackDamage * 0.8));
          this.player.takeDamage(d); this.spawnDamageNumber(this.player.x, this.player.y, d, true);
          proj.destroy();
        }
      });
    }
  }
}

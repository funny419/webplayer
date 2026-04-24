import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Goblin } from '../entities/Goblin';
import { BossBase } from '../entities/BossBase';
import { QuestSystem, QuestData } from '../systems/Quest';
import { InventorySystem } from '../systems/Inventory';
import { MenuOverlay } from '../ui/MenuOverlay';
import { SaveManager } from '../systems/SaveManager';
import type { SaveData } from '../systems/SaveManager';
import { AreaManager, type AreaScene } from '../systems/AreaManager';
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
  private projectiles!: Phaser.Physics.Arcade.Group;
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
  private playtimeStart = 0;

  // Combat input
  private attackKey!: Phaser.Input.Keyboard.Key;
  private rangedKey!: Phaser.Input.Keyboard.Key;
  private meleeCooldownRemaining = 0;
  private rangedCooldownRemaining = 0;

  // HUD
  private hpFill!: Phaser.GameObjects.Rectangle;
  private mpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private dashIndicator!: Phaser.GameObjects.Text;
  private fpsText!: Phaser.GameObjects.Text;

  currentArea = 'scene_haven';  // 현재 지역 ID — 세이브 탭 활성화 조건에 사용

  private gameOverTriggered = false;
  private dialogueActive = false;
  private enemyExpMap: Record<string, number> = {};
  private enemyDropMap: Record<string, { goldMin: number; goldMax: number; drops: Array<{ id: string; rate: number }> }> = {};
  private levelText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.projectiles = this.physics.add.group();
    this.walls = this.physics.add.staticGroup();
    this.initSystems();

    // DialogueSystem 초기화
    const dialogueData = this.cache.json.get('dialogues') as DialogueDataMap;
    this.dialogue = new DialogueSystem(dialogueData ?? {});
    this.setupDialogueUI();

    this.createAnimations();
    this.createProjectileTexture();

    this.spawnPlayer();
    this.setupCamera();
    this.setupInput();
    this.setupUI();
    this.setupBossEventHandlers();
    this.setupQuestEventHandlers();

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

    // Space 키: 대화 진행 또는 NPC 대화 시작
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      if (this.dialogue?.isPlaying()) {
        this.dialogue.next();
      } else if (this.areaManager?.nearbyNpcId) {
        this.dialogue.start(this.areaManager.nearbyNpcId);
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

    const dmg = Math.max(1, this.player.atk + this.inventory.getWeaponBonus());
    this.enemies.forEach(enemy => {
      if (enemy.isDead || !enemy.active) return;
      if (Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y) <= MELEE_RANGE) {
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
      if (!proj.active) return;

      if (Phaser.Math.Distance.Between(proj.startX, proj.startY, proj.x, proj.y) > RANGED_MAX_RANGE) {
        proj.destroy();
        return;
      }

      const rdmg = Math.max(1, Math.floor((this.player.atk + this.inventory.getWeaponBonus()) * 0.75));
      for (const enemy of this.enemies) {
        if (enemy.isDead || !enemy.active) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, enemy.x, enemy.y) <= 16) {
          enemy.takeDamage(rdmg);
          this.spawnDamageNumber(enemy.x, enemy.y, rdmg);
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
        const incoming = this.reducedIncoming(enemy.attackDamage);
        this.player.takeDamage(incoming);
        this.spawnDamageNumber(this.player.x, this.player.y, incoming, true);
        enemy.triggerAttackCooldown();
        break;
      }
    }
  }

  // ── HUD ─────────────────────────────────────────────────────────────────

  private setupUI(): void {
    const s = (obj: Phaser.GameObjects.GameObject) =>
      (obj as Phaser.GameObjects.Components.ScrollFactor & typeof obj).setScrollFactor(0);

    const BAR_W = 120;
    const BAR_H = 10;
    const LX = 10; // label x
    const BX = 36; // bar x

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
  }

  // ── 플로팅 데미지 숫자 ───────────────────────────────────────────────────

  private spawnDamageNumber(x: number, y: number, amount: number, isPlayer = false): void {
    const color = isPlayer ? '#ff4444' : '#ffee44';
    const txt = this.add.text(x, y - 8, `-${amount}`, {
      fontSize: isPlayer ? '14px' : '12px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(20);

    this.tweens.add({
      targets: txt,
      y: y - 36,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
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

  /** 플레이어 방어력(def + 장착 보너스)을 적용한 받는 피해량 */
  private reducedIncoming(raw: number): number {
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
    this.inventory = new InventorySystem();
    const questData = this.cache.json.get('quests') as { main_quests: QuestData[]; side_quests: QuestData[] };
    this.quest = new QuestSystem(questData, this.inventory);
    // mq_01은 게임 시작 시 즉시 수락
    this.quest.accept('mq_01');

    // 적 처치 EXP·드롭 조회 테이블 빌드
    type RegularEnemy = { id: string; exp: number; gold_drop: [number, number]; item_drops: Array<{ id: string; rate: number }> };
    const balance = this.cache.json.get('balance') as { enemies: { regular: RegularEnemy[] } };
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

    // 세이브 불러오기 → 인벤토리·퀘스트 상태 복원
    this.events.on('load_save', (data: import('../systems/SaveManager').SaveData) => {
      this.inventory.fromJSON(data.inventory);
      this.quest.fromJSON(data.quests);
      this.player.hp = Math.min(data.player.hp, this.player.maxHp);
      this.player.mp = Math.min(data.player.mp, this.player.maxMp);
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

  // ── 보스 연동 ────────────────────────────────────────────────────────────

  /** 보스를 씬에 등록. enemies 배열 + activeBosses 배열에 추가. */
  registerBoss(boss: BossBase): void {
    if (this.activeCollisionLayer) {
      this.physics.add.collider(boss, this.activeCollisionLayer);
    }
    this.enemies.push(boss);
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
      }
    });

    // 키 아이템 드롭 → Inventory 연동
    this.events.on('boss_key_item', (itemId: string) => {
      this.inventory.addKeyItem(itemId);
    });
  }

  private setupDialogueUI(): void {
    const s = (obj: Phaser.GameObjects.GameObject) =>
      (obj as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor(0);

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
      player: {
        hp:          this.player.hp,
        mp:          this.player.mp,
        level:       this.player.level,
        exp:         this.player.exp,
        gold:        this.player.gold,
        playerClass: this.inventory.toJSON().equipment.weapon?.includes('staff')
                       ? 'class_mage' : 'class_swordsman',
      },
      inventory: this.inventory.toJSON(),
      quests:    this.quest.toJSON(),
      puzzles:   {},
    };
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

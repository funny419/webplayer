import Phaser from 'phaser';

type PuzzleId = 'puzzle_forest' | 'puzzle_ruins' | 'puzzle_cavern' | 'puzzle_castle';

const AREA_TO_PUZZLE: Partial<Record<string, PuzzleId>> = {
  scene_forest:  'puzzle_forest',
  scene_ruins:   'puzzle_ruins',
  scene_cavern:  'puzzle_cavern',
  scene_castle:  'puzzle_castle',
  scene_fortress: 'puzzle_castle',
};

const INTERACT_RANGE = 48;

export class PuzzleSystem {
  private solved = new Set<string>();
  private activeCleanup: (() => void) | null = null;

  /** Space 키 인터랙션 콜백. null이면 비활성. */
  interactFn: (() => void) | null = null;
  /** 근처에 상호작용 가능한 퍼즐 요소가 있는지 */
  nearInteractable = false;

  constructor(savedPuzzles: Record<string, boolean> = {}) {
    for (const [id, v] of Object.entries(savedPuzzles)) {
      if (v) this.solved.add(id);
    }
  }

  isSolved(id: string): boolean { return this.solved.has(id); }

  toJSON(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const id of this.solved) out[id] = true;
    return out;
  }

  loadSolved(saved: Record<string, boolean>): void {
    for (const [id, v] of Object.entries(saved)) {
      if (v) this.solved.add(id);
    }
  }

  /** 지역 로드 시 호출. 퍼즐 오브젝트를 씬에 생성. */
  initPuzzle(
    areaId: string,
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
  ): void {
    this.cleanup();

    const puzzleId = AREA_TO_PUZZLE[areaId];
    if (!puzzleId) return;

    if (this.solved.has(puzzleId)) {
      // 이미 해결됨 — 한 프레임 후 이벤트 발행 (문 열림 등 처리용)
      scene.time.delayedCall(200, () => scene.events.emit('puzzle_already_solved', puzzleId));
      return;
    }

    switch (areaId) {
      case 'scene_forest':
        this.activeCleanup = this.createSwitchPuzzle(scene, player, puzzleId);
        break;
      case 'scene_ruins':
        this.activeCleanup = this.createBlockPuzzle(scene, player, puzzleId);
        break;
      case 'scene_cavern':
        this.activeCleanup = this.createTorchPuzzle(scene, player, puzzleId);
        break;
      case 'scene_castle':
      case 'scene_fortress':
        this.activeCleanup = this.createMirrorPuzzle(scene, player, puzzleId);
        break;
    }
  }

  /** Space 키 인터랙션 처리. 처리했으면 true 반환. */
  tryInteract(): boolean {
    if (!this.interactFn) return false;
    this.interactFn();
    return true;
  }

  /** 지역 전환 시 퍼즐 오브젝트 정리. */
  cleanup(): void {
    this.activeCleanup?.();
    this.activeCleanup = null;
    this.interactFn = null;
    this.nearInteractable = false;
  }

  // ── 공통 헬퍼 ─────────────────────────────────────────────────────────

  private markSolved(puzzleId: string, scene: Phaser.Scene): void {
    this.solved.add(puzzleId);
    // cleanup은 다음 프레임에 — 물리 콜백 중 destroy 방지
    scene.time.delayedCall(50, () => this.cleanup());
    scene.events.emit('puzzle_solved', puzzleId);
  }

  private makeHint(scene: Phaser.Scene, x: number, y: number, text: string): Phaser.GameObjects.Text {
    return scene.add.text(x, y, text, {
      fontSize: '9px', color: '#ffee66',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5) as Phaser.GameObjects.Text;
  }

  // ── 1. 압력 스위치 퍼즐 (숲) ────────────────────────────────────────────
  // 3개 패드를 순서(1→2→3)대로 밟으면 해결. 틀리면 리셋.
  private createSwitchPuzzle(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    puzzleId: string,
  ): () => void {
    // 맵 크기 기준으로 위치 계산
    const bx = scene.physics.world.bounds.width;
    const by = scene.physics.world.bounds.height;
    const cx = Math.round(bx * 0.35);
    const cy = Math.round(by * 0.35);

    const positions = [
      { x: cx,      y: cy },
      { x: cx + 36, y: cy },
      { x: cx + 72, y: cy },
    ];
    const CORRECT = [0, 1, 2];
    const cooldowns = [0, 0, 0];
    let progress = 0;
    const activated = [false, false, false];

    const objs: Phaser.GameObjects.GameObject[] = [];
    objs.push(this.makeHint(scene, cx + 36, cy - 30, '순서대로 밟으시오: ① ② ③'));

    const pads: Phaser.GameObjects.Rectangle[] = [];
    const overlaps: Phaser.Physics.Arcade.Collider[] = [];

    for (let i = 0; i < 3; i++) {
      const { x, y } = positions[i];
      const pad = scene.add
        .rectangle(x, y, 28, 28, 0x4455cc)
        .setDepth(2) as Phaser.GameObjects.Rectangle;
      scene.physics.add.existing(pad, true);
      pads.push(pad);
      objs.push(pad);

      objs.push(
        scene.add.text(x, y, `${i + 1}`, { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' })
          .setOrigin(0.5).setDepth(3) as Phaser.GameObjects.Text,
      );

      const idx = i;
      const ov = scene.physics.add.overlap(player, pad, () => {
        if (cooldowns[idx] > 0 || activated[idx]) return;
        cooldowns[idx] = 600;

        if (CORRECT[progress] === idx) {
          activated[idx] = true;
          pad.setFillStyle(0x44cc44);
          progress++;
          if (progress === CORRECT.length) this.markSolved(puzzleId, scene);
        } else {
          // 틀린 순서 → 전체 리셋
          progress = 0;
          activated.fill(false);
          pads.forEach(p => p.setFillStyle(0x4455cc));
        }
      });
      overlaps.push(ov as unknown as Phaser.Physics.Arcade.Collider);
    }

    // 쿨다운 타이머
    const timer = scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        for (let i = 0; i < cooldowns.length; i++) {
          if (cooldowns[i] > 0) cooldowns[i] = Math.max(0, cooldowns[i] - 50);
        }
      },
    });

    return () => {
      objs.forEach(o => { if ((o as Phaser.GameObjects.GameObject).active) o.destroy(); });
      overlaps.forEach(ov => scene.physics.world.removeCollider(ov));
      timer.remove();
    };
  }

  // ── 2. 블록 밀기 퍼즐 (유적) — 간략 버전 ──────────────────────────────────
  // Space로 블록을 슬롯 방향으로 한 칸씩 이동. 슬롯 도착 → 해결.
  private createBlockPuzzle(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    puzzleId: string,
  ): () => void {
    const bx = scene.physics.world.bounds.width;
    const by = scene.physics.world.bounds.height;
    const cx = Math.round(bx * 0.35);
    const cy = Math.round(by * 0.35);

    const slotPos  = { x: cx,      y: cy - 56 };
    const startPos = { x: cx,      y: cy };
    const STEP = 16;

    const objs: Phaser.GameObjects.GameObject[] = [];
    objs.push(this.makeHint(scene, cx, cy - 80, '[Space] 블록을 슬롯에 밀어 넣으시오'));

    // 목표 슬롯 (초록 테두리)
    const slot = scene.add.rectangle(slotPos.x, slotPos.y, 32, 32, 0x113311)
      .setStrokeStyle(2, 0x44cc44).setDepth(1) as Phaser.GameObjects.Rectangle;
    scene.add.text(slotPos.x, slotPos.y, '홈', { fontSize: '9px', color: '#88ff88' })
      .setOrigin(0.5).setDepth(2);
    objs.push(slot);

    // 블록
    let bBlockX = startPos.x;
    let bBlockY = startPos.y;
    const block = scene.add.rectangle(bBlockX, bBlockY, 32, 32, 0x885522)
      .setDepth(2) as Phaser.GameObjects.Rectangle;
    const blockLbl = scene.add.text(bBlockX, bBlockY, '돌\n블록', {
      fontSize: '8px', color: '#fff', align: 'center',
    }).setOrigin(0.5).setDepth(3) as Phaser.GameObjects.Text;
    objs.push(block, blockLbl);

    let interactCooldown = 0;

    const interact = () => {
      if (interactCooldown > 0) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, bBlockX, bBlockY);
      if (dist > INTERACT_RANGE) return;

      interactCooldown = 300;

      const dx = slotPos.x - bBlockX;
      const dy = slotPos.y - bBlockY;
      if (Math.abs(dx) >= Math.abs(dy)) {
        bBlockX += Math.sign(dx) * STEP;
      } else {
        bBlockY += Math.sign(dy) * STEP;
      }

      block.setPosition(bBlockX, bBlockY);
      blockLbl.setPosition(bBlockX, bBlockY);

      if (Math.abs(bBlockX - slotPos.x) < 8 && Math.abs(bBlockY - slotPos.y) < 8) {
        block.setFillStyle(0x44cc44);
        this.markSolved(puzzleId, scene);
      }
    };

    const timer = scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (interactCooldown > 0) interactCooldown = Math.max(0, interactCooldown - 80);
        const dist = Phaser.Math.Distance.Between(player.x, player.y, bBlockX, bBlockY);
        this.nearInteractable = dist <= INTERACT_RANGE;
        this.interactFn = this.nearInteractable ? interact : null;
      },
    });

    return () => {
      objs.forEach(o => { if ((o as Phaser.GameObjects.GameObject).active) o.destroy(); });
      timer.remove();
      this.interactFn = null;
      this.nearInteractable = false;
    };
  }

  // ── 3. 횃불 점화 퍼즐 (동굴) ─────────────────────────────────────────────
  // 4개 횃불을 ①②③④ 순서로 점화. Space로 상호작용. 틀리면 전체 꺼짐.
  private createTorchPuzzle(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    puzzleId: string,
  ): () => void {
    const bw = scene.physics.world.bounds.width;
    const bh = scene.physics.world.bounds.height;
    const cx = Math.round(bw * 0.35);
    const cy = Math.round(bh * 0.35);

    const TORCH_POS = [
      { x: cx,      y: cy },
      { x: cx + 40, y: cy + 20 },
      { x: cx + 80, y: cy },
      { x: cx + 40, y: cy - 20 },
    ];
    const CORRECT = [0, 1, 2, 3]; // 점화 순서
    let progress = 0;
    const lit = [false, false, false, false];

    const objs: Phaser.GameObjects.GameObject[] = [];
    objs.push(this.makeHint(scene, cx + 40, cy - 48, '횃불을 순서대로 ①②③④ 점화하시오'));

    const torches: Phaser.GameObjects.Rectangle[] = [];

    for (let i = 0; i < 4; i++) {
      const { x, y } = TORCH_POS[i];
      const torch = scene.add
        .rectangle(x, y, 16, 24, 0x443322)
        .setDepth(2) as Phaser.GameObjects.Rectangle;
      torches.push(torch);
      objs.push(torch);

      objs.push(
        scene.add.text(x, y - 18, `${i + 1}`, { fontSize: '10px', color: '#cc8833', fontStyle: 'bold' })
          .setOrigin(0.5).setDepth(3) as Phaser.GameObjects.Text,
      );
    }

    let nearTorchIdx = -1;
    let interactCooldown = 0;

    const interact = () => {
      if (nearTorchIdx < 0 || interactCooldown > 0) return;
      interactCooldown = 400;

      const i = nearTorchIdx;
      if (CORRECT[progress] === i && !lit[i]) {
        lit[i] = true;
        torches[i].setFillStyle(0xff9922);
        progress++;
        if (progress === 4) this.markSolved(puzzleId, scene);
      } else if (!lit[i]) {
        // 틀린 횃불 → 전체 리셋
        progress = 0;
        lit.fill(false);
        torches.forEach(t => t.setFillStyle(0x443322));
      }
    };

    const timer = scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (interactCooldown > 0) interactCooldown = Math.max(0, interactCooldown - 80);

        let minDist = INTERACT_RANGE + 1;
        nearTorchIdx = -1;
        for (let i = 0; i < 4; i++) {
          const d = Phaser.Math.Distance.Between(
            player.x, player.y, TORCH_POS[i].x, TORCH_POS[i].y,
          );
          if (d <= INTERACT_RANGE && d < minDist) {
            minDist = d;
            nearTorchIdx = i;
          }
        }

        this.nearInteractable = nearTorchIdx >= 0;
        this.interactFn = this.nearInteractable ? interact : null;
      },
    });

    return () => {
      objs.forEach(o => { if ((o as Phaser.GameObjects.GameObject).active) o.destroy(); });
      timer.remove();
      this.interactFn = null;
      this.nearInteractable = false;
    };
  }

  // ── 4. 거울 반사 퍼즐 (성) — 간략 버전 ────────────────────────────────────
  // 거울 3개를 Space로 회전. 정답 배열 일치 → 봉인 해제.
  private createMirrorPuzzle(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    puzzleId: string,
  ): () => void {
    const bw = scene.physics.world.bounds.width;
    const bh = scene.physics.world.bounds.height;
    const cx = Math.round(bw * 0.35);
    const cy = Math.round(bh * 0.35);

    const MIRROR_POS = [
      { x: cx,      y: cy },
      { x: cx + 44, y: cy },
      { x: cx + 88, y: cy },
    ];
    const CORRECT_STATE = [1, 0, 1]; // 0=가로, 1=세로
    const state = [0, 0, 0];

    const objs: Phaser.GameObjects.GameObject[] = [];
    objs.push(this.makeHint(scene, cx + 44, cy - 36, '[Space]로 거울을 회전하여 빛 경로를 완성'));

    const mirrors: { rect: Phaser.GameObjects.Rectangle; lbl: Phaser.GameObjects.Text }[] = [];

    for (let i = 0; i < 3; i++) {
      const { x, y } = MIRROR_POS[i];
      const rect = scene.add.rectangle(x, y, 24, 8, 0x88ccee)
        .setDepth(2) as Phaser.GameObjects.Rectangle;
      const lbl = scene.add.text(x, y + 16, '─', { fontSize: '10px', color: '#88ccee' })
        .setOrigin(0.5).setDepth(3) as Phaser.GameObjects.Text;
      mirrors.push({ rect, lbl });
      objs.push(rect, lbl);
    }

    const updateVisuals = () => {
      for (let i = 0; i < 3; i++) {
        if (state[i] === 0) {
          mirrors[i].rect.setDisplaySize(24, 8);
          mirrors[i].lbl.setText('─');
        } else {
          mirrors[i].rect.setDisplaySize(8, 24);
          mirrors[i].lbl.setText('│');
        }
      }
    };
    updateVisuals();

    let nearMirrorIdx = -1;
    let interactCooldown = 0;

    const interact = () => {
      if (nearMirrorIdx < 0 || interactCooldown > 0) return;
      interactCooldown = 400;
      state[nearMirrorIdx] = (state[nearMirrorIdx] + 1) % 2;
      updateVisuals();
      if (CORRECT_STATE.every((v, i) => v === state[i])) {
        this.markSolved(puzzleId, scene);
      }
    };

    const timer = scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (interactCooldown > 0) interactCooldown = Math.max(0, interactCooldown - 80);

        let minDist = INTERACT_RANGE + 1;
        nearMirrorIdx = -1;
        for (let i = 0; i < 3; i++) {
          const d = Phaser.Math.Distance.Between(
            player.x, player.y, MIRROR_POS[i].x, MIRROR_POS[i].y,
          );
          if (d <= INTERACT_RANGE && d < minDist) {
            minDist = d;
            nearMirrorIdx = i;
          }
        }

        this.nearInteractable = nearMirrorIdx >= 0;
        this.interactFn = this.nearInteractable ? interact : null;
      },
    });

    return () => {
      objs.forEach(o => { if ((o as Phaser.GameObjects.GameObject).active) o.destroy(); });
      timer.remove();
      this.interactFn = null;
      this.nearInteractable = false;
    };
  }
}

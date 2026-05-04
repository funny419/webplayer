import Phaser from 'phaser';
import type { InventorySystem } from './Inventory';

const HINT_RANGE = 72;
const HINT_MSG = '무언가가 있으면 통과할 수 있을 것 같다.';

export interface GateObjectData {
  gateId:   string;  // 'gate_compass'
  requires: string;  // 'key_compass'
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GateRuntime extends GateObjectData {
  opened: boolean;
  wall:    Phaser.GameObjects.Rectangle | null;
  label:   Phaser.GameObjects.Text | null;
  collider: Phaser.Physics.Arcade.Collider | null;
}

export class GateSystem {
  /** gateId → 열림 여부 (세이브 데이터 기반) */
  private openedSet = new Set<string>();
  /** 현재 지역의 게이트 목록 */
  private activeGates: GateRuntime[] = [];

  private scene!: Phaser.Scene;
  private player!: Phaser.Physics.Arcade.Sprite;
  private inventory!: InventorySystem;

  private hintCooldown = 0;
  private msgText!: Phaser.GameObjects.Text;

  constructor(saved: Record<string, boolean> = {}) {
    for (const [id, v] of Object.entries(saved)) {
      if (v) this.openedSet.add(id);
    }
  }

  // ── 직렬화 ─────────────────────────────────────────────────────────────

  toJSON(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const id of this.openedSet) out[id] = true;
    return out;
  }

  loadSaved(saved: Record<string, boolean>): void {
    for (const [id, v] of Object.entries(saved)) {
      if (v) this.openedSet.add(id);
    }
    // 이미 열린 게이트를 현재 활성 게이트에도 반영
    for (const gate of this.activeGates) {
      if (this.openedSet.has(gate.gateId) && !gate.opened) {
        this.destroyWall(gate);
        gate.opened = true;
      }
    }
  }

  // ── 지역 초기화 ────────────────────────────────────────────────────────

  initGates(
    objects: GateObjectData[],
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    inventory: InventorySystem,
  ): void {
    this.cleanup();
    this.scene    = scene;
    this.player   = player;
    this.inventory = inventory;

    if (!this.msgText || !this.msgText.active) {
      this.msgText = scene.add.text(480, 490, '', {
        fontSize: '13px', color: '#ffff88',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(20).setVisible(false);
    }

    for (const obj of objects) {
      const alreadyOpen = this.openedSet.has(obj.gateId) || this.inventory.hasKeyItem(obj.requires);
      const gate: GateRuntime = { ...obj, opened: alreadyOpen, wall: null, label: null, collider: null };

      if (alreadyOpen) {
        this.openedSet.add(obj.gateId);
      } else {
        this.buildWall(gate);
      }
      this.activeGates.push(gate);
    }
  }

  // ── 업데이트 (매 프레임) ───────────────────────────────────────────────

  update(delta: number): void {
    if (!this.player) return;
    if (this.hintCooldown > 0) this.hintCooldown = Math.max(0, this.hintCooldown - delta);

    for (const gate of this.activeGates) {
      if (gate.opened) continue;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        gate.x + gate.w / 2, gate.y + gate.h / 2,
      );

      if (dist <= HINT_RANGE) {
        if (this.inventory.hasKeyItem(gate.requires)) {
          this.openGate(gate.gateId);
        } else if (this.hintCooldown <= 0) {
          this.showHint();
          this.hintCooldown = 2500;
        }
      }
    }
  }

  // ── 게이트 열기 ─────────────────────────────────────────────────────────

  /** 키 아이템 ID를 받아 해당 게이트 자동 개방 */
  tryOpenByKeyItem(keyItemId: string): void {
    for (const gate of this.activeGates) {
      if (gate.requires === keyItemId && !gate.opened) {
        this.openGate(gate.gateId);
      }
    }
  }

  openGate(gateId: string): void {
    const gate = this.activeGates.find(g => g.gateId === gateId);
    if (!gate || gate.opened) return;
    gate.opened = true;
    this.openedSet.add(gateId);
    this.destroyWall(gate);
    this.showOpenNotification(gate);
  }

  // ── 지역 정리 ─────────────────────────────────────────────────────────

  cleanup(): void {
    for (const gate of this.activeGates) {
      this.destroyWall(gate);
    }
    this.activeGates = [];
    this.hintCooldown = 0;
  }

  // ── 헬퍼 ──────────────────────────────────────────────────────────────

  private buildWall(gate: GateRuntime): void {
    const cx = gate.x + gate.w / 2;
    const cy = gate.y + gate.h / 2;

    const wall = this.scene.add.rectangle(cx, cy, gate.w, gate.h, 0x226622, 0.85)
      .setDepth(2) as Phaser.GameObjects.Rectangle;
    this.scene.physics.add.existing(wall, true);

    const ov = this.scene.physics.add.collider(
      this.player as unknown as Phaser.GameObjects.GameObject,
      wall,
    );
    gate.collider = ov as unknown as Phaser.Physics.Arcade.Collider;

    const lbl = this.scene.add.text(cx, cy, '🔒', { fontSize: '14px' })
      .setOrigin(0.5).setDepth(3) as Phaser.GameObjects.Text;

    gate.wall  = wall;
    gate.label = lbl;
  }

  private destroyWall(gate: GateRuntime): void {
    if (gate.collider) {
      this.scene?.physics.world.removeCollider(gate.collider);
      gate.collider = null;
    }
    if (gate.wall?.active) { gate.wall.destroy(); gate.wall = null; }
    if (gate.label?.active) { gate.label.destroy(); gate.label = null; }
  }

  private showHint(): void {
    if (!this.msgText || !this.msgText.active) return;
    this.msgText.setText(HINT_MSG).setVisible(true);
    this.scene.time.delayedCall(2000, () => {
      if (this.msgText?.active) this.msgText.setVisible(false);
    });
  }

  private showOpenNotification(gate: GateRuntime): void {
    const names: Record<string, string> = {
      gate_compass:    '덤불 길이 열렸다!',
      gate_hookshot:   '틈을 넘어갈 수 있다!',
      gate_flameshield: '용암 통로를 지날 수 있다!',
    };
    const msg = names[gate.gateId] ?? '게이트가 열렸다!';

    const txt = this.scene.add.text(
      this.scene.scale.width / 2, this.scene.scale.height / 2 - 50,
      msg,
      { fontSize: '16px', color: '#88ffbb', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 },
    ).setScrollFactor(0).setOrigin(0.5).setDepth(25);

    this.scene.tweens.add({
      targets: txt, y: txt.y - 40, alpha: 0,
      duration: 2000, ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }
}

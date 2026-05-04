import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const hasSave = new SaveManager().hasSave();
    let hasClear = false;
    try { hasClear = !!localStorage.getItem('eteria_clear'); } catch { /* 무시 */ }

    this.cameras.main.setBackgroundColor(0x000000);

    // 타이틀
    const titleText = hasClear ? '에테리아의 균열  ★' : '에테리아의 균열';
    this.add
      .text(width / 2, height / 2 - 100, titleText, {
        fontSize: '42px',
        color: '#f1c40f',
        stroke: '#000000',
        strokeThickness: 4,
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // 부제
    this.add
      .text(width / 2, height / 2 - 52, 'Crack of Eteria', {
        fontSize: '16px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // 새 게임 버튼 (항상 표시)
    this.add
      .text(width / 2, height / 2 + 20, '[ENTER]  새 게임', {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
      .once('down', () => this.scene.start('CharSelectScene'));

    // 계속하기 버튼 (세이브 있을 때만)
    if (hasSave) {
      this.add
        .text(width / 2, height / 2 + 60, '[L]  계속하기', {
          fontSize: '22px',
          color: '#aaaaaa',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);

      this.input.keyboard!
        .addKey(Phaser.Input.Keyboard.KeyCodes.L)
        .once('down', () => this.scene.start('WorldScene', { fromSave: true }));
    }

    // 조작 안내
    const controls = 'O: 근접공격   P: 원거리   K: 특수   Shift: 대시   I: 인벤토리   Q: 퀘스트';
    this.add
      .text(width / 2, height - 28, controls, {
        fontSize: '11px',
        color: '#555555',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);
  }
}

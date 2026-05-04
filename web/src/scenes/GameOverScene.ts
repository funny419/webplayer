import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const saveManager = new SaveManager();
    const hasSave = saveManager.hasSave();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    this.add
      .text(width / 2, height / 2 - 60, 'GAME OVER', {
        fontSize: '48px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    if (hasSave) {
      this.add
        .text(width / 2, height / 2 + 10, '[R]  세이브에서 계속', {
          fontSize: '22px',
          color: '#ffffff',
        })
        .setOrigin(0.5);

      this.input.keyboard!
        .addKey(Phaser.Input.Keyboard.KeyCodes.R)
        .once('down', () => this.scene.start('WorldScene', { fromSave: true }));
    }

    this.add
      .text(width / 2, height / 2 + (hasSave ? 52 : 10), '[N]  처음부터', {
        fontSize: '22px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.N)
      .once('down', () => this.scene.start('CharSelectScene'));
  }
}

import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    this.add
      .text(width / 2, height / 2 - 50, 'GAME OVER', {
        fontSize: '48px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, '[R]  Retry', {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.input.keyboard!
      .addKey(Phaser.Input.Keyboard.KeyCodes.R)
      .once('down', () => this.scene.start('BootScene'));
  }
}

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 부트에서는 최소한의 로딩 에셋만 처리
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}

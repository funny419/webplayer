import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.scale;

    // 로딩 바 배경
    const barBg = this.add.rectangle(width / 2, height / 2, 320, 20, 0x333333);
    const bar = this.add.rectangle(barBg.x - 160, height / 2, 0, 16, 0x00ff88);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 320 * value;
    });

    // 추후 실제 에셋 로드 위치
  }

  create(): void {
    // 에셋 로딩 완료 후 MenuScene으로 이동 (현재는 플레이스홀더 텍스트)
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'Preload Complete!\n(MenuScene 준비 중)', {
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}

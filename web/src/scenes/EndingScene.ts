import Phaser from 'phaser';

interface ClearData {
  playtime: number;
  level: number;
  questsPct: number;
  date: string;
}

const EPILOGUE_LINES = [
  '봉인이 복원되었다.',
  '에테리아에 평화가 찾아왔다.',
  '아이든은 마을로 돌아갔다.',
  '그러나 부모의 실종 사건은... 아직 끝나지 않았다.',
];

const CREDITS = [
  '에테리아의 균열',
  'Crack of Eteria',
  '',
  '기획 · 시나리오',
  'game-planner',
  '',
  '개발',
  'web-dev',
  '',
  '문서 · 운영',
  'writer',
  '',
  '아트 (Placeholder)',
  'designer',
  '',
  'Special Thanks',
  '플레이해 주셔서 감사합니다.',
];

export class EndingScene extends Phaser.Scene {
  private clearData: ClearData = { playtime: 0, level: 1, questsPct: 0, date: '' };

  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data: ClearData): void {
    this.clearData = data;
    // GDD §12: localStorage에 클리어 데이터 저장
    try {
      localStorage.setItem(
        'eteria_clear',
        JSON.stringify({
          time: data.playtime,
          level: data.level,
          quests_pct: data.questsPct,
          date: data.date,
        }),
      );
    } catch { /* storage 미지원 환경 무시 */ }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x000000);
    // GDD §12 Stage 2: 페이드 아웃 완료 후 페이드 인
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.time.delayedCall(1200, () => this.showEpilogue());
  }

  // ── Stage 3: 에필로그 텍스트 ────────────────────────────────────────────

  private showEpilogue(): void {
    const { width, height } = this.scale;
    const textObjs: Phaser.GameObjects.Text[] = [];

    EPILOGUE_LINES.forEach((line, i) => {
      const t = this.add
        .text(width / 2, height / 2 - 66 + i * 44, '', {
          fontSize: '22px',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setAlpha(0);
      textObjs.push(t);

      this.time.delayedCall(i * 2600, () => {
        this.tweens.add({ targets: t, alpha: 1, duration: 400 });
        this.typeText(t, line);
      });
    });

    // 모든 줄 표시 후 페이드 아웃 → 스태프 롤
    const epilogueDuration = EPILOGUE_LINES.length * 2600 + 1500;
    this.time.delayedCall(epilogueDuration, () => {
      this.tweens.add({
        targets: textObjs,
        alpha: 0,
        duration: 800,
        onComplete: () => {
          textObjs.forEach(t => t.destroy());
          this.showStaffRoll();
        },
      });
    });
  }

  private typeText(textObj: Phaser.GameObjects.Text, fullText: string): void {
    let charIndex = 0;
    this.time.addEvent({
      delay: 55,
      repeat: fullText.length - 1,
      callback: () => {
        charIndex++;
        textObj.setText(fullText.substring(0, charIndex));
      },
    });
  }

  // ── Stage 4: 스태프 롤 ──────────────────────────────────────────────────

  private showStaffRoll(): void {
    const { width, height } = this.scale;
    const container = this.add.container(0, 0);
    const lineHeight = 36;

    CREDITS.forEach((line, i) => {
      const isTitle = i === 0;
      container.add(
        this.add
          .text(width / 2, height + 20 + i * lineHeight, line, {
            fontSize: isTitle ? '26px' : '18px',
            color: isTitle ? '#ffcc00' : '#aaaaaa',
            align: 'center',
          })
          .setOrigin(0.5),
      );
    });

    const scrollDist = height + 20 + CREDITS.length * lineHeight + 80;

    this.tweens.add({
      targets: container,
      y: -scrollDist,
      duration: 20000,
      ease: 'Linear',
      onComplete: () => {
        container.destroy();
        this.showClearResult();
      },
    });
  }

  // ── Stage 5: 클리어 결과 화면 ───────────────────────────────────────────

  private showClearResult(): void {
    const { width, height } = this.scale;
    const { playtime, level, questsPct } = this.clearData;

    const totalSec = Math.floor(playtime / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');

    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add
      .text(width / 2, height / 2 - 110, '[ C L E A R ]', {
        fontSize: '14px',
        color: '#888888',
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 78, '에테리아의 영웅', {
        fontSize: '36px',
        color: '#ffcc00',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const stats = [
      `플레이 시간   ${mm}:${ss}`,
      `최종 레벨     ${level}`,
      `완료 퀘스트   ${questsPct}%`,
      `획득 칭호     에테리아의 영웅`,
    ];

    stats.forEach((line, i) => {
      this.add
        .text(width / 2, height / 2 - 8 + i * 38, line, {
          fontSize: '18px',
          color: '#cccccc',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5);
    });

    // Stage 6: 타이틀 복귀 버튼
    const btn = this.add
      .text(width / 2, height / 2 + 158, '[ 타이틀로 돌아가기 ]', {
        fontSize: '20px',
        color: '#00ff88',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor('#00ff88'));
    btn.on('pointerdown', () => this.scene.start('TitleScene'));

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('TitleScene'));
    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('TitleScene'));
  }
}

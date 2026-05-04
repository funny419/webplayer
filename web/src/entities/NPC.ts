import Phaser from 'phaser';

/**
 * NPC 엔티티
 * - 정적 스프라이트 (이동 없음)
 * - 플레이어 접근 시 말풍선 아이콘 표시
 * - 상호작용 준비 여부를 isInteractable 상태로 관리
 *
 * WorldScene에서 physics.add.overlap(player, npc) 감지 후
 * scene.events.emit('npc_interact_ready', npcId) 발행
 */
export class NPC extends Phaser.Physics.Arcade.Sprite {
  readonly npcId: string;

  private bubble!: Phaser.GameObjects.Text;
  private _interactable = false;

  constructor(scene: Phaser.Scene, x: number, y: number, npcId: string) {
    // npcId 자체가 텍스처 키 (예: 'npc_elder') — 로드되어 있으면 사용, 없으면 placeholder 색상
    const textureKey = npcId;
    const texture = scene.textures.exists(textureKey) ? textureKey : '__DEFAULT';

    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body — NPC는 이동하지 않음

    this.npcId = npcId;

    if (texture !== '__DEFAULT') {
      const animKey = `${textureKey}_idle`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 1 }),
          frameRate: 2,
          repeat: -1,
        });
      }
      this.play(animKey);
    } else {
      // placeholder: 노란색 사각형
      this.setTint(0xffcc44);
    }

    // 말풍선 아이콘 (상호작용 가능 표시)
    this.bubble = scene.add.text(x, y - 28, '💬', {
      fontSize: '14px',
    }).setOrigin(0.5).setDepth(15).setVisible(false);
  }

  showBubble(show: boolean): void {
    this._interactable = show;
    this.bubble.setVisible(show);
  }

  get isInteractable(): boolean {
    return this._interactable;
  }

  destroy(fromScene?: boolean): void {
    this.bubble?.destroy();
    super.destroy(fromScene);
  }
}

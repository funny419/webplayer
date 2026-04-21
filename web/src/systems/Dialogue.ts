import Phaser from 'phaser';

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueEntry {
  npc: string;
  lines: DialogueLine[];
}

export type DialogueDataMap = Record<string, DialogueEntry>;

/**
 * NPC 대화 시스템 (선형, 분기 없음 — M3 범위)
 *
 * 이벤트:
 *   dialogue_start(dialogueId, npcId)
 *   dialogue_line(line: DialogueLine)
 *   dialogue_end()
 */
export class DialogueSystem extends Phaser.Events.EventEmitter {
  private dialogues: DialogueDataMap;
  private currentLines: DialogueLine[] = [];
  private currentIndex = 0;
  private active = false;

  constructor(dialogueData: DialogueDataMap) {
    super();
    this.dialogues = dialogueData;
  }

  /**
   * 대화를 시작한다. 첫 번째 대사를 dialogue_line 이벤트로 발행한다.
   * @returns 대화 ID가 존재하면 true
   */
  start(dialogueId: string): boolean {
    const entry = this.dialogues[dialogueId];
    if (!entry || entry.lines.length === 0) return false;

    this.currentLines = entry.lines;
    this.currentIndex = 0;
    this.active = true;

    this.emit('dialogue_start', dialogueId, entry.npc);
    this.emit('dialogue_line', this.currentLines[0]);
    return true;
  }

  /**
   * 다음 대사로 진행한다. 마지막 대사 이후 호출하면 대화를 종료한다.
   * @returns 다음 대사 또는 null (대화 종료)
   */
  next(): DialogueLine | null {
    if (!this.active) return null;

    this.currentIndex++;
    if (this.currentIndex >= this.currentLines.length) {
      this.end();
      return null;
    }

    const line = this.currentLines[this.currentIndex];
    this.emit('dialogue_line', line);
    return line;
  }

  getCurrentLine(): DialogueLine | null {
    if (!this.active || this.currentLines.length === 0) return null;
    return this.currentLines[this.currentIndex] ?? null;
  }

  isPlaying(): boolean {
    return this.active;
  }

  end(): void {
    this.active = false;
    this.currentLines = [];
    this.currentIndex = 0;
    this.emit('dialogue_end');
  }
}

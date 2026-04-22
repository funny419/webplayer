import type Phaser from 'phaser';
import type { InventorySystem } from '../systems/Inventory';
import type { QuestSystem } from '../systems/Quest';
import type { SaveManager, SaveData } from '../systems/SaveManager';

type Tab = 'inventory' | 'quest' | 'save';

export class MenuOverlay {
  private el: HTMLDivElement;
  private isOpen = false;
  private activeTab: Tab = 'inventory';

  constructor(
    private scene: Phaser.Scene & { currentArea: string },
    private inventory: InventorySystem,
    private quest: QuestSystem,
    private saveManager: SaveManager,
    private getSaveData: () => Omit<SaveData, 'version' | 'timestamp'>,
  ) {
    this.el = this.createDOM();
    this.attachEscListener();
  }

  private createDOM(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'menu-overlay';
    el.style.cssText = [
      'position:absolute', 'inset:0', 'z-index:10',
      'background:rgba(0,0,0,0.85)',
      'font-family:monospace', 'color:#eee',
    ].join(';');
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  open(tab: Tab): void {
    if (this.isOpen) {
      this.close();
      return;
    }
    this.isOpen = true;
    this.activeTab = tab;
    this.el.style.display = 'flex';
    this.el.style.flexDirection = 'column';
    this.scene.scene.pause();
    this.render();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.style.display = 'none';
    this.scene.scene.resume();
  }

  destroy(): void {
    this.el.remove();
  }

  private attachEscListener(): void {
    // I/Q 키도 DOM 레벨로 등록 — Phaser scene.pause() 중에는 Phaser Input Plugin이 중단되므로
    // Phaser addKey()로는 pause 상태에서 키 수신 불가. I/Q 토글·ESC 닫기 모두 DOM으로 처리.
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'i' || e.key === 'I') this.close();
      if (e.key === 'q' || e.key === 'Q') this.close();
    });
  }

  private render(): void {
    this.el.innerHTML = '';
    this.el.appendChild(this.buildTabBar());
    this.el.appendChild(this.buildContent());
  }

  private buildTabBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;border-bottom:1px solid #333;padding:12px 16px;gap:24px;align-items:center;';

    const tabs: { id: Tab; label: string }[] = [
      { id: 'inventory', label: '📦 인벤토리' },
      { id: 'quest',     label: '📜 퀘스트 일지' },
      { id: 'save',      label: '💾 세이브' },
    ];

    for (const t of tabs) {
      const btn = document.createElement('button');
      btn.textContent = t.label;
      const isActive = t.id === this.activeTab;
      const isSaveDisabled = t.id === 'save' && this.scene.currentArea !== 'scene_haven';
      btn.style.cssText = [
        'background:none', 'border:none', 'cursor:pointer',
        `color:${isActive ? '#f1c40f' : isSaveDisabled ? '#444' : '#888'}`,
        `border-bottom:${isActive ? '2px solid #f1c40f' : '2px solid transparent'}`,
        'padding:4px 0', 'font-family:monospace', 'font-size:14px',
        `cursor:${isSaveDisabled ? 'not-allowed' : 'pointer'}`,
      ].join(';');
      if (!isSaveDisabled) {
        btn.onclick = () => { this.activeTab = t.id; this.render(); };
      } else {
        btn.title = '마을에서만 저장할 수 있습니다';
      }
      bar.appendChild(btn);
    }

    const hint = document.createElement('span');
    hint.textContent = '[ESC] 닫기';
    hint.style.cssText = 'margin-left:auto;color:#555;font-size:12px;';
    bar.appendChild(hint);

    return bar;
  }

  private buildContent(): HTMLElement {
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;padding:16px;overflow:auto;';
    if (this.activeTab === 'inventory') content.appendChild(this.buildInventory());
    else if (this.activeTab === 'quest')  content.appendChild(this.buildQuestLog());
    else if (this.activeTab === 'save')   content.appendChild(this.buildSave());
    return content;
  }

  private buildInventory(): HTMLElement {
    return document.createElement('div'); // Task 5에서 구현
  }

  private buildQuestLog(): HTMLElement {
    return document.createElement('div'); // Task 6에서 구현
  }

  private buildSave(): HTMLElement {
    return document.createElement('div'); // Task 7에서 구현
  }
}

import type Phaser from 'phaser';
import type { InventorySystem } from '../systems/Inventory';
import type { QuestSystem } from '../systems/Quest';
import type { SaveManager, SaveData } from '../systems/SaveManager';
import { getItemEffect, applyItemEffect } from './itemEffects';

type Tab = 'inventory' | 'quest' | 'save';

export class MenuOverlay {
  private el: HTMLDivElement;
  private isOpen = false;
  private activeTab: Tab = 'inventory';
  private selectedItemId: string | null = null;
  private selectedQuestId: string | null = null;
  private detailPanel!: HTMLElement;

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
    const snap = this.inventory.toJSON();
    const root = document.createElement('div');
    root.style.cssText = 'display:flex;gap:16px;height:100%;';

    const left = document.createElement('div');
    left.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:12px;';

    const consumableIds = Object.keys(snap.items);
    left.appendChild(this.buildSection('소비 아이템', consumableIds.map(id => ({
      id, qty: snap.items[id], type: 'consumable' as const,
    }))));

    const equipIds = [snap.equipment.weapon, snap.equipment.armor].filter(Boolean) as string[];
    left.appendChild(this.buildSection('장비', equipIds.map(id => ({
      id, qty: 1, type: 'equipment' as const,
    }))));

    left.appendChild(this.buildSection('🗝 키 아이템', snap.keyItems.map(id => ({
      id, qty: 1, type: 'keyitem' as const,
    }))));

    root.appendChild(left);
    this.detailPanel = this.buildDetailPanel();
    root.appendChild(this.detailPanel);

    return root;
  }

  private buildSection(
    title: string,
    items: { id: string; qty: number; type: 'consumable' | 'equipment' | 'keyitem' }[],
  ): HTMLElement {
    const section = document.createElement('div');
    const label = document.createElement('div');
    label.textContent = title;
    label.style.cssText = 'color:#aaa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;';
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';

    if (items.length === 0) {
      const empty = document.createElement('span');
      empty.textContent = '없음';
      empty.style.cssText = 'color:#444;font-size:12px;';
      grid.appendChild(empty);
    }

    const colorMap: Record<string, string> = {
      consumable: '#e74c3c', equipment: '#9b59b6', keyitem: '#f1c40f',
    };

    for (const item of items) {
      const slot = document.createElement('div');
      const isSelected = this.selectedItemId === item.id;
      slot.style.cssText = [
        'width:40px', 'height:40px', 'background:#2c3e50',
        `border:${isSelected ? '2px solid #f1c40f' : '1px dashed ' + colorMap[item.type] + '66'}`,
        'border-radius:4px', 'position:relative', 'cursor:pointer',
        'display:flex', 'align-items:center', 'justify-content:center',
        'font-size:10px', 'color:#eee',
      ].join(';');

      slot.textContent = item.id.split('_').slice(-1)[0].substring(0, 3).toUpperCase();

      if (item.qty > 1) {
        const badge = document.createElement('span');
        badge.textContent = String(item.qty);
        badge.style.cssText = 'position:absolute;bottom:1px;right:2px;font-size:9px;color:#eee;';
        slot.appendChild(badge);
      }

      if (item.type === 'keyitem') {
        slot.setAttribute('data-key-item-id', item.id);
      } else {
        slot.setAttribute('data-item-id', item.id);
      }

      slot.onclick = () => {
        this.selectedItemId = item.id;
        this.render();
      };

      grid.appendChild(slot);
    }

    section.appendChild(grid);
    return section;
  }

  private buildDetailPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = [
      'width:150px', 'background:#1a1a2e', 'border-radius:6px',
      'padding:12px', 'border:1px solid #333', 'display:flex',
      'flex-direction:column', 'gap:8px',
    ].join(';');

    if (!this.selectedItemId) {
      const hint = document.createElement('span');
      hint.textContent = '아이템을 선택하세요';
      hint.style.cssText = 'color:#444;font-size:12px;';
      panel.appendChild(hint);
      return panel;
    }

    const id = this.selectedItemId;
    const snap = this.inventory.toJSON();
    const isEquipment = id === snap.equipment.weapon || id === snap.equipment.armor;
    const isKeyItem = snap.keyItems.includes(id);
    const qty = snap.items[id] ?? 1;

    let itemColor: string;
    if (isKeyItem) itemColor = '#f1c40f';
    else if (isEquipment) itemColor = '#9b59b6';
    else itemColor = '#e74c3c';

    const name = document.createElement('div');
    name.textContent = id;
    name.style.cssText = `color:${itemColor};font-size:13px;font-weight:bold;word-break:break-all;`;
    panel.appendChild(name);

    if (!isEquipment && !isKeyItem) {
      const qtyEl = document.createElement('div');
      qtyEl.textContent = `보유: ${qty}개`;
      qtyEl.style.cssText = 'color:#aaa;font-size:12px;';
      panel.appendChild(qtyEl);

      const effect = getItemEffect(id);
      if (effect) {
        const desc = document.createElement('div');
        if (effect.type === 'heal_hp') desc.textContent = `HP +${effect.value === Infinity ? '전체' : effect.value} 회복`;
        else if (effect.type === 'heal_mp') desc.textContent = `MP +${effect.value} 회복`;
        desc.style.cssText = 'color:#aaa;font-size:11px;';
        panel.appendChild(desc);
      }

      const useBtn = document.createElement('button');
      useBtn.textContent = '사용 (Enter)';
      useBtn.style.cssText = [
        'background:#27ae60', 'border:none', 'border-radius:4px',
        'padding:6px', 'color:#fff', 'font-family:monospace',
        'cursor:pointer', 'margin-top:auto',
      ].join(';');
      useBtn.onclick = () => this.useSelectedItem();
      panel.appendChild(useBtn);
    }

    return panel;
  }

  private useSelectedItem(): void {
    if (!this.selectedItemId) return;
    const effect = getItemEffect(this.selectedItemId);
    if (!effect) return;
    const removed = this.inventory.removeItem(this.selectedItemId, 1);
    if (!removed) return;
    applyItemEffect(effect, (this.scene as unknown as { player: Parameters<typeof applyItemEffect>[1] }).player);
    this.selectedItemId = null;
    this.render();
  }

  private buildQuestLog(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = 'display:flex;gap:16px;height:100%;';

    const allQuests = this.quest.getAllQuests();
    const visible = allQuests.filter(q =>
      ['active', 'completed'].includes(this.quest.getStatus(q.id))
    );

    const list = document.createElement('div');
    list.style.cssText = 'width:200px;display:flex;flex-direction:column;gap:4px;overflow:auto;';

    if (visible.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = '진행 중인 퀘스트가 없습니다.';
      empty.style.cssText = 'color:#444;font-size:12px;padding:8px;';
      list.appendChild(empty);
    }

    for (const q of visible) {
      const status = this.quest.getStatus(q.id);
      const isActive = status === 'active';
      const isSelected = this.selectedQuestId === q.id;

      const item = document.createElement('div');
      item.setAttribute('data-quest-id', q.id);
      item.style.cssText = [
        `background:${isSelected ? '#f1c40f22' : isActive ? '#f1c40f11' : '#1a1a2e'}`,
        `border:1px solid ${isSelected ? '#f1c40f44' : '#333'}`,
        'border-radius:4px', 'padding:8px', 'cursor:pointer', 'font-size:12px',
        `color:${isActive ? '#f1c40f' : '#666'}`,
      ].join(';');
      item.textContent = (status === 'completed' ? '✓ ' : '▶ ') + q.title;
      item.onclick = () => { this.selectedQuestId = q.id; this.render(); };
      list.appendChild(item);
    }

    root.appendChild(list);

    const detail = document.createElement('div');
    detail.style.cssText = [
      'flex:1', 'background:#1a1a2e', 'border-radius:6px',
      'padding:12px', 'border:1px solid #333',
    ].join(';');

    const selected = visible.find(q => q.id === this.selectedQuestId)
      ?? visible.find(q => this.quest.getStatus(q.id) === 'active')
      ?? visible[0];

    if (selected) {
      this.selectedQuestId = selected.id;
      const status = this.quest.getStatus(selected.id);

      const title = document.createElement('div');
      title.textContent = selected.title;
      title.style.cssText = 'color:#f1c40f;font-size:14px;margin-bottom:4px;';
      detail.appendChild(title);

      const giver = document.createElement('div');
      giver.textContent = `의뢰자: ${selected.giver_npc}`;
      giver.style.cssText = 'color:#888;font-size:11px;margin-bottom:12px;';
      detail.appendChild(giver);

      if (status === 'active') {
        const objTitle = document.createElement('div');
        objTitle.textContent = '🎯 목표';
        objTitle.style.cssText = 'color:#eee;font-size:12px;margin-bottom:6px;';
        detail.appendChild(objTitle);

        for (const obj of selected.objectives) {
          const objEl = document.createElement('div');
          objEl.textContent = `• ${obj.display_text}`;
          objEl.style.cssText = 'color:#aaa;font-size:11px;margin-bottom:3px;';
          detail.appendChild(objEl);
        }
      }

      const rewardTitle = document.createElement('div');
      rewardTitle.textContent = '보상';
      rewardTitle.style.cssText = 'color:#eee;font-size:12px;margin-top:12px;margin-bottom:4px;';
      detail.appendChild(rewardTitle);

      const reward = selected.reward;
      const rewardText = [`EXP +${reward.exp}`];
      if (reward.gold > 0) rewardText.push(`골드 +${reward.gold}G`);
      const rewardEl = document.createElement('div');
      rewardEl.textContent = rewardText.join(', ');
      rewardEl.style.cssText = 'color:#aaa;font-size:11px;';
      detail.appendChild(rewardEl);
    } else {
      const hint = document.createElement('div');
      hint.textContent = '퀘스트를 선택하세요';
      hint.style.cssText = 'color:#444;font-size:12px;';
      detail.appendChild(hint);
    }

    root.appendChild(detail);
    return root;
  }

  private buildSave(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = 'display:flex;flex-direction:column;gap:16px;max-width:400px;';

    const isHaven = this.scene.currentArea === 'scene_haven';

    const existing = this.saveManager.load();
    const infoBox = document.createElement('div');
    infoBox.style.cssText = 'background:#1a1a2e;border-radius:6px;padding:16px;border:1px solid #333;';

    if (existing) {
      const savedAt = new Date(existing.timestamp).toLocaleString('ko-KR');
      const playSec = Math.floor(existing.playtime / 1000);
      const playMin = Math.floor(playSec / 60);
      infoBox.innerHTML = `
        <div style="color:#f1c40f;margin-bottom:8px;">저장된 데이터</div>
        <div style="color:#aaa;font-size:12px;line-height:1.8;">
          저장 일시: ${savedAt}<br>
          레벨: ${existing.player.level}<br>
          플레이 시간: ${playMin}분<br>
          직업: ${existing.player.playerClass === 'class_swordsman' ? '검사' : '마도사'}
        </div>
      `;
    } else {
      infoBox.innerHTML = '<div style="color:#444;font-size:12px;">저장된 데이터 없음</div>';
    }
    root.appendChild(infoBox);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = isHaven ? '저장하기' : '마을에서만 저장 가능';
    saveBtn.disabled = !isHaven;
    saveBtn.style.cssText = [
      `background:${isHaven ? '#27ae60' : '#2c3e50'}`,
      'border:none', 'border-radius:4px', 'padding:8px 16px',
      'color:#fff', 'font-family:monospace', 'font-size:13px',
      `cursor:${isHaven ? 'pointer' : 'not-allowed'}`,
    ].join(';');
    if (isHaven) {
      saveBtn.onclick = () => {
        this.saveManager.save(this.getSaveData());
        this.render();
      };
    }
    btnRow.appendChild(saveBtn);

    if (existing) {
      const loadBtn = document.createElement('button');
      loadBtn.textContent = '불러오기';
      loadBtn.style.cssText = [
        'background:#2980b9', 'border:none', 'border-radius:4px',
        'padding:8px 16px', 'color:#fff', 'font-family:monospace',
        'font-size:13px', 'cursor:pointer',
      ].join(';');
      loadBtn.onclick = () => {
        const data = this.saveManager.load();
        if (data) this.scene.events.emit('load_save', data);
        this.close();
      };
      btnRow.appendChild(loadBtn);
    }

    root.appendChild(btnRow);
    return root;
  }
}

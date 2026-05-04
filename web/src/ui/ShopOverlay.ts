import type Phaser from 'phaser';
import type { InventorySystem } from '../systems/Inventory';
import type { Player } from '../entities/Player';

interface ShopItem {
  id: string;
  name: string;
  buy: number | null;
  sell: number;
  desc: string;
}

type ShopTab = 'buy' | 'sell' | 'heal';

export class ShopOverlay {
  private el: HTMLDivElement;
  private isOpen = false;
  private activeTab: ShopTab = 'buy';
  private npcId = '';
  private readonly allItems: ShopItem[];
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly inventory: InventorySystem,
    private readonly getPlayer: () => Player,
    balanceJson: unknown,
  ) {
    this.allItems = this.extractItems(balanceJson);
    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.keyHandler);
    this.el = this.createDOM();
  }

  // ── 초기화 ──────────────────────────────────────────────────────────────

  private extractItems(data: unknown): ShopItem[] {
    const b = data as {
      items: {
        weapons:     Array<{ id: string; name: string; buy: number | null; sell: number; atk_bonus: number }>;
        armors:      Array<{ id: string; name: string; buy: number | null; sell: number; def_bonus: number }>;
        consumables: Array<{ id: string; name: string; buy: number | null; sell: number; effect: string }>;
      };
    };
    const result: ShopItem[] = [];
    for (const w of b.items.weapons)
      result.push({ id: w.id, name: w.name, buy: w.buy, sell: w.sell, desc: `ATK +${w.atk_bonus}` });
    for (const a of b.items.armors)
      result.push({ id: a.id, name: a.name, buy: a.buy, sell: a.sell, desc: `DEF +${a.def_bonus}` });
    for (const c of b.items.consumables)
      result.push({ id: c.id, name: c.name, buy: c.buy, sell: c.sell, desc: c.effect });
    return result;
  }

  private createDOM(): HTMLDivElement {
    const el = document.createElement('div');
    el.id = 'shop-overlay';
    el.style.cssText = [
      'position:absolute', 'inset:0', 'z-index:10',
      'background:rgba(0,0,0,0.85)',
      'font-family:monospace', 'color:#eee',
    ].join(';');
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  // ── 공개 API ────────────────────────────────────────────────────────────

  open(npcId: string): void {
    this.npcId = npcId;
    this.activeTab = 'buy';
    this.isOpen = true;
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
    document.removeEventListener('keydown', this.keyHandler);
    this.el.remove();
  }

  // ── 렌더링 ──────────────────────────────────────────────────────────────

  private render(): void {
    this.el.innerHTML = '';
    this.el.appendChild(this.buildHeader());
    this.el.appendChild(this.buildContent());
  }

  private buildHeader(): HTMLElement {
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;border-bottom:1px solid #333;padding:12px 16px;gap:16px;align-items:center;';

    const npcName = this.npcId === 'npc_merchant' ? '🛒 상인 리나' : '💊 치유사 미아';
    const title = document.createElement('div');
    title.textContent = npcName;
    title.style.cssText = 'color:#f1c40f;font-size:15px;font-weight:bold;margin-right:8px;';
    bar.appendChild(title);

    const tabs: { id: ShopTab; label: string }[] = [
      { id: 'buy',  label: '구매' },
      { id: 'sell', label: '판매' },
    ];
    if (this.npcId === 'npc_healer') {
      tabs.push({ id: 'heal', label: 'HP/MP 회복 (50G)' });
    }

    for (const t of tabs) {
      const isActive = t.id === this.activeTab;
      const btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = [
        'background:none', 'border:none',
        `color:${isActive ? '#f1c40f' : '#888'}`,
        `border-bottom:${isActive ? '2px solid #f1c40f' : '2px solid transparent'}`,
        'padding:4px 8px', 'font-family:monospace', 'font-size:14px', 'cursor:pointer',
      ].join(';');
      btn.onclick = () => { this.activeTab = t.id; this.render(); };
      bar.appendChild(btn);
    }

    const player = this.getPlayer();
    const goldEl = document.createElement('span');
    goldEl.textContent = `💰 ${player.gold}G`;
    goldEl.style.cssText = 'margin-left:auto;color:#ffdd00;font-size:13px;';
    bar.appendChild(goldEl);

    const hint = document.createElement('span');
    hint.textContent = '[ESC] 닫기';
    hint.style.cssText = 'color:#555;font-size:12px;margin-left:12px;';
    bar.appendChild(hint);

    return bar;
  }

  private buildContent(): HTMLElement {
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;padding:16px;overflow:auto;';
    if (this.activeTab === 'buy')  content.appendChild(this.buildBuy());
    else if (this.activeTab === 'sell') content.appendChild(this.buildSell());
    else if (this.activeTab === 'heal') content.appendChild(this.buildHeal());
    return content;
  }

  // ── 구매 탭 ─────────────────────────────────────────────────────────────

  private buildBuy(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-width:600px;';

    let itemList = this.allItems.filter(i => i.buy !== null);
    if (this.npcId === 'npc_healer') {
      // 치유사: 소비 아이템만
      itemList = itemList.filter(i => !i.id.startsWith('weapon_') && !i.id.startsWith('armor_'));
    }

    if (itemList.length === 0) {
      root.appendChild(this.emptyMsg('판매 중인 물품이 없습니다.'));
      return root;
    }

    for (const item of itemList) {
      root.appendChild(this.buildBuyRow(item));
    }
    return root;
  }

  private buildBuyRow(item: ShopItem): HTMLElement {
    const player = this.getPlayer();
    const cost = item.buy!;
    const canAfford = player.gold >= cost;

    const row = document.createElement('div');
    row.style.cssText = [
      'display:flex', 'align-items:center', 'gap:12px',
      'padding:8px 10px',
      `background:${canAfford ? '#1a2a1a' : '#1a1a1a'}`,
      'border-radius:4px', 'border:1px solid #333',
    ].join(';');

    const name = document.createElement('div');
    name.textContent = item.name;
    name.style.cssText = `flex:1;font-size:13px;color:${canAfford ? '#eee' : '#555'};`;
    row.appendChild(name);

    const desc = document.createElement('div');
    desc.textContent = item.desc;
    desc.style.cssText = 'font-size:11px;color:#888;width:100px;';
    row.appendChild(desc);

    const price = document.createElement('div');
    price.textContent = `${cost}G`;
    price.style.cssText = `font-size:13px;color:${canAfford ? '#ffdd00' : '#554400'};width:60px;text-align:right;`;
    row.appendChild(price);

    const btn = document.createElement('button');
    btn.textContent = '구매';
    btn.disabled = !canAfford;
    btn.style.cssText = [
      `background:${canAfford ? '#27ae60' : '#2c3e50'}`,
      'border:none', 'border-radius:4px', 'padding:5px 12px',
      'color:#fff', 'font-family:monospace', 'font-size:12px',
      `cursor:${canAfford ? 'pointer' : 'not-allowed'}`,
    ].join(';');
    btn.onclick = () => {
      if (!canAfford) return;
      player.gold -= cost;
      this.inventory.addItem(item.id, 1);
      this.render();
    };
    row.appendChild(btn);

    return row;
  }

  // ── 판매 탭 ─────────────────────────────────────────────────────────────

  private buildSell(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-width:600px;';

    const snap = this.inventory.toJSON();
    const sellable = Object.entries(snap.items)
      .filter(([, qty]) => qty > 0)
      .flatMap(([id, qty]) => {
        const def = this.allItems.find(i => i.id === id);
        return def ? [{ id, qty, sell: def.sell, name: def.name }] : [];
      });

    if (sellable.length === 0) {
      root.appendChild(this.emptyMsg('판매 가능한 아이템이 없습니다.'));
      return root;
    }

    for (const item of sellable) {
      root.appendChild(this.buildSellRow(item));
    }
    return root;
  }

  private buildSellRow(item: { id: string; qty: number; sell: number; name: string }): HTMLElement {
    const player = this.getPlayer();

    const row = document.createElement('div');
    row.style.cssText = [
      'display:flex', 'align-items:center', 'gap:12px',
      'padding:8px 10px', 'background:#1a1a2a',
      'border-radius:4px', 'border:1px solid #333',
    ].join(';');

    const name = document.createElement('div');
    name.textContent = `${item.name} ×${item.qty}`;
    name.style.cssText = 'flex:1;font-size:13px;color:#eee;';
    row.appendChild(name);

    const price = document.createElement('div');
    price.textContent = `${item.sell}G`;
    price.style.cssText = 'font-size:13px;color:#ffdd00;width:60px;text-align:right;';
    row.appendChild(price);

    const btn = document.createElement('button');
    btn.textContent = '판매';
    btn.style.cssText = [
      'background:#c0392b', 'border:none', 'border-radius:4px',
      'padding:5px 12px', 'color:#fff', 'font-family:monospace',
      'font-size:12px', 'cursor:pointer',
    ].join(';');
    btn.onclick = () => {
      if (this.inventory.removeItem(item.id, 1)) {
        player.gold += item.sell;
      }
      this.render();
    };
    row.appendChild(btn);

    return row;
  }

  // ── 회복 탭 (npc_healer 전용) ────────────────────────────────────────────

  private buildHeal(): HTMLElement {
    const root = document.createElement('div');
    root.style.cssText = 'max-width:400px;';

    const player = this.getPlayer();
    const HEAL_COST = 50;
    const alreadyFull = player.hp >= player.maxHp && player.mp >= player.maxMp;
    const canAfford = player.gold >= HEAL_COST;

    const info = document.createElement('div');
    info.style.cssText = 'background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:16px;margin-bottom:12px;';
    info.innerHTML = `
      <div style="color:#aaa;font-size:12px;margin-bottom:8px;">현재 상태</div>
      <div style="color:#ff6666;font-size:13px;">HP: ${player.hp} / ${player.maxHp}</div>
      <div style="color:#6699ff;font-size:13px;margin-top:4px;">MP: ${player.mp} / ${player.maxMp}</div>
    `;
    root.appendChild(info);

    const btn = document.createElement('button');
    btn.textContent = alreadyFull ? 'HP/MP 이미 최대' : `HP/MP 전량 회복 (${HEAL_COST}G)`;
    btn.disabled = alreadyFull || !canAfford;
    btn.style.cssText = [
      `background:${!alreadyFull && canAfford ? '#2980b9' : '#2c3e50'}`,
      'border:none', 'border-radius:4px', 'padding:10px 20px',
      'color:#fff', 'font-family:monospace', 'font-size:13px',
      `cursor:${!alreadyFull && canAfford ? 'pointer' : 'not-allowed'}`,
    ].join(';');
    btn.onclick = () => {
      if (alreadyFull || !canAfford) return;
      player.gold -= HEAL_COST;
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      this.render();
    };
    root.appendChild(btn);

    if (!canAfford && !alreadyFull) {
      const warn = document.createElement('div');
      warn.textContent = `골드가 부족합니다. (보유: ${player.gold}G)`;
      warn.style.cssText = 'color:#e74c3c;font-size:12px;margin-top:8px;';
      root.appendChild(warn);
    }

    return root;
  }

  // ── 헬퍼 ────────────────────────────────────────────────────────────────

  private emptyMsg(text: string): HTMLElement {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'color:#444;font-size:12px;';
    return el;
  }
}

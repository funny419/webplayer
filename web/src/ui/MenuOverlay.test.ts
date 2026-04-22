// @vitest-environment jsdom
import { MenuOverlay } from './MenuOverlay';
import type { InventorySystem } from '../systems/Inventory';
import type { QuestSystem } from '../systems/Quest';
import type { SaveManager } from '../systems/SaveManager';

describe('MenuOverlay', () => {
  let overlay: MenuOverlay;
  const mockScene = {
    scene: { pause: vi.fn(), resume: vi.fn() },
    currentArea: 'scene_haven',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockInventory: any = {
    toJSON: vi.fn().mockReturnValue({
      items: {},
      equipment: { weapon: null, armor: null },
      keyItems: [],
    }),
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container"></div>';
    overlay = new MenuOverlay(
      mockScene,
      mockInventory as unknown as InventorySystem,
      null as unknown as QuestSystem,
      null as unknown as SaveManager,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => ({} as any),
    );
  });

  afterEach(() => {
    overlay.destroy();
    document.body.innerHTML = '';
  });

  it('초기에는 숨겨진 상태다', () => {
    const el = document.getElementById('menu-overlay');
    expect(el).not.toBeNull();
    expect(el!.style.display).toBe('none');
  });

  it('open() 호출 시 표시되고 scene이 pause된다', () => {
    overlay.open('inventory');
    const el = document.getElementById('menu-overlay');
    expect(el!.style.display).not.toBe('none');
    expect(mockScene.scene.pause).toHaveBeenCalled();
  });

  it('close() 호출 시 숨겨지고 scene이 resume된다', () => {
    overlay.open('inventory');
    overlay.close();
    const el = document.getElementById('menu-overlay');
    expect(el!.style.display).toBe('none');
    expect(mockScene.scene.resume).toHaveBeenCalled();
  });

  it('open()이 열린 상태에서 다시 호출되면 닫힌다 (토글)', () => {
    overlay.open('inventory');
    overlay.open('inventory');
    const el = document.getElementById('menu-overlay');
    expect(el!.style.display).toBe('none');
  });
});

describe('인벤토리 탭', () => {
  let overlay: MenuOverlay;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockInventory: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPlayer: any;
  const mockScene = {
    scene: { pause: vi.fn(), resume: vi.fn() },
    currentArea: 'scene_haven',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    player: null as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockPlayer = { hp: 50, maxHp: 100, mp: 30, maxMp: 50 };
    mockScene.player = mockPlayer;
    mockInventory = {
      toJSON: vi.fn().mockReturnValue({
        items: { item_potion_small: 3 },
        equipment: { weapon: 'weapon_iron_sword', armor: null },
        keyItems: ['key_compass'],
      }),
      removeItem: vi.fn().mockReturnValue(true),
      equipWeapon: vi.fn().mockReturnValue(true),
      equipArmor: vi.fn().mockReturnValue(true),
    };
    overlay = new MenuOverlay(
      mockScene,
      mockInventory,
      null as unknown as QuestSystem,
      null as unknown as SaveManager,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => ({} as any),
    );
    overlay.open('inventory');
  });

  afterEach(() => { overlay.destroy(); });

  it('소비 아이템 슬롯이 렌더링된다', () => {
    expect(document.querySelector('[data-item-id="item_potion_small"]')).not.toBeNull();
  });

  it('키 아이템이 렌더링된다', () => {
    expect(document.querySelector('[data-key-item-id="key_compass"]')).not.toBeNull();
  });
});

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

  beforeEach(() => {
    document.body.innerHTML = '<div id="game-container"></div>';
    overlay = new MenuOverlay(
      mockScene,
      null as unknown as InventorySystem,
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

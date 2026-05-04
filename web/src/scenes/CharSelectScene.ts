import Phaser from 'phaser';
import type { PlayerClass } from '../systems/Inventory';

const JOBS: { cls: PlayerClass; name: string; basic: string; special: string; color: string }[] = [
  {
    cls:     'class_swordsman',
    name:    '검사 (Swordsman)',
    basic:   '근접 검 공격 — ATK 100%',
    special: '회전베기 — 범위 공격 (MP 10)',
    color:   '#e74c3c',
  },
  {
    cls:     'class_mage',
    name:    '마도사 (Mage)',
    basic:   '원거리 마법탄 — ATK 70%',
    special: '마법 폭발 — 범위 공격 (MP 20)',
    color:   '#3498db',
  },
];

export class CharSelectScene extends Phaser.Scene {
  private el!: HTMLDivElement;

  constructor() {
    super({ key: 'CharSelectScene' });
  }

  create(): void {
    this.el = document.createElement('div');
    this.el.style.cssText = [
      'position:absolute', 'inset:0', 'z-index:20',
      'background:#0a0a1a',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:monospace', 'color:#eee', 'gap:32px',
    ].join(';');

    const title = document.createElement('h1');
    title.textContent = '직업 선택';
    title.style.cssText = 'color:#f1c40f;font-size:28px;margin:0;letter-spacing:4px;';
    this.el.appendChild(title);

    const sub = document.createElement('div');
    sub.textContent = '모험을 함께할 직업을 선택하세요';
    sub.style.cssText = 'color:#666;font-size:13px;';
    this.el.appendChild(sub);

    const cardRow = document.createElement('div');
    cardRow.style.cssText = 'display:flex;gap:32px;';

    for (const job of JOBS) {
      const card = document.createElement('div');
      card.style.cssText = [
        'width:200px', 'background:#111122',
        `border:2px solid ${job.color}44`,
        'border-radius:8px', 'padding:24px',
        'display:flex', 'flex-direction:column', 'gap:12px',
        'cursor:pointer',
      ].join(';');
      card.onmouseenter = () => { card.style.borderColor = job.color; };
      card.onmouseleave = () => { card.style.borderColor = `${job.color}44`; };

      const jobName = document.createElement('div');
      jobName.textContent = job.name;
      jobName.style.cssText = `color:${job.color};font-size:16px;font-weight:bold;`;
      card.appendChild(jobName);

      const divider = document.createElement('hr');
      divider.style.cssText = `border:none;border-top:1px solid ${job.color}44;margin:0;`;
      card.appendChild(divider);

      const addRow = (label: string, text: string): void => {
        const lbl = document.createElement('div');
        lbl.textContent = label;
        lbl.style.cssText = 'color:#888;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;';
        card.appendChild(lbl);
        const val = document.createElement('div');
        val.textContent = text;
        val.style.cssText = 'color:#ccc;font-size:11px;line-height:1.4;';
        card.appendChild(val);
      };
      addRow('기본 공격', job.basic);
      addRow('특수 공격', job.special);

      const selectBtn = document.createElement('button');
      selectBtn.textContent = '선택';
      selectBtn.style.cssText = [
        `background:${job.color}`, 'border:none', 'border-radius:4px',
        'padding:8px', 'color:#fff', 'font-family:monospace',
        'font-size:13px', 'cursor:pointer', 'margin-top:8px',
      ].join(';');
      selectBtn.onclick = () => { this.scene.start('WorldScene', { playerClass: job.cls }); };
      card.appendChild(selectBtn);

      cardRow.appendChild(card);
    }

    this.el.appendChild(cardRow);
    document.body.appendChild(this.el);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.el?.remove();
    });
  }
}

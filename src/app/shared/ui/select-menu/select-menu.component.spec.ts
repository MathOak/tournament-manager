import { TestBed } from '@angular/core/testing';
import { SelectMenuComponent, SelectMenuOption } from './select-menu.component';

const options: SelectMenuOption[] = [
  { value: 'a', title: 'Copa A', subtitle: 'Jogo 1' },
  { value: 'b', title: 'Copa B', subtitle: 'Jogo 2', badge: 'Novo' },
];

describe('SelectMenuComponent', () => {
  async function setup(value = 'a') {
    await TestBed.configureTestingModule({ imports: [SelectMenuComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SelectMenuComponent);
    fixture.componentRef.setInput('options', options);
    fixture.componentRef.setInput('label', 'Campeonato');
    fixture.componentRef.setInput('value', value);
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, emitted };
  }

  it('shows the selected option title and subtitle', async () => {
    const { el } = await setup();
    expect(el.querySelector('.select-trigger')?.textContent).toContain('Copa A');
    expect(el.querySelector('.select-trigger')?.textContent).toContain('Jogo 1');
  });

  it('opens the list and emits the chosen value', async () => {
    const { fixture, el, emitted } = await setup();
    el.querySelector<HTMLButtonElement>('.select-trigger')!.click();
    fixture.detectChanges();
    const items = el.querySelectorAll<HTMLElement>('[role="option"]');
    expect(items).toHaveLength(2);
    items[1].click();
    fixture.detectChanges();
    expect(emitted).toEqual(['b']);
    expect(el.querySelector('[role="listbox"]')).toBeNull();
  });

  it('supports keyboard navigation and Escape', async () => {
    const { fixture, el, emitted } = await setup();
    const trigger = el.querySelector<HTMLButtonElement>('.select-trigger')!;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(emitted).toEqual(['b']);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[role="listbox"]')).toBeNull();
  });
});

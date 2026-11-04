import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';

export interface SelectMenuOption {
  value: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl?: string;
}

let nextId = 0;

@Component({
  selector: 'app-select-menu',
  standalone: true,
  templateUrl: './select-menu.component.html',
  styleUrl: './select-menu.component.css',
})
export class SelectMenuComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly options = input.required<SelectMenuOption[]>();
  readonly value = input('');
  readonly label = input.required<string>();
  readonly placeholder = input('Selecione');
  readonly showThumbnail = input(true);
  readonly disabled = input(false);
  readonly valueChange = output<string>();
  readonly open = signal(false);
  readonly activeIndex = signal(0);
  readonly uid = `select-menu-${nextId++}`;
  readonly selected = computed(() => this.options().find((option) => option.value === this.value()) ?? null);

  toggle(): void {
    if (this.open()) this.close();
    else this.openMenu();
  }

  select(option: SelectMenuOption): void {
    this.valueChange.emit(option.value);
    this.close();
    this.focusTrigger();
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    if (!count) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) { this.openMenu(); return; }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.activeIndex.update((index) => (index + step + count) % count);
        break;
      }
      case 'Home': if (this.open()) { event.preventDefault(); this.activeIndex.set(0); } break;
      case 'End': if (this.open()) { event.preventDefault(); this.activeIndex.set(count - 1); } break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open()) this.select(this.options()[this.activeIndex()]);
        else this.openMenu();
        break;
      case 'Escape':
        if (this.open()) { event.preventDefault(); this.close(); }
        break;
      case 'Tab': this.close(); break;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  private openMenu(): void {
    if (!this.options().length || this.disabled()) return;
    const index = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(Math.max(index, 0));
    this.open.set(true);
  }

  private close(): void {
    this.open.set(false);
  }

  private focusTrigger(): void {
    this.host.nativeElement.querySelector<HTMLElement>('.select-trigger')?.focus();
  }
}

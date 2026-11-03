import { TestBed } from '@angular/core/testing';
import { AppToastComponent } from './app-toast.component';

describe('AppToastComponent', () => {
  it('shows status only when a message exists and emits dismiss', async () => {
    await TestBed.configureTestingModule({ imports: [AppToastComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppToastComponent);
    fixture.componentRef.setInput('message', 'Dados salvos');
    const dismissed = vi.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Dados salvos');
    (element.querySelector('button') as HTMLButtonElement).click();
    expect(dismissed).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('message', '');
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')).toBeNull();
  });
});

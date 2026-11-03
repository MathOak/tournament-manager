import { TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  it('applies semantic variant class and keeps the label textual', async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StatusBadgeComponent);
    fixture.componentRef.setInput('label', 'Concluída');
    fixture.componentRef.setInput('variant', 'success');
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.status-badge');
    expect(badge?.classList.contains('success')).toBe(true);
    expect(badge?.textContent).toBe('Concluída');
  });
});

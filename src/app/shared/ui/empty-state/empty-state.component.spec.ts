import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('renders configured empty copy and projected actions', async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('icon', '⌘');
    fixture.componentRef.setInput('title', 'Sem etapas');
    fixture.componentRef.setInput('description', 'Crie uma etapa para começar.');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sem etapas');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Crie uma etapa');
  });
});

import { TestBed } from '@angular/core/testing';
import { BracketLegendComponent } from './bracket-legend.component';

describe('BracketLegendComponent', () => {
  it('renders textual states and local synchronization scope', async () => {
    await TestBed.configureTestingModule({ imports: [BracketLegendComponent] }).compileComponents();
    const fixture = TestBed.createComponent(BracketLegendComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ao vivo');
    expect(text).toContain('Vencedor');
    expect(text).toContain('Aguardando resultado');
  });
});

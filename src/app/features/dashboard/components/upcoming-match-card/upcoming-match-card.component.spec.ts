import { TestBed } from '@angular/core/testing';
import { UpcomingMatchCardComponent } from './upcoming-match-card.component';

describe('UpcomingMatchCardComponent', () => {
  it('renders upcoming matchup metadata and independent player records', async () => {
    await TestBed.configureTestingModule({ imports: [UpcomingMatchCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(UpcomingMatchCardComponent);
    fixture.componentRef.setInput('stageName', 'Swiss'); fixture.componentRef.setInput('roundName', 'Rodada 2');
    fixture.componentRef.setInput('bestOf', 5); fixture.componentRef.setInput('playerA', 'Ana'); fixture.componentRef.setInput('playerB', 'Bia');
    fixture.componentRef.setInput('recordA', '1V–0D'); fixture.componentRef.setInput('recordB', '0V–1D');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PRÓXIMA'); expect(text).toContain('Swiss · Rodada 2 · MD5');
    expect(text).toContain('Ana'); expect(text).toContain('Bia'); expect(text).toContain('1V–0D');
  });
});

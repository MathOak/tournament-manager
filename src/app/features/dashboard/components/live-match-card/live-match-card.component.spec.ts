import { TestBed } from '@angular/core/testing';
import { LiveMatchCardComponent } from './live-match-card.component';

describe('LiveMatchCardComponent', () => {
  it('renders players, tournament records and series score as separate values', async () => {
    await TestBed.configureTestingModule({ imports: [LiveMatchCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(LiveMatchCardComponent);
    fixture.componentRef.setInput('stageName', 'Playoffs');
    fixture.componentRef.setInput('roundName', 'Final');
    fixture.componentRef.setInput('bestOf', 3);
    fixture.componentRef.setInput('playerA', 'Ana'); fixture.componentRef.setInput('playerB', 'Bia');
    fixture.componentRef.setInput('recordA', '2V – 1D'); fixture.componentRef.setInput('recordB', '1V – 2D');
    fixture.componentRef.setInput('scoreA', 1); fixture.componentRef.setInput('scoreB', 0);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('AO VIVO'); expect(text).toContain('Ana'); expect(text).toContain('Bia');
    expect(text).toContain('2V – 1D'); expect(text).toContain('SÉRIE MD3');
    expect(fixture.nativeElement.querySelector('.series-score')?.textContent).toContain('1');
  });
});

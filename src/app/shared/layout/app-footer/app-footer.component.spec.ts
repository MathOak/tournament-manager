import { TestBed } from '@angular/core/testing';
import { AppFooterComponent } from './app-footer.component';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/app-config';

describe('AppFooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppFooterComponent],
      providers: [{ provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG }],
    }).compileComponents();
  });

  it('renders the configured event name', () => {
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(DEFAULT_APP_CONFIG.eventName);
  });

  it('renders an overridden event name', () => {
    TestBed.overrideProvider(APP_CONFIG, {
      useValue: { eventName: 'Copa X', eventShortName: 'CX', eventNameParts: ['Copa', 'X'] },
    });
    const fixture = TestBed.createComponent(AppFooterComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Copa X');
  });
});

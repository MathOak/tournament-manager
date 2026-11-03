import { TestBed } from '@angular/core/testing';
import { PageHeadingComponent } from './page-heading.component';

describe('PageHeadingComponent', () => {
  it('renders title, optional kicker and description', async () => {
    await TestBed.configureTestingModule({ imports: [PageHeadingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(PageHeadingComponent);
    fixture.componentRef.setInput('kicker', 'PARTICIPANTES');
    fixture.componentRef.setInput('title', 'Jogadores');
    fixture.componentRef.setInput('description', 'Gerencie os participantes.');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toBe('Jogadores');
    expect(element.textContent).toContain('PARTICIPANTES');
    expect(element.textContent).toContain('Gerencie os participantes.');
  });
});

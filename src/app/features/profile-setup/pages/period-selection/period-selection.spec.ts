import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeriodSelection } from './period-selection';

describe('PeriodSelection', () => {
  let component: PeriodSelection;
  let fixture: ComponentFixture<PeriodSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeriodSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PeriodSelection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

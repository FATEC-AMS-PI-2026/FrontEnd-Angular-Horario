import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeSemanal } from './grade-semanal';

describe('GradeSemanal', () => {
  let component: GradeSemanal;
  let fixture: ComponentFixture<GradeSemanal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradeSemanal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradeSemanal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

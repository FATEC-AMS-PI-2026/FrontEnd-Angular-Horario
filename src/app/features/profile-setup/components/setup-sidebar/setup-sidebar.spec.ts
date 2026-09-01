import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupSidebar } from './setup-sidebar';

describe('SetupSidebar', () => {
  let component: SetupSidebar;
  let fixture: ComponentFixture<SetupSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupSidebar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupSidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

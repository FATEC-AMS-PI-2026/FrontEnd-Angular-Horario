import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupSidebar } from './setup-sidebar';

describe('SetupSidebar', () => {
  let component: SetupSidebar;
  let fixture: ComponentFixture<SetupSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])], imports: [SetupSidebar]
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

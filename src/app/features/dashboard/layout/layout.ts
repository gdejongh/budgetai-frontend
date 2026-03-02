import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { DashboardStateService } from '../dashboard-state.service';
import { UnallocatedBanner } from '../../../shared/components/unallocated-banner/unallocated-banner';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    UnallocatedBanner,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  protected readonly dashboardState = inject(DashboardStateService);

  protected readonly userEmail = this.authService.userEmail;
  protected readonly bannerDismissed = signal(false);

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );

  ngOnInit(): void {
    this.dashboardState.loadAll();
  }

  onLogout(): void {
    this.authService.logout();
  }

  onDismissBanner(): void {
    this.bannerDismissed.set(true);
  }

  onRetry(): void {
    this.dashboardState.loadAll();
  }
}

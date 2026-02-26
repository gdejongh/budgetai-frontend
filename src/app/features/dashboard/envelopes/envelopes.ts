import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-envelopes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="page-header">
      <h1>Envelopes</h1>
      <p>Organize your budget with envelope categories</p>
    </div>

    <div class="empty-state glass-card">
      <mat-icon>mail</mat-icon>
      <h2>No envelopes yet</h2>
      <p>Create your first envelope to allocate funds and stay within budget.</p>
    </div>
  `,
  styles: `
    .page-header {
      margin-bottom: 2rem;

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.95rem;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 4rem 2rem;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--accent-secondary);
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--text-secondary);
        max-width: 400px;
        font-size: 0.95rem;
      }
    }
  `
})
export class Envelopes {}

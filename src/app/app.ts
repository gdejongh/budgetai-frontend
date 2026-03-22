import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="maintenance">
      <div class="maintenance__card glass-card">
        <div class="maintenance__icon" aria-hidden="true">
          <span class="material-icons">cloud_off</span>
        </div>
        <h1 class="maintenance__title gradient-text">BudgetAI is Offline</h1>
        <p class="maintenance__message">
          To save on AWS hosting costs, this application is currently shut down.
        </p>
        <p class="maintenance__cta">
          If you would like to view the application, please email me at
          <a href="mailto:dejonghgabe1&#64;gmail.com">dejonghgabe1&#64;gmail.com</a>
          and I can enable it.
        </p>
      </div>
    </main>
  `,
  styles: `
    .maintenance {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: 100dvh;
      padding: 1.5rem;
    }

    .maintenance__card {
      max-width: 520px;
      width: 100%;
      padding: 3rem 2.5rem;
      text-align: center;
    }

    .maintenance__icon {
      margin-bottom: 1.5rem;
    }

    .maintenance__icon .material-icons {
      font-size: 4rem;
      color: var(--accent-primary);
      filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.4));
    }

    .maintenance__title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .maintenance__message {
      color: var(--text-secondary);
      font-size: 1.1rem;
      line-height: 1.7;
      margin-bottom: 1rem;
    }

    .maintenance__cta {
      color: var(--text-secondary);
      font-size: 1.1rem;
      line-height: 1.7;
    }

    .maintenance__cta a {
      color: var(--accent-primary);
      font-weight: 600;
    }
  `,
})
export class App {}

import {
  Component,
  ChangeDetectionStrategy,
  input,
  signal,
  effect,
  ElementRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: `
    <span #counterEl class="counter-value">{{ displayValue() | currency: 'USD':'symbol':'1.2-2' }}</span>
  `,
  styles: `
    :host {
      display: inline;
    }
    .counter-value {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class Counter implements OnDestroy {
  readonly targetValue = input.required<number>();
  readonly duration = input(1200);

  protected readonly displayValue = signal(0);

  private animationFrameId: number | null = null;

  constructor() {
    effect(() => {
      const target = this.targetValue();
      const dur = this.duration();
      this.animateTo(target, dur);
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private animateTo(target: number, duration: number): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const start = this.displayValue();
    const diff = target - start;

    if (diff === 0) return;

    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      this.displayValue.set(start + diff * eased);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.displayValue.set(target);
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
  }
}

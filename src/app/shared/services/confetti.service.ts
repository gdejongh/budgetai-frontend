import { Injectable } from '@angular/core';
import confetti from 'canvas-confetti';

@Injectable({ providedIn: 'root' })
export class ConfettiService {
  /** Quick celebratory burst from center */
  burst(): void {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22d3ee', '#818cf8', '#34d399', '#fbbf24', '#f87171'],
      ticks: 200,
      gravity: 1.2,
      scalar: 1.1,
    });
  }

  /** Full celebration — multiple bursts from both sides */
  celebrate(): void {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#22d3ee', '#818cf8', '#34d399'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#22d3ee', '#818cf8', '#fbbf24'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }
}

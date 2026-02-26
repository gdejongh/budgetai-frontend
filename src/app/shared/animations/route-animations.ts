import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
  keyframes,
  state,
  AnimationTriggerMetadata,
} from '@angular/animations';

/** Staggered entrance for lists — each child fades in and bounces up */
export const staggerFadeIn: AnimationTriggerMetadata = trigger('staggerFadeIn', [
  transition('* => *', [
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(40px) scale(0.95)' }),
        stagger('80ms', [
          animate(
            '600ms cubic-bezier(0.35, 0, 0.1, 1.4)',
            style({ opacity: 1, transform: 'translateY(0) scale(1)' })
          ),
        ]),
      ],
      { optional: true }
    ),
  ]),
]);

/** Single element slides up with spring easing */
export const slideInUp: AnimationTriggerMetadata = trigger('slideInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(30px)' }),
    animate(
      '500ms cubic-bezier(0.35, 0, 0.1, 1.3)',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
]);

/** Single element fades in */
export const fadeIn: AnimationTriggerMetadata = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('400ms ease-out', style({ opacity: 1 })),
  ]),
]);

/** Pulsing glow for the unallocated banner */
export const pulseGlow: AnimationTriggerMetadata = trigger('pulseGlow', [
  state('active', style({})),
  transition(':enter', [
    animate(
      '800ms cubic-bezier(0.35, 0, 0.1, 1.3)',
      keyframes([
        style({ opacity: 0, transform: 'translateY(-20px) scaleX(0.95)', offset: 0 }),
        style({ opacity: 1, transform: 'translateY(4px) scaleX(1.01)', offset: 0.7 }),
        style({ opacity: 1, transform: 'translateY(0) scaleX(1)', offset: 1 }),
      ])
    ),
  ]),
  transition(':leave', [
    animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' })),
  ]),
]);

/** Scale bounce for newly created items */
export const scaleBounce: AnimationTriggerMetadata = trigger('scaleBounce', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.8)' }),
    animate(
      '500ms cubic-bezier(0.35, 0, 0.1, 1.5)',
      style({ opacity: 1, transform: 'scale(1)' })
    ),
  ]),
]);

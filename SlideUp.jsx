/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { TIMING } from './timing.js'

const SlideUp = ({ children, duration = TIMING.FADE_IN, distance = 60 }) => (
  <div
    css={{
      width: '100%',
      opacity: 0,
      transform: `translateY(${distance}px)`,
      animation: `slideUp ${duration}ms ease-out forwards`,
      '@keyframes slideUp': {
        from: { opacity: 0, transform: `translateY(${distance}px)` },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    }}
  >
    {children}
  </div>
)

export default SlideUp

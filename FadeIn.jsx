/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { TIMING } from './timing.js'

const FadeIn = ({ children, duration = TIMING.FADE_IN }) => (
  <div
    css={{
      animation: `fadeIn ${duration}ms ease-out forwards`,
      opacity: 0,
      '@keyframes fadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
    }}
  >
    {children}
  </div>
)

export default FadeIn

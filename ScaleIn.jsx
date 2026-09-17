/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { TIMING } from './timing.js'

const ScaleIn = ({
  children,
  duration = TIMING.FADE_IN,
  delay = 0,
  initialScale = 0,
}) => (
  <div
    css={{
      opacity: 0,
      transform: `scale(${initialScale})`,
      animation: `scaleIn ${duration}ms ease-out ${delay}ms forwards`,
      '@keyframes scaleIn': {
        from: { opacity: 0, transform: `scale(${initialScale})` },
        to: { opacity: 1, transform: 'scale(1)' },
      },
    }}
  >
    {children}
  </div>
)

export default ScaleIn

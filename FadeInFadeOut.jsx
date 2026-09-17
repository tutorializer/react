/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { TIMING } from './timing.js'

const FadeInFadeOut = ({ children, duration = 3000 }) => {
  const fadeInEnd = (TIMING.FADE_IN / duration) * 100
  const fadeOutStart = ((duration - TIMING.FADE_OUT) / duration) * 100

  return (
    <div
      css={{
        opacity: 0,
        animation: `fadeInFadeOut ${duration}ms ease forwards`,
        '@keyframes fadeInFadeOut': {
          '0%': { opacity: 0 },
          [`${fadeInEnd}%`]: { opacity: 1 },
          [`${fadeOutStart}%`]: { opacity: 1 },
          '100%': { opacity: 0 },
        },
      }}
    >
      {children}
    </div>
  )
}

export default FadeInFadeOut

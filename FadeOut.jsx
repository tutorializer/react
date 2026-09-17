/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { TIMING } from './timing.js'

const FadeOut = ({ children, duration = 3000 }) => {
  const fadeOutDuration = TIMING.FADE_OUT
  const delay = duration - TIMING.FADE_OUT

  return (
    <div
      css={{
        animation: `fadeOut ${fadeOutDuration}ms ease-in ${delay}ms forwards`,
        '@keyframes fadeOut': {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
      }}
    >
      {children}
    </div>
  )
}

export default FadeOut

/* Copyright 2026 Tutorializer LLC */
import { useEffect, useRef } from 'react'

import { TIMING } from './timing.js'

const ZoomFadeOut = ({ children, duration = 3000, onComplete }) => {
  const ref = useRef(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const fadeOutDuration = TIMING.FADE_OUT
    const delay = duration - TIMING.FADE_OUT

    // Reset to initial state
    el.style.opacity = '1'
    el.style.transform = 'scale(1)'
    el.style.transition = 'none'
    el.getBoundingClientRect() // force reflow

    // Start zoom + fade animation after delay
    const animTimer = setTimeout(() => {
      el.style.transition = `opacity ${fadeOutDuration}ms ease-in, transform ${fadeOutDuration}ms ease-in`
      el.style.opacity = '0'
      el.style.transform = 'scale(1.618)'
    }, delay)

    // Signal completion after full duration
    const completeTimer = setTimeout(() => {
      onCompleteRef.current?.()
    }, duration)

    return () => {
      clearTimeout(animTimer)
      clearTimeout(completeTimer)
    }
  }, [duration])

  return <div ref={ref}>{children}</div>
}

ZoomFadeOut.completes = true

export default ZoomFadeOut

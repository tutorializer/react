/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import StageContext from './StageContext.js'

// How long what is on screen takes to make room for something new, which
// appears once it has
export const STAGE_SHIFT = 450

const SHIFT_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SHIFT_ID = 'tutorializer-stage-shift'

/**
 * A slide's content, centered on both axes, that grows one <Reveal> at a
 * time. Only what has appeared takes room, so whatever is visible stays
 * centered: a headline alone sits in the middle of the slide, and moves up
 * when the first icon below it appears.
 *
 * When a reveal takes its place, everything already on screen glides to its
 * new position first (FLIP: measured before and after the layout change,
 * then animated back with a transform, which the compositor runs), and the
 * newcomer fades in once it has. A shift that is still running when another
 * reveal arrives continues from where it is.
 *
 * Layout containers directly inside the stage, a row of icons for example,
 * take no room and no gap until their first reveal appears.
 *
 * @param {string} gap - Space between the stage's direct children
 * @param {string} direction - 'column' (default) or 'row'
 */
const Stage = ({ children, gap = 'clamp(24px, 4vw, 64px)', direction }) => {
  const [mountTime] = useState(() => performance.now())
  const [placements, setPlacements] = useState(() => new Map())
  const elements = useRef(new Map())
  const before = useRef(null)

  const register = useCallback((id, element) => {
    if (element) {
      elements.current.set(id, element)
    } else {
      elements.current.delete(id)
    }
  }, [])

  const place = useCallback((id, appearAt) => {
    // Where everything is on screen right now, a running shift included
    if (!before.current) {
      before.current = new Map(
        Array.from(elements.current, ([key, element]) => [
          key,
          element.getBoundingClientRect(),
        ]),
      )
    }
    const placedAt = performance.now()
    setPlacements(previous => {
      if (previous.has(id)) return previous
      const next = new Map(previous)
      next.set(id, { placedAt, appearAt })
      return next
    })
  }, [])

  useLayoutEffect(() => {
    const rects = before.current
    before.current = null
    if (!rects) return

    elements.current.forEach((element, key) => {
      const first = rects.get(key)
      if (!first || typeof element.animate !== 'function') return

      element
        .getAnimations()
        .filter(animation => animation.id === SHIFT_ID)
        .forEach(animation => animation.cancel())

      const last = element.getBoundingClientRect()
      const dx = first.left - last.left
      const dy = first.top - last.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

      const animation = element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: STAGE_SHIFT, easing: SHIFT_EASING },
      )
      animation.id = SHIFT_ID
    })
  }, [placements])

  const value = useMemo(
    () => ({ mountTime, placements, place, register }),
    [mountTime, placements, place, register],
  )

  return (
    <StageContext.Provider value={value}>
      <div
        css={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: direction === 'row' ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap,
          '& > :empty': { display: 'none' },
        }}
      >
        {children}
      </div>
    </StageContext.Provider>
  )
}

export default Stage

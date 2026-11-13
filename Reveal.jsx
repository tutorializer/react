/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { keyframes } from '@emotion/react'
import { useCallback, useContext, useEffect, useId, useMemo } from 'react'

import findSpokenCue from './findSpokenCue.js'
import SpeechContext from './SpeechContext.js'
import { STAGE_SHIFT } from './Stage.jsx'
import StageContext from './StageContext.js'
import TutorialContext from './TutorialContext.js'

const ENTER_DURATION = 600
const ENTER_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const entrances = {
  // Text: fades in rising a little
  rise: keyframes({
    from: { opacity: 0, transform: 'translateY(0.6em)' },
    to: { opacity: 1, transform: 'none' },
  }),
  // An icon or a badge: fades in growing
  pop: keyframes({
    from: { opacity: 0, transform: 'scale(0.5)' },
    to: { opacity: 1, transform: 'none' },
  }),
}

/**
 * Something on a <Stage> that appears when the narration says it.
 *
 * Without a `cue` it appears as soon as the stage mounts, which is how a
 * slide's headline starts: alone, in the middle. With one, it appears the
 * moment a <Speech> that starts while the stage is on screen says the cue,
 * timed by that speech's alignment (see findSpokenCue.js for the matching):
 *
 *   <Reveal cue="smartphones">…</Reveal>
 *   <Reveal cue={['smartphones', t('Smartphone', language)]}>…</Reveal>
 *
 * The stage first makes room, shifting what is already visible, and the
 * reveal fades in on the word itself.
 *
 * @param {string|string[]} cue - The words, English first, that bring it in
 * @param {number} delay - Milliseconds after the cue (or the stage's mount)
 * @param {'rise'|'pop'} enter - How it comes in
 */
const Reveal = ({ children, cue, delay = 0, enter = 'rise' }) => {
  const stage = useContext(StageContext)
  const tutorial = useContext(TutorialContext)
  const speeches = useContext(SpeechContext)
  const id = useId()

  const mountTime = stage?.mountTime
  const speechTimings = tutorial?.speechTimings
  // When it appears, and since when that is timed (the stage's mount, or the
  // start of the line that says the cue)
  const timing = useMemo(() => {
    if (mountTime === undefined) return null
    if (!cue) return { at: mountTime + delay, from: mountTime }

    const spoken = (speechTimings || [])
      .filter(({ startTime }) => startTime >= mountTime)
      .map(({ text, startTime }) => ({
        startTime,
        offset: findSpokenCue({ ...speeches?.[text], text }, cue),
      }))
      .find(({ offset }) => offset !== null)

    return spoken
      ? { at: spoken.startTime + spoken.offset + delay, from: spoken.startTime }
      : null
  }, [cue, delay, mountTime, speechTimings, speeches])

  // The viewer's pause holds the line, so it holds the reveal the line
  // times: nothing appears while paused, and a reveal comes as much later
  // as the player spent paused since its line began
  const isPaused = tutorial?.isPaused ?? false
  const getPausedSince = tutorial?.getPausedSince

  // Taking its place a shift early lets it appear on the word itself
  const place = stage?.place
  useEffect(() => {
    if (timing === null || !place || isPaused) return undefined
    const appearAt = timing.at + (getPausedSince?.(timing.from) ?? 0)
    const timer = setTimeout(
      () => place(id, appearAt),
      Math.max(0, appearAt - STAGE_SHIFT - performance.now()),
    )
    return () => clearTimeout(timer)
  }, [timing, id, place, isPaused, getPausedSince])

  const register = stage?.register
  const ref = useCallback(element => register?.(id, element), [id, register])

  if (!stage) return children

  const placement = stage.placements.get(id)
  if (!placement) return null

  const wait = Math.max(0, Math.round(placement.appearAt - placement.placedAt))

  return (
    <div ref={ref}>
      <div
        data-reveal-wait={wait}
        css={{
          animation: `${entrances[enter] || entrances.rise} ${ENTER_DURATION}ms ${ENTER_EASING} ${wait}ms both`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default Reveal

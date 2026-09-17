/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { useContext, useEffect, useRef } from 'react'

import SpeechContext from './SpeechContext.js'
import { TIMING } from './timing.js'
import useTutorial from './useTutorial.js'

/**
 * Available ElevenLabs v3 audio modification tags.
 * Use via the `mod` prop: <Speech mod="whispers">Hello</Speech>
 * The tag is prepended to the text as [tag] when generating speech via ElevenLabs.
 *
 * Vocal delivery:
 *   whispers, sighs, exhales, laughs, laughs harder, starts laughing, wheezing
 *
 * Emotions:
 *   sarcastic, curious, excited, crying, snorts, mischievously
 *
 * Sound effects:
 *   gunshot, applause, clapping, explosion, swallows, gulps
 *
 * Other:
 *   sings, woo, fart
 *
 * Accents (use with "strong" prefix):
 *   "strong French accent", "strong Russian accent", etc.
 *
 * ElevenLabs voice settings (override project defaults):
 *   stability      - 0–1, lower = more expressive (default: 0.5)
 *   similarityBoost - 0–1, adherence to original voice (default: 0.5)
 *   style          - 0–1, amplifies speaker's natural style
 *   useSpeakerBoost - boolean, boosts similarity to original speaker
 *   speed          - number, speech speed multiplier (default: 1.0)
 */

const Speech = ({
  src,
  children,
  mod,
  stability: _stability,
  similarityBoost: _similarityBoost,
  style: _style,
  useSpeakerBoost: _useSpeakerBoost,
  speed: _speed,
  autoplay = true,
  volume = 1.0,
  delay, // If not provided, defaults to TIMING.FADE_IN
  voice: _voice,
  onEnded,
  onComplete,
}) => {
  const audioRef = useRef(null)

  const context = useTutorial()
  const speeches = useContext(SpeechContext)

  // Normalize children text (trim and collapse whitespace like React does for display)
  const childrenText =
    typeof children === 'string'
      ? children.trim().replace(/\s+/g, ' ')
      : children

  // Build speech key: prepend [mod] tag if provided (matches ElevenLabs v3 syntax)
  const speechKey = mod ? `[${mod}] ${childrenText}` : childrenText

  // If src provided, use it; otherwise lookup by speech key
  const audioSrc = src ?? speeches?.[speechKey]?.base64

  // Use timing from context if available, otherwise use default
  const effectiveDelay = delay ?? context?.timing?.FADE_IN ?? TIMING.FADE_IN

  useEffect(() => {
    if (audioRef.current && audioSrc && autoplay) {
      audioRef.current.volume = volume

      const play = () => {
        console.log(`[TIMING] Audio play started at ${Date.now()}`)
        audioRef.current
          ?.play()
          .then(() => {
            // performance.now(), not Date.now(): subtitle offsets are computed
            // by subtracting recordingStartTime, which is captured with
            // performance.now() in this same page. Mixing clocks produced cues
            // timestamped at absolute wall-clock time.
            context?.recordSpeechTiming(childrenText, performance.now())
          })
          .catch(error => {
            console.warn('Audio playback failed:', error)
          })
      }

      if (effectiveDelay > 0) {
        const timer = setTimeout(play, effectiveDelay)
        return () => clearTimeout(timer)
      }
      play()
    }

    return undefined
  }, [audioSrc, autoplay, volume, effectiveDelay])

  if (!audioSrc) return null

  const handleEnded = () => {
    console.log(`[TIMING] Audio ended at ${Date.now()}`)
    // Signal to context that audio completed
    if (context) {
      context.signalAudioComplete()
    }
    onEnded?.()
    onComplete?.()
  }

  return (
    // biome-ignore lint/a11y/useMediaCaption: legacy code
    <audio
      ref={audioRef}
      src={audioSrc}
      onEnded={handleEnded}
      css={{
        display: 'none',
      }}
    />
  )
}

Speech.completes = true
Speech.completionMode = 'audio'

export default Speech

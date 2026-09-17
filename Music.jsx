/* Copyright 2026 Tutorializer LLC */
import { useEffect, useRef } from 'react'

import useTutorial from './useTutorial.js'

const PAUSE_DELAY = 600 // Keep music playing briefly after tutorial ends for recording buffer

const Music = ({ src, volume = 0.15, loop = true }) => {
  const { hasStarted, isPlaying } = useTutorial()
  const audioRef = useRef(null)
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (hasStarted && isPlaying) {
      wasPlayingRef.current = true
      audio.play().catch(() => {
        // Browser autoplay policy may block playback
      })
      return
    }

    if (wasPlayingRef.current) {
      wasPlayingRef.current = false
      const timeout = setTimeout(() => audio.pause(), PAUSE_DELAY)
      return () => clearTimeout(timeout)
    }

    audio.pause()
  }, [hasStarted, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
    }
  }, [volume])

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} src={src} loop={loop} preload="auto" />
  )
}

Music.isTutorialUtility = true

export default Music

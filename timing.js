/* Copyright 2026 Tutorializer LLC */

// Browser animation timings belong to the React runtime. Keeping them here
// lets a standalone @tutorializer/react install avoid the private Node authoring
// utilities used by the recording and publishing pipeline.
export const TIMING = {
  FADE_IN: 600,
  FADE_OUT: 300,
  AUDIO_BUFFER: 100,
  DEFAULT_DURATION: 4000,
  ZOOM_IN: 500,
  ZOOM_OUT: 400,
  ZOOM_PAN: 300,
}

export const getChapterDuration = (
  audioDuration,
  fallback = TIMING.DEFAULT_DURATION,
) =>
  audioDuration
    ? TIMING.FADE_IN + audioDuration + TIMING.FADE_OUT + TIMING.AUDIO_BUFFER
    : fallback

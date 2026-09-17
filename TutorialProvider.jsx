/* Copyright 2026 Tutorializer LLC */
import { useCallback, useEffect, useMemo, useReducer } from 'react'

import { TIMING } from './timing.js'
import TutorialContext, {
  ACTIONS,
  initialState,
  tutorialReducer,
} from './TutorialContext.js'

const TutorialProvider = ({
  children,
  autoPlay = false,
  showControls = false,
  waitForStart = false,
  onComplete,
}) => {
  // Determine initial state based on props
  const shouldAutoStart = () => {
    if (waitForStart) {
      return document.body.hasAttribute('data-recording-started')
    }
    return !showControls || autoPlay
  }

  const [state, dispatch] = useReducer(tutorialReducer, {
    ...initialState,
    isPlaying: shouldAutoStart(),
    hasStarted: shouldAutoStart(),
  })

  // Register a chapter
  const registerChapter = useCallback((name, options = {}) => {
    dispatch({
      type: ACTIONS.REGISTER_CHAPTER,
      payload: { name, ...options },
    })
  }, [])

  // Navigation functions
  const goToNext = useCallback(() => {
    const { chapters, currentIndex } = state
    if (currentIndex < chapters.length - 1) {
      dispatch({ type: ACTIONS.SET_CURRENT_INDEX, payload: currentIndex + 1 })
    } else {
      dispatch({ type: ACTIONS.SET_PLAYING, payload: false })
      dispatch({ type: ACTIONS.SET_ENDED, payload: true })
      dispatch({ type: ACTIONS.SET_TUTORIAL_COMPLETE })
      const lastChapter = chapters[chapters.length - 1]
      if (!lastChapter?.stayVisible) {
        dispatch({ type: ACTIONS.SET_STARTED, payload: false })
        dispatch({ type: ACTIONS.SET_CURRENT_INDEX, payload: 0 })
      }
      onComplete?.()
    }
  }, [state, onComplete])

  const goToPrevious = useCallback(() => {
    if (state.currentIndex > 0) {
      dispatch({ type: ACTIONS.SET_STARTED, payload: true })
      dispatch({ type: ACTIONS.SET_ENDED, payload: false })
      dispatch({
        type: ACTIONS.SET_CURRENT_INDEX,
        payload: state.currentIndex - 1,
      })
    }
  }, [state.currentIndex])

  const goToChapter = useCallback(index => {
    dispatch({ type: ACTIONS.SET_STARTED, payload: true })
    dispatch({ type: ACTIONS.SET_ENDED, payload: false })
    dispatch({ type: ACTIONS.SET_CURRENT_INDEX, payload: index })
  }, [])

  // Start/pause controls
  const start = useCallback(() => {
    dispatch({ type: ACTIONS.SET_STARTED, payload: true })
    dispatch({ type: ACTIONS.SET_ENDED, payload: false })
    dispatch({ type: ACTIONS.SET_PLAYING, payload: true })
  }, [])

  const pause = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PLAYING, payload: false })
  }, [])

  const togglePlayPause = useCallback(() => {
    const { isPlaying, currentIndex, chapters } = state
    dispatch({ type: ACTIONS.SET_STARTED, payload: true })
    dispatch({ type: ACTIONS.SET_ENDED, payload: false })
    // If at the end and paused, restart from beginning
    if (!isPlaying && currentIndex === chapters.length - 1) {
      dispatch({ type: ACTIONS.SET_CURRENT_INDEX, payload: 0 })
    }
    dispatch({ type: ACTIONS.SET_PLAYING, payload: !isPlaying })
  }, [state])

  // Signal completion events
  const signalAudioComplete = useCallback(() => {
    dispatch({ type: ACTIONS.SIGNAL_COMPLETION, payload: 'audio' })
  }, [])

  const signalEventComplete = useCallback(eventName => {
    dispatch({ type: ACTIONS.SIGNAL_COMPLETION, payload: eventName || 'event' })
  }, [])

  const signalAnimationComplete = useCallback(() => {
    dispatch({ type: ACTIONS.SIGNAL_COMPLETION, payload: 'animation' })
  }, [])

  // Tour timing recording functions
  const recordTourStart = useCallback(chapterName => {
    dispatch({
      type: ACTIONS.RECORD_TOUR_START,
      payload: { chapterName, timestamp: Date.now() },
    })
  }, [])

  const recordTourEnd = useCallback(chapterName => {
    dispatch({
      type: ACTIONS.RECORD_TOUR_END,
      payload: { chapterName, timestamp: Date.now() },
    })
  }, [])

  // Speech timing recording function
  const recordSpeechTiming = useCallback((text, startTime) => {
    dispatch({
      type: ACTIONS.RECORD_SPEECH_TIMING,
      payload: { text, startTime },
    })
  }, [])

  // Register preloaded page from Chapter component
  const registerPreloadedPage = useCallback((chapterName, props) => {
    dispatch({
      type: ACTIONS.REGISTER_PRELOADED_PAGE,
      payload: { chapterName, props },
    })
  }, [])

  // Mark tutorial as complete (for video recording detection)
  const markTutorialComplete = useCallback(() => {
    dispatch({ type: ACTIONS.SET_TUTORIAL_COMPLETE })
  }, [])

  // Get current chapter info
  const currentChapter = state.chapters[state.currentIndex]
  const currentChapterName = currentChapter?.name

  // Expose timing data to window for Playwright access
  useEffect(() => {
    window.tutorializer = window.tutorializer || {}
    window.tutorializer.timings = {
      tourTimings: state.tourTimings,
      speechTimings: state.speechTimings,
      tutorialComplete: state.tutorialComplete,
    }
  }, [state.tourTimings, state.speechTimings, state.tutorialComplete])

  const value = useMemo(
    () => ({
      // State
      chapters: state.chapters,
      currentIndex: state.currentIndex,
      currentChapterName,
      isPlaying: state.isPlaying,
      hasStarted: state.hasStarted,
      hasEnded: state.hasEnded,
      completedEvents: state.completedEvents,
      preloadedPages: state.preloadedPages,

      // Timing constants
      timing: TIMING,

      // Registration
      registerChapter,
      registerPreloadedPage,

      // Navigation
      goToNext,
      goToPrevious,
      goToChapter,

      // Playback controls
      start,
      pause,
      togglePlayPause,

      // Completion signals
      signalAudioComplete,
      signalEventComplete,
      signalAnimationComplete,

      // Tour timing recording
      recordTourStart,
      recordTourEnd,

      // Speech timing recording
      recordSpeechTiming,

      // Tutorial completion (for video recording)
      markTutorialComplete,
    }),
    [
      state,
      currentChapterName,
      registerChapter,
      registerPreloadedPage,
      goToNext,
      goToPrevious,
      goToChapter,
      start,
      pause,
      togglePlayPause,
      signalAudioComplete,
      signalEventComplete,
      signalAnimationComplete,
      recordTourStart,
      recordTourEnd,
      recordSpeechTiming,
      markTutorialComplete,
    ],
  )

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  )
}

export default TutorialProvider

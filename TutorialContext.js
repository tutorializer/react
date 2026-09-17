/* Copyright 2026 Tutorializer LLC */
import { createContext } from 'react'

// Action types
export const ACTIONS = {
  REGISTER_CHAPTER: 'REGISTER_CHAPTER',
  REGISTER_PRELOADED_PAGE: 'REGISTER_PRELOADED_PAGE',
  SET_CURRENT_INDEX: 'SET_CURRENT_INDEX',
  SET_PLAYING: 'SET_PLAYING',
  SET_STARTED: 'SET_STARTED',
  SET_ENDED: 'SET_ENDED',
  SIGNAL_COMPLETION: 'SIGNAL_COMPLETION',
  RESET_COMPLETIONS: 'RESET_COMPLETIONS',
  RECORD_TOUR_START: 'RECORD_TOUR_START',
  RECORD_TOUR_END: 'RECORD_TOUR_END',
  RECORD_SPEECH_TIMING: 'RECORD_SPEECH_TIMING',
  SET_TUTORIAL_COMPLETE: 'SET_TUTORIAL_COMPLETE',
}

export const initialState = {
  chapters: [], // Array of { name }
  currentIndex: 0,
  isPlaying: false,
  hasStarted: false,
  hasEnded: false,
  completedEvents: new Set(), // Track completed events for current chapter
  tourTimings: {}, // { chapterName: { start, end } }
  speechTimings: [], // [{ text, startTime }]
  tutorialComplete: false,
  preloadedPages: {}, // { chapterName: { url, zoom, ... } }
}

export const tutorialReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.REGISTER_CHAPTER: {
      const { name, stayVisible, index } = action.payload
      // Check if chapter already registered at this index
      if (state.chapters[index]?.name === name) return state
      // Create a new array with the chapter at the correct index
      const newChapters = [...state.chapters]
      newChapters[index] = { name, stayVisible }
      return {
        ...state,
        chapters: newChapters,
      }
    }
    case ACTIONS.REGISTER_PRELOADED_PAGE: {
      // Check if preloaded page already registered for this chapter
      if (state.preloadedPages[action.payload.chapterName]) return state
      return {
        ...state,
        preloadedPages: {
          ...state.preloadedPages,
          [action.payload.chapterName]: action.payload.props,
        },
      }
    }
    case ACTIONS.SET_CURRENT_INDEX:
      return {
        ...state,
        currentIndex: action.payload,
        completedEvents: new Set(), // Reset completions when changing chapter
      }
    case ACTIONS.SET_PLAYING:
      return { ...state, isPlaying: action.payload }
    case ACTIONS.SET_STARTED:
      return { ...state, hasStarted: action.payload }
    case ACTIONS.SET_ENDED:
      return { ...state, hasEnded: action.payload }
    case ACTIONS.SIGNAL_COMPLETION: {
      const newCompletedEvents = new Set(state.completedEvents)
      newCompletedEvents.add(action.payload)
      return { ...state, completedEvents: newCompletedEvents }
    }
    case ACTIONS.RESET_COMPLETIONS:
      return { ...state, completedEvents: new Set() }
    case ACTIONS.RECORD_TOUR_START:
      return {
        ...state,
        tourTimings: {
          ...state.tourTimings,
          [action.payload.chapterName]: {
            ...state.tourTimings[action.payload.chapterName],
            start: action.payload.timestamp,
          },
        },
      }
    case ACTIONS.RECORD_TOUR_END:
      return {
        ...state,
        tourTimings: {
          ...state.tourTimings,
          [action.payload.chapterName]: {
            ...state.tourTimings[action.payload.chapterName],
            end: action.payload.timestamp,
          },
        },
      }
    case ACTIONS.RECORD_SPEECH_TIMING:
      return {
        ...state,
        speechTimings: [
          ...state.speechTimings,
          { text: action.payload.text, startTime: action.payload.startTime },
        ],
      }
    case ACTIONS.SET_TUTORIAL_COMPLETE:
      return { ...state, tutorialComplete: true }
    default:
      return state
  }
}

const TutorialContext = createContext(null)

export default TutorialContext

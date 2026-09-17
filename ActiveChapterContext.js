/* Copyright 2026 Tutorializer LLC */
import { createContext } from 'react'

// Context for the currently active chapter, provided by TutorialContent
// This allows Chapter components to derive isActive, onComplete, and language from context
// instead of requiring props to be passed through wrapper components
const ActiveChapterContext = createContext(null)

export default ActiveChapterContext

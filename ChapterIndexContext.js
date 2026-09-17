/* Copyright 2026 Tutorializer LLC */
import { createContext } from 'react'

// Context for Tutorial to provide chapter index and isActive to nested Chapter components
// This allows Chapter to receive these values without wrapper components needing to forward props
// Value shape: { index: number, isActive: boolean }
const ChapterIndexContext = createContext(undefined)

export default ChapterIndexContext

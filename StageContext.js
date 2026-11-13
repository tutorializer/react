/* Copyright 2026 Tutorializer LLC */
import { createContext } from 'react'

// What a <Stage> shares with the <Reveal>s on it: when it mounted, which
// reveals have taken their place, and how they take one
const StageContext = createContext(null)

export default StageContext

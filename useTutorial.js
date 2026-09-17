/* Copyright 2026 Tutorializer LLC */
import { useContext } from 'react'

import ActiveChapterContext from './ActiveChapterContext.js'
import TutorialContext from './TutorialContext.js'

const useTutorial = () => {
  const tutorialContext = useContext(TutorialContext)
  const activeChapterContext = useContext(ActiveChapterContext)

  if (!tutorialContext) {
    throw new Error('useTutorial must be used within a Tutorial')
  }

  return {
    ...tutorialContext,
    // Merge active chapter values (may be null during initial render)
    language: activeChapterContext?.language,
    activeChapterName: activeChapterContext?.activeChapterName,
    onChapterComplete: activeChapterContext?.onChapterComplete,
  }
}

export default useTutorial

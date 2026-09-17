/* Copyright 2026 Tutorializer LLC */
import { createContext, useContext } from 'react'

import useTutorial from './useTutorial.js'

const PreloadedPageContext = createContext({})

export const usePreloadedPageRef = chapterName =>
  useContext(PreloadedPageContext)[chapterName]

export const usePreloadedPageRefForCurrentChapter = () => {
  const { activeChapterName } = useTutorial()
  const preloadedPages = useContext(PreloadedPageContext)
  return preloadedPages[activeChapterName]
}

export default PreloadedPageContext

/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from 'react'

import ChapterIndexContext from './ChapterIndexContext.js'
import PreloadedPage from './PreloadedPage.jsx'
import PreloadedPageContext from './PreloadedPageContext.js'
import { TIMING } from './timing.js'
import useTutorial from './useTutorial.js'

const chapterStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 9999,
}

const Chapter = ({
  children,
  name,
  isActive: isActiveProp,
  hasEnded: hasEndedProp,
  animation = 'fade', // 'fade' | 'fadein' | 'fadeout' | 'none'
  stayVisible = false,
  onComplete: onCompleteProp,
  chapterIndex: chapterIndexProp, // Index from Tutorial for correct registration order
}) => {
  const context = useTutorial()

  // Get chapter values from ChapterIndexContext (set by Tutorial's Provider wrapper)
  // This allows Chapter to receive values without wrapper components needing to forward props
  const chapterContext = useContext(ChapterIndexContext)

  // Derive chapterIndex: prefer prop, then context provider, then context map lookup
  const chapterIndex =
    chapterIndexProp ??
    chapterContext?.index ??
    context?.chapterIndexMap?.[name]

  // Derive isActive: prefer prop, then ChapterIndexContext, then ActiveChapterContext
  const deriveIsActive = () => {
    if (isActiveProp !== undefined) return isActiveProp
    if (chapterContext?.isActive !== undefined) return chapterContext.isActive
    return context?.activeChapterName === name
  }
  const isActive = deriveIsActive()

  // Use onComplete from props, or fall back to context's onChapterComplete
  const onComplete = onCompleteProp || context?.onChapterComplete

  // hasEnded: prefer prop, then ChapterIndexContext
  const hasEnded = hasEndedProp ?? chapterContext?.hasEnded ?? false

  // Track exit animation state for fade/fadeout modes
  // Resets automatically on remount since inactive chapters return null (unmount)
  const [isExiting, setIsExiting] = useState(false)

  // Extract PreloadedPage children and their props
  const preloadedPageChild = Children.toArray(children).find(
    child => isValidElement(child) && child.type === PreloadedPage,
  )

  // Check if a shared PreloadedPage (from Tutorial level) already covers this chapter
  const contextRefs = useContext(PreloadedPageContext)
  const hasSharedPreloadedPage = contextRefs?.[name] !== undefined

  // Register PreloadedPage with Tutorial on mount (before paint)
  // Skip if a shared PreloadedPage already covers this chapter
  useLayoutEffect(() => {
    if (
      preloadedPageChild &&
      context?.registerPreloadedPage &&
      !hasSharedPreloadedPage
    ) {
      context.registerPreloadedPage(name, {
        url: preloadedPageChild.props.url,
        zoom: preloadedPageChild.props.zoom,
        title: preloadedPageChild.props.title,
        requiresLogin: preloadedPageChild.props.requiresLogin,
      })
    }
  }, [name, preloadedPageChild?.props?.url, context, hasSharedPreloadedPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filter out PreloadedPage from children (Tutorial renders it at top level)
  const filteredChildren = Children.toArray(children).filter(
    child => !(isValidElement(child) && child.type === PreloadedPage),
  )

  // Handle child completion with appropriate delay based on animation
  // For fade/fadeout: start CSS exit animation, then call onComplete after FADE_OUT
  // For fadein/none: call onComplete immediately
  const handleChildComplete = useCallback(() => {
    const hasFadeOut = animation === 'fade' || animation === 'fadeout'

    if (hasFadeOut) {
      setIsExiting(true)
      setTimeout(() => onComplete?.(), TIMING.FADE_OUT)
    } else {
      onComplete?.()
    }
  }, [animation, onComplete])

  // Clone child and inject onComplete if it has completes=true
  // Use filteredChildren (excludes PreloadedPage which Tutorial renders at top level)
  const childrenWithComplete = Children.map(filteredChildren, child => {
    if (isValidElement(child) && child.type?.completes) {
      return cloneElement(child, { onComplete: handleChildComplete })
    }
    return child
  })

  // Register chapter with context on mount (before paint)
  // chapterIndex ensures correct ordering regardless of registration order
  useLayoutEffect(() => {
    if (context && chapterIndex !== undefined) {
      context.registerChapter(name, { stayVisible, index: chapterIndex })
    }
  }, [name, stayVisible, chapterIndex, context])

  // When chapter has ended but stays visible, show at full opacity
  if (hasEnded && stayVisible) {
    return (
      <div data-chapter={name} css={{ ...chapterStyles, opacity: 1 }}>
        {childrenWithComplete}
      </div>
    )
  }

  // Only render when active
  if (!isActive && !hasEnded) {
    return null
  }

  // Determine CSS animation based on animation mode and exit state
  // All animations use CSS @keyframes (GPU compositor thread) to avoid
  // flicker during recording when rAF is starved by WebGL + screencapturekit
  const hasFadeIn = animation === 'fade' || animation === 'fadein'
  let cssAnimation
  if (isExiting) {
    cssAnimation = `chapterFadeOut ${TIMING.FADE_OUT}ms ease-in forwards`
  } else if (hasFadeIn) {
    cssAnimation = `chapterFadeIn ${TIMING.FADE_IN}ms ease-out forwards`
  }

  return (
    <div
      key={name}
      data-chapter={name}
      css={{
        ...chapterStyles,
        // Set initial opacity: hidden for fade-in, visible otherwise
        opacity: hasFadeIn && !isExiting ? 0 : 1,
        animation: cssAnimation,
        '@keyframes chapterFadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes chapterFadeOut': {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
      }}
    >
      {childrenWithComplete}
    </div>
  )
}

export default Chapter

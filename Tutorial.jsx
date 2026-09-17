/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import {
  Children,
  cloneElement,
  createRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import ActiveChapterContext from './ActiveChapterContext.js'
import ChapterIndexContext from './ChapterIndexContext.js'
import Controls from './Controls.jsx'
import PreloadedPage from './PreloadedPage.jsx'
import PreloadedPageContext from './PreloadedPageContext.js'
import useTutorial from './useTutorial.js'

// Inner component that uses the context
const TutorialContent = ({
  children,
  language = 'en',
  showControls,
  waitForStart,
  onComplete,
}) => {
  const {
    currentIndex,
    isPlaying,
    hasStarted,
    hasEnded,
    start,
    pause,
    togglePlayPause,
    preloadedPages,
    markTutorialComplete,
    chapters: registeredChapters,
  } = useTutorial()

  // We need to track currentIndex locally because context's goToNextChapter
  // uses state.chapters which is populated asynchronously
  const [localCurrentIndex, setLocalCurrentIndex] = useState(currentIndex)

  const [localHasStarted, setLocalHasStarted] = useState(hasStarted)
  const [localHasEnded, setLocalHasEnded] = useState(hasEnded)

  // Sync local state with context
  useEffect(() => {
    setLocalHasStarted(hasStarted)
  }, [hasStarted])

  useEffect(() => {
    setLocalHasEnded(hasEnded)
  }, [hasEnded])

  // Sync currentIndex from context
  useEffect(() => {
    setLocalCurrentIndex(currentIndex)
  }, [currentIndex])

  // Watch for data-recording-started attribute on body to start tutorial (generate mode only)
  useEffect(() => {
    // Only set up observer when waitForStart param is present
    if (!waitForStart) return

    // If already started, no need for observer
    if (localHasStarted) return

    const observer = new MutationObserver(mutations => {
      const hasRecordingStarted = mutations.some(
        mutation =>
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-recording-started',
      )
      if (hasRecordingStarted) {
        start()
        observer.disconnect()
      }
    })

    observer.observe(document.body, { attributes: true })

    return () => observer.disconnect()
  }, [waitForStart, localHasStarted, start])

  const allChildren = Children.toArray(children)

  // Filter out utility children (e.g. Music) — they render persistently, not as chapters
  const utilityChildren = allChildren.filter(
    child => child?.type?.isTutorialUtility,
  )
  const nonUtilityChildren = allChildren.filter(
    child => !child?.type?.isTutorialUtility,
  )

  // Legacy support: Detect PreloadedPage children at the beginning (has activeChapter prop)
  const isLegacyPreloadedPage = child =>
    child?.props?.activeChapter !== undefined ||
    (child?.type?.displayName === 'PreloadedPage' &&
      !child.props?.name &&
      child.props?.activeChapter)

  // Collect all consecutive legacy PreloadedPage children at the beginning
  const legacyPreloadChildren = []
  let chapterStartIndex = 0
  nonUtilityChildren.every((child, i) => {
    if (isLegacyPreloadedPage(child)) {
      legacyPreloadChildren.push(child)
      chapterStartIndex = i + 1
      return true
    }
    return false
  })
  // Detect shared PreloadedPages (with activeForChapters, at Tutorial level)
  const isSharedPreloadedPage = child =>
    child?.type === PreloadedPage &&
    Array.isArray(child?.props?.activeForChapters)

  const sharedPreloadChildren = nonUtilityChildren
    .slice(chapterStartIndex)
    .filter(isSharedPreloadedPage)

  const chapters = nonUtilityChildren
    .slice(chapterStartIndex)
    .filter(child => !isSharedPreloadedPage(child))

  // Extract preloaded page configs from context registrations and shared PreloadedPages
  const { preloadConfigs, refsMap } = useMemo(() => {
    const configs = []
    const refs = {}

    // Shared PreloadedPages first (Tutorial-level, with activeForChapters)
    sharedPreloadChildren.forEach((child, index) => {
      const { activeForChapters, ...props } = child.props
      const ref = createRef()
      configs.push({ key: `shared-${index}`, activeForChapters, props, ref })
      activeForChapters.forEach(name => {
        refs[name] = ref
      })
    })

    // Chapter-registered PreloadedPages (skip if already covered by shared)
    Object.entries(preloadedPages || {}).forEach(([chapterName, props]) => {
      if (!refs[chapterName]) {
        configs.push({ key: `preload-${chapterName}`, chapterName, props })
        refs[chapterName] = createRef()
      }
    })

    return { preloadConfigs: configs, refsMap: refs }
  }, [preloadedPages]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentChapter = chapters[localCurrentIndex]
  // Read chapter name from registered chapters in context (set via Chapter's useLayoutEffect)
  const currentChapterName = registeredChapters[localCurrentIndex]?.name
  const lastChapter = chapters[chapters.length - 1]
  // Read stayVisible from registered chapters in context
  const lastChapterStaysVisible =
    registeredChapters[chapters.length - 1]?.stayVisible

  // Local navigation functions that use JSX children, not context's state.chapters
  const goToNextChapter = () => {
    if (localCurrentIndex < chapters.length - 1) {
      setLocalCurrentIndex(prev => prev + 1)
    } else {
      setLocalHasEnded(true)
      // Update provider state so Music and other context consumers know tutorial ended
      pause()
      // Mark tutorial as complete for video recording detection
      markTutorialComplete?.()
      if (!lastChapterStaysVisible) {
        setLocalHasStarted(false)
        setLocalCurrentIndex(0)
      }
      onComplete?.()
    }
  }

  // Build chapter index map for Chapter to derive chapterIndex from context
  const chapterIndexMap = useMemo(() => {
    const map = {}
    registeredChapters.forEach((ch, idx) => {
      if (ch?.name) map[ch.name] = idx
    })
    return map
  }, [registeredChapters])

  // Active chapter context value - allows Chapter to derive isActive/onComplete from context
  // Note: hasEnded is intentionally NOT in context - it should only be passed via props
  // when Tutorial explicitly renders the last chapter in the stayVisible case
  const activeChapterValue = useMemo(
    () => ({
      activeChapterName: currentChapterName,
      onChapterComplete: goToNextChapter,
      language,
      chapterIndexMap,
    }),
    [currentChapterName, language, chapterIndexMap],
  )

  const goToPrevious = () => {
    setLocalHasStarted(true)
    setLocalHasEnded(false)
    if (localCurrentIndex > 0) {
      setLocalCurrentIndex(prev => prev - 1)
    }
  }

  const goToChapter = index => {
    setLocalHasStarted(true)
    setLocalHasEnded(false)
    setLocalCurrentIndex(index)
  }

  // Memoized context values for ChapterIndexContext to avoid creating new objects every render
  const hiddenChapterContextValues = useMemo(
    () => chapters.map((_, index) => ({ index, isActive: false })),
    [chapters],
  )
  const activeChapterContextValue = useMemo(
    () => ({ index: localCurrentIndex, isActive: true }),
    [localCurrentIndex],
  )
  const stayVisibleChapterContextValue = useMemo(
    () => ({ index: chapters.length - 1, isActive: true, hasEnded: true }),
    [chapters.length],
  )

  // Record chapter start timestamps for VTT generation (video recording mode)
  const chapterStartTimesRef = useRef({})
  useEffect(() => {
    if (localHasStarted && currentChapterName) {
      chapterStartTimesRef.current[currentChapterName] = performance.now()
      // Expose to window for Playwright access during video generation
      window.tutorializer = window.tutorializer || {}
      window.tutorializer.chapterStartTimes = chapterStartTimesRef.current
    }
  }, [currentChapterName, localHasStarted])

  // Note: Timer-based advancement removed - chapters now manage their own completion
  // via Audio.onComplete (for audio mode) or Tour.onComplete (for event mode)
  // Chapter.jsx handles timed mode internally

  // Spacebar to toggle play/pause
  useEffect(() => {
    if (!showControls) return

    const handleKeyDown = event => {
      if (event.code === 'Space') {
        event.preventDefault()
        togglePlayPause()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showControls, togglePlayPause])

  const handleStart = () => {
    start()
    setLocalHasStarted(true)
    setLocalHasEnded(false)
  }

  return (
    <PreloadedPageContext.Provider value={refsMap}>
      <ActiveChapterContext.Provider value={activeChapterValue}>
        <div
          data-tutorial-ready="true"
          css={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: 'var(--color-primary, #2c3e50)',
          }}
        >
          {!localHasStarted && showControls && (
            <div
              css={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-primary, #2c3e50)',
                zIndex: 10001,
              }}
            >
              <button
                type="button"
                onClick={handleStart}
                css={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 6px 30px rgba(0,0,0,0.4)',
                  },
                }}
                aria-label="Start tutorial"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="var(--color-primary, #2c3e50)"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <span
                css={{
                  marginTop: 16,
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14,
                }}
              >
                Click to start
              </span>
            </div>
          )}

          {/* Legacy: Render preload content at Tutorial level (always mounted for warming up) */}
          {legacyPreloadChildren.map((preloadChild, index) =>
            cloneElement(preloadChild, {
              key: preloadChild.props.activeChapter || `preload-${index}`,
              isActive: currentChapterName === preloadChild.props.activeChapter,
              onTutorialComplete: goToNextChapter,
            }),
          )}

          {/* Render PreloadedPages (shared Tutorial-level + chapter-registered) */}
          {preloadConfigs.map(config => (
            <PreloadedPage
              key={config.key}
              ref={config.ref || refsMap[config.chapterName]}
              isActive={
                config.activeForChapters
                  ? config.activeForChapters.includes(currentChapterName)
                  : currentChapterName === config.chapterName
              }
              {...config.props}
            />
          ))}

          {/* Hidden: render ALL chapters to trigger registration */}
          {/* These chapters mount with isActive=false (return null), but their useLayoutEffect registers them */}
          {/* ChapterIndexContext provides index and isActive to nested Chapter components without wrapper forwarding */}
          <div style={{ display: 'none' }}>
            {chapters.map((chapter, index) => (
              <ChapterIndexContext.Provider
                // eslint-disable-next-line react/no-array-index-key
                key={`hidden-${index}`}
                value={hiddenChapterContextValues[index]}
              >
                {cloneElement(chapter, {})}
              </ChapterIndexContext.Provider>
            ))}
          </div>

          {/* Key uses index (stable) since Chapter handles its own CSS exit animations.
              Previously used registeredChapters[index]?.name which changed after registration,
              causing unnecessary unmount/remount. AnimatePresence mode="wait" masked this
              by serializing the unmount/remount, but with CSS animations we need stable keys. */}
          {localHasStarted &&
            chapters.map((chapter, index) =>
              index === localCurrentIndex ? (
                <ChapterIndexContext.Provider
                  key={index} // eslint-disable-line react/no-array-index-key
                  value={activeChapterContextValue}
                >
                  {cloneElement(chapter, {})}
                </ChapterIndexContext.Provider>
              ) : null,
            )}

          {/* Keep last chapter visible after tutorial ends if stayVisible is set */}
          {/* Only render here if hasStarted is false - otherwise it's already shown via chapters.map */}
          {localHasEnded && lastChapterStaysVisible && !localHasStarted && (
            <ChapterIndexContext.Provider
              key={
                registeredChapters[chapters.length - 1]?.name ||
                'last-chapter-persist'
              }
              value={stayVisibleChapterContextValue}
            >
              {cloneElement(lastChapter, {})}
            </ChapterIndexContext.Provider>
          )}

          {/* Utility children (e.g. Music) — always mounted */}
          {utilityChildren}

          {showControls && (
            <Controls
              language={language}
              localCurrentIndex={localCurrentIndex}
              chapters={chapters}
              currentChapter={currentChapter}
              isPlaying={isPlaying}
              togglePlayPause={togglePlayPause}
              goToPrevious={goToPrevious}
              goToNextChapter={goToNextChapter}
              goToChapter={goToChapter}
              setLocalHasStarted={setLocalHasStarted}
              setLocalHasEnded={setLocalHasEnded}
            />
          )}
        </div>
      </ActiveChapterContext.Provider>
    </PreloadedPageContext.Provider>
  )
}

const Tutorial = ({ children, onComplete, language = 'en' }) => {
  // Check URL param to show/hide controls (hidden during recording)
  const params = new URLSearchParams(window.location.search)
  const showControls = params.has('controls')
  const waitForStart = params.has('waitForStart')

  return (
    <TutorialContent
      language={language}
      showControls={showControls}
      waitForStart={waitForStart}
      onComplete={onComplete}
    >
      {children}
    </TutorialContent>
  )
}

export default Tutorial

/* Copyright 2026 Tutorializer LLC */
import { useEffect, useLayoutEffect, useRef } from 'react'

import { TIMING } from './timing.js'
import useTutorial from './useTutorial.js'

const Tour = ({
  preloadedAppRef,
  name,
  language,
  metadata,
  skipSteps,
  onComplete,
}) => {
  const tourStartedRef = useRef(false)

  const context = useTutorial()
  const { activeChapterName } = context

  // Use refs for values that the effect closes over but shouldn't trigger re-runs.
  // Without this, context state changes (e.g. speechTimings) would re-run the effect
  // and clear the pending tour start timeout before it fires.
  const contextRef = useRef(context)
  const onCompleteRef = useRef(onComplete)
  useLayoutEffect(() => {
    contextRef.current = context
    onCompleteRef.current = onComplete
  })

  // Start tour when chapter becomes active and login is complete
  // This component is only mounted when its parent Chapter is active
  useEffect(() => {
    const startTourIfReady = () => {
      const preloadedApp = preloadedAppRef?.current
      if (!preloadedApp) return false

      const iframe = preloadedApp.getIframe()
      const isLoggedIn = preloadedApp.getIsLoggedIn()
      const isLoaded = preloadedApp.getIsLoaded?.() ?? isLoggedIn
      const requiresLogin = preloadedApp.getRequiresLogin?.() ?? true
      const isReady = requiresLogin ? isLoggedIn : isLoaded

      if (isReady && !tourStartedRef.current && iframe) {
        tourStartedRef.current = true
        // Delay to ensure the iframe is visible and app is ready
        // This allows the fade-in animation to complete before tour starts
        const timer = setTimeout(() => {
          console.log(`Starting tour: ${name}`)
          // Record tour start timing to context for Playwright access
          contextRef.current?.recordTourStart(activeChapterName)
          const url = preloadedApp.getUrl()
          const origin = new URL(url).origin
          iframe?.contentWindow?.postMessage(
            {
              type: 'startTour',
              tourName: name,
              options: { language, metadata, skipSteps },
            },
            origin,
          )
        }, TIMING.FADE_IN + 450) // Wait for fade-in + buffer
        return () => clearTimeout(timer)
      }
      return false
    }

    // Try immediately
    const cleanup = startTourIfReady()
    if (cleanup) return cleanup

    // If not ready yet, poll until ready (isLoggedIn may change)
    const interval = setInterval(() => {
      const cleanup = startTourIfReady()
      if (cleanup) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [preloadedAppRef, name, language, metadata, skipSteps, activeChapterName])

  // Listen for tour completion from the iframe
  useEffect(() => {
    const handleMessage = event => {
      const preloadedApp = preloadedAppRef?.current
      let expectedOrigin = null
      try {
        expectedOrigin = new URL(preloadedApp?.getUrl?.()).origin
      } catch {
        // An invalid app URL cannot be a trusted message source.
      }

      if (!expectedOrigin || event.origin !== expectedOrigin) {
        return
      }

      const { type } = event.data || {}

      if (type === 'tourCompleted') {
        // Record tour end timing to context for Playwright access
        contextRef.current?.recordTourEnd(activeChapterName)
        // Signal completion through context if available
        if (contextRef.current) {
          contextRef.current.signalEventComplete('tourCompleted')
        }
        // Call onComplete callback (injected by Series/Parallel)
        onCompleteRef.current?.()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [preloadedAppRef, name, activeChapterName])

  // Reset tour state when component unmounts (chapter becomes inactive)
  useEffect(
    () => () => {
      tourStartedRef.current = false
    },
    [],
  )

  return null
}

Tour.completes = true
Tour.completionMode = 'event'

export default Tour

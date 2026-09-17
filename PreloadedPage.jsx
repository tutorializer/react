/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { TIMING } from './timing.js'

const PreloadedPage = forwardRef(
  (
    {
      url,
      zoom = 1,
      isActive = false,
      activeChapter, // eslint-disable-line no-unused-vars
      onTutorialComplete: _onTutorialComplete, // Deprecated: handled by Tour.jsx
      title = 'App',
      requiresLogin = false, // If true, wait for login-success message before showing
    },
    ref,
  ) => {
    const iframeRef = useRef(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loginUrl] = useState(url)
    const [isVisibleDelayed, setIsVisibleDelayed] = useState(false)

    // Delay visibility when isActive becomes true to allow Chapter content to fade in first
    // Add extra buffer beyond FADE_IN to ensure Headline fully covers screen before iframe shows
    // Reset immediately when isActive becomes false (via cleanup)
    useEffect(() => {
      if (!isActive) {
        return
      }
      // Use FADE_IN + 200ms buffer to ensure Chapter content is fully visible
      const delay = TIMING.FADE_IN + 200
      console.log(
        `[TIMING] PreloadedPage "${title}" delaying visibility for ${delay}ms`,
      )
      const timer = setTimeout(() => {
        console.log(
          `[TIMING] PreloadedPage "${title}" becoming visible after delay`,
        )
        setIsVisibleDelayed(true)
      }, delay)
      return () => {
        console.log(`[TIMING] PreloadedPage "${title}" cleanup - hiding`)
        clearTimeout(timer)
        setIsVisibleDelayed(false)
      }
    }, [isActive, title])

    // Determine if ready to show based on requiresLogin prop and visibility delay
    const isReady = (requiresLogin ? isLoggedIn : isLoaded) && isVisibleDelayed

    // Expose iframe and login state to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        getIframe: () => iframeRef.current,
        getIsLoggedIn: () => isLoggedIn,
        getIsLoaded: () => isLoaded,
        getRequiresLogin: () => requiresLogin,
        getUrl: () => loginUrl,
        getZoom: () => zoom,
      }),
      [isLoggedIn, isLoaded, loginUrl, requiresLogin, zoom],
    )

    // Handle iframe load event
    const handleLoad = () => {
      console.log(`[TIMING] PreloadedPage iframe loaded at ${Date.now()}`)
      setIsLoaded(true)
    }

    // Listen for messages from iframe (login success)
    // Note: tourCompleted is handled by Tour.jsx via Series/Parallel composition
    useEffect(() => {
      const handleMessage = event => {
        // Accept messages from localhost (dev) or same origin (prod)
        const isSameOrigin = event.origin === window.location.origin
        const isLocalhost = event.origin.includes('localhost')
        if (!isSameOrigin && !isLocalhost) {
          return
        }

        const { type } = event.data || {}

        if (type === 'login-success') {
          console.log(`[TIMING] Login success received at ${Date.now()}`)
          setIsLoggedIn(true)
        } else if (type === 'tourCompleted' && isActive) {
          // Log for debugging but don't call onTutorialComplete
          // Tour.jsx handles this via the Series/Parallel composition system
          console.log(`[TIMING] Tour completed received at ${Date.now()}`)
          console.log('Tour completed (handled by Tour.jsx)')
        }
      }

      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }, [isActive])

    // Expose requiresLogin to window so recording script can wait for login
    useEffect(() => {
      if (requiresLogin) {
        window.tutorializer = window.tutorializer || {}
        window.tutorializer.hasRequiresLoginPages = true
      }
    }, [requiresLogin])

    // Signal when login actually completes
    useEffect(() => {
      if (requiresLogin && isLoggedIn) {
        window.tutorializer = window.tutorializer || {}
        window.tutorializer.preloadedPageLoggedIn = true
      }
    }, [requiresLogin, isLoggedIn])

    // Fallback timer for login detection (only when requiresLogin is true)
    useEffect(() => {
      if (!requiresLogin) return

      // After a delay, assume login has completed and show the main app
      // The postMessage from Layout is the primary mechanism; this is an emergency fallback
      const timer = setTimeout(() => {
        console.log(`[TIMING] Login fallback timer triggered at ${Date.now()}`)
        setIsLoggedIn(true)
      }, 10000)

      return () => clearTimeout(timer)
    }, [requiresLogin])

    return (
      <iframe
        ref={iframeRef}
        src={loginUrl}
        onLoad={handleLoad}
        css={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: `${100 / zoom}%`,
          height: `${100 / zoom}%`,
          border: 'none',
          zIndex: isActive && isReady ? 9998 : -1,
          opacity: isActive && isReady ? 1 : 0,
          pointerEvents: isActive && isReady ? 'auto' : 'none',
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
        title={title}
        allow="autoplay"
      />
    )
  },
)

PreloadedPage.displayName = 'PreloadedPage'

export default PreloadedPage

/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { useContext, useEffect, useLayoutEffect, useRef } from 'react'

import SpeechContext from './SpeechContext.js'
import { TIMING } from './timing.js'
import useTutorial from './useTutorial.js'

// How long to wait for the app to describe itself before giving up. Short on
// purpose: this runs on the failure path, after a step already timed out.
const SNAPSHOT_TIMEOUT_MS = 5000

// Storage gets longer: it opens every IndexedDB database and reads records,
// which is slower than serialising the DOM. Still bounded — it runs on the
// failure path, and a hang here would stall the failure path itself.
const STORAGE_TIMEOUT_MS = 10000

const isExpectedMessageOrigin = (eventOrigin, expectedOrigin) =>
  expectedOrigin === '*'
    ? eventOrigin === window.location.origin
    : eventOrigin === expectedOrigin

/* eslint-disable camelcase */
const reconstructWords = alignment => {
  if (!alignment?.characters) return []
  const {
    characters,
    character_start_times_seconds,
    character_end_times_seconds,
  } = alignment
  const words = []
  let currentWord = ''
  let wordStart = null
  for (let i = 0; i < characters.length; i += 1) {
    const char = characters[i]
    if (char === ' ' || char === '\n' || char === '\t') {
      if (currentWord) {
        words.push({
          word: currentWord,
          start: wordStart,
          end: character_end_times_seconds[i - 1],
        })
        currentWord = ''
        wordStart = null
      }
    } else {
      if (wordStart === null) wordStart = character_start_times_seconds[i]
      currentWord += char
    }
  }
  if (currentWord) {
    words.push({
      word: currentWord,
      start: wordStart,
      end: character_end_times_seconds[characters.length - 1],
    })
  }
  return words
}
/* eslint-enable camelcase */

const showOverlayWithKaraoke = (audio, alignment, speed = 1) =>
  new Promise(resolve => {
    const words = reconstructWords(alignment)
    if (!words.length) {
      resolve()
      return
    }

    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 300ms ease;pointer-events:none;'
    const container = document.createElement('div')
    // calc keeps 16px side margins on narrow (smartphone) viewports
    container.style.cssText =
      'max-width:min(800px, calc(100% - 32px));padding:20px 32px;line-height:1.6;font-size:28px;text-align:center;background:rgba(0,0,0,0.75);border-radius:12px;box-sizing:border-box;'
    overlay.appendChild(container)

    const spans = words.map((w, i) => {
      const span = document.createElement('span')
      span.textContent = w.word
      span.style.cssText =
        'color:white;font-weight:normal;transition:color 150ms ease,font-weight 150ms ease,transform 150ms ease;display:inline-block;'
      if (i < words.length - 1) span.style.marginRight = '0.3em'
      container.appendChild(span)
      return span
    })

    document.body.appendChild(overlay)
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
    })

    let animationId = null
    let lastActiveIndex = -1

    const updateHighlight = () => {
      const currentTime = audio.currentTime
      let activeIndex = -1
      for (let i = 0; i < words.length; i += 1) {
        if (currentTime >= words[i].start && currentTime <= words[i].end) {
          activeIndex = i
          break
        }
        if (currentTime < words[i].start) break
        activeIndex = i
      }
      if (activeIndex !== lastActiveIndex) {
        if (lastActiveIndex >= 0 && lastActiveIndex < spans.length) {
          spans[lastActiveIndex].style.color = 'white'
          spans[lastActiveIndex].style.fontWeight = 'normal'
          spans[lastActiveIndex].style.transform = 'scale(1)'
        }
        if (activeIndex >= 0 && activeIndex < spans.length) {
          spans[activeIndex].style.color = 'var(--color-orange, #f5a623)'
          spans[activeIndex].style.fontWeight = 'bold'
          spans[activeIndex].style.transform = 'scale(1.05)'
        }
        lastActiveIndex = activeIndex
      }
      animationId = requestAnimationFrame(updateHighlight)
    }

    const cleanup = () => {
      if (animationId) cancelAnimationFrame(animationId)
      setTimeout(() => {
        overlay.style.opacity = '0'
        setTimeout(() => {
          overlay.remove()
          resolve()
        }, 300)
      }, 500 / speed)
    }

    audio.addEventListener('ended', cleanup, { once: true })
    audio.addEventListener('error', cleanup, { once: true })
    animationId = requestAnimationFrame(updateHighlight)
  })

const showOverlayText = (text, speed = 1) =>
  new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 300ms ease;pointer-events:none;'
    const container = document.createElement('div')
    // calc keeps 16px side margins on narrow (smartphone) viewports
    container.style.cssText =
      'max-width:min(800px, calc(100% - 32px));padding:20px 32px;line-height:1.6;font-size:28px;text-align:center;color:white;background:rgba(0,0,0,0.75);border-radius:12px;box-sizing:border-box;'
    container.textContent = text
    overlay.appendChild(container)
    document.body.appendChild(overlay)
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
    })
    setTimeout(() => {
      overlay.style.opacity = '0'
      setTimeout(() => {
        overlay.remove()
        resolve()
      }, 300)
    }, 3000 / speed)
  })

const TourWithSpeech = ({
  preloadedAppRef,
  name,
  language,
  metadata,
  skipSteps,
  steps: stepsProp,
  speeches: speechesProp,
  speed = 1,
  cursorType,
  entrance,
  onComplete,
}) => {
  const tourStartedRef = useRef(false)
  const audioRef = useRef(null)

  const context = useTutorial()
  const { activeChapterName } = context
  const speeches = useContext(SpeechContext)

  // Use refs for values that the effect closes over but shouldn't trigger re-runs.
  // Without this, recordSpeechTiming updates speechTimings state, which changes
  // the context object, which re-runs this effect and clears the pending tour
  // start timeout before it fires — so the tour never starts.
  const contextRef = useRef(context)
  const speechesRef = useRef(speeches)
  const onCompleteRef = useRef(onComplete)
  const stepsPropRef = useRef(stepsProp)
  const speechesPropRef = useRef(speechesProp)
  const speedRef = useRef(speed)
  const entranceRef = useRef(entrance)
  useLayoutEffect(() => {
    contextRef.current = context
    speechesRef.current = speeches
    onCompleteRef.current = onComplete
    stepsPropRef.current = stepsProp
    speechesPropRef.current = speechesProp
    speedRef.current = speed
    entranceRef.current = entrance
  })

  // Bridge so Node can ask the APP — not this shell — about itself when a step
  // fails. The two live on different ports, so the recorder can neither read the
  // app's document nor its storage (storage is origin-scoped); it calls these,
  // which do the postMessage round trip to TourRunner. Registered independently
  // of the tour effect below so they exist before the first step and survive
  // past the last one.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    // One round trip, two callers. Everything that makes the evidence
    // trustworthy lives here: requestId correlation (several requests can be in
    // flight, one per failing step), a timeout, and — always — a resolve.
    const requestFromApp = ({
      requestType,
      responseType,
      responseKey,
      payload,
      timeoutMs,
    }) =>
      new Promise(resolve => {
        const preloadedApp = preloadedAppRef?.current
        const contentWindow = preloadedApp?.getIframe?.()?.contentWindow
        if (!contentWindow) {
          resolve({ available: false, reason: 'no-iframe' })
          return
        }

        let origin = '*'
        try {
          origin = new URL(preloadedApp.getUrl()).origin
        } catch {
          // Fall back to '*': the evidence is worth more than origin pinning on
          // a localhost recording rig.
        }

        const requestId = `${requestType}-${Date.now()}-${Math.random().toString(36).slice(2)}`
        let settled = false
        let timer = null

        const finish = value => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          // eslint-disable-next-line no-use-before-define
          window.removeEventListener('message', handler)
          resolve(value)
        }

        const handler = event => {
          if (!isExpectedMessageOrigin(event.origin, origin)) return
          if (
            event.data?.type === responseType &&
            event.data.requestId === requestId
          ) {
            finish(
              event.data[responseKey] || {
                available: false,
                reason: 'empty-response',
              },
            )
          }
        }

        // We are asking precisely when the app may be crashed, wedged or
        // navigating, so a missing reply is the expected case — resolve with a
        // labelled absence rather than leaving Node's failure path hanging.
        timer = setTimeout(
          () => finish({ available: false, reason: 'timeout', timeoutMs }),
          timeoutMs,
        )

        window.addEventListener('message', handler)

        try {
          contentWindow.postMessage(
            { type: requestType, requestId, ...payload },
            origin,
          )
        } catch (error) {
          finish({
            available: false,
            reason: 'error',
            collectError: String(error?.message || error),
          })
        }
      })

    const collectAppSnapshot = ({
      selector,
      maxHtmlChars,
      maxOutline,
      timeoutMs = SNAPSHOT_TIMEOUT_MS,
    } = {}) =>
      requestFromApp({
        requestType: 'collectAppSnapshot',
        responseType: 'appSnapshotCollected',
        responseKey: 'snapshot',
        payload: { selector, maxHtmlChars, maxOutline },
        timeoutMs,
      })

    // Longer default than the DOM snapshot: this one opens every IndexedDB
    // database and reads their records, which is genuinely slower than
    // serialising a document — a 5s cap would time out on a healthy app.
    const collectAppStorage = ({
      maxTotalChars,
      maxValueChars,
      timeoutMs = STORAGE_TIMEOUT_MS,
    } = {}) =>
      requestFromApp({
        requestType: 'collectAppStorage',
        responseType: 'appStorageCollected',
        responseKey: 'storage',
        payload: { maxTotalChars, maxValueChars },
        timeoutMs,
      })

    window.tutorializer = window.tutorializer || {}
    window.tutorializer.collectAppSnapshot = collectAppSnapshot
    window.tutorializer.collectAppStorage = collectAppStorage

    return () => {
      if (window.tutorializer?.collectAppSnapshot === collectAppSnapshot) {
        delete window.tutorializer.collectAppSnapshot
      }
      if (window.tutorializer?.collectAppStorage === collectAppStorage) {
        delete window.tutorializer.collectAppStorage
      }
    }
  }, [preloadedAppRef])

  useEffect(() => {
    const sendMessageAndWait = (
      iframe,
      origin,
      message,
      responseType,
      { timeoutMs = 30000, retryIntervalMs = 0, maxRetries = 0 } = {},
    ) =>
      new Promise(resolve => {
        let settled = false
        let retryCount = 0
        let retryTimer = null

        const handler = event => {
          if (!isExpectedMessageOrigin(event.origin, origin)) return
          if (event.data?.type === responseType) {
            settled = true
            if (retryTimer) clearInterval(retryTimer)
            window.removeEventListener('message', handler)
            resolve(event.data)
          }
        }

        window.addEventListener('message', handler)
        iframe.contentWindow?.postMessage(message, origin)

        if (maxRetries > 0 && retryIntervalMs > 0) {
          retryTimer = setInterval(() => {
            if (settled) return
            retryCount += 1
            if (retryCount > maxRetries) {
              clearInterval(retryTimer)
              return
            }
            console.log(
              `[TourWithSpeech] Retrying ${message.type} (${retryCount}/${maxRetries})`,
            )
            iframe.contentWindow?.postMessage(message, origin)
          }, retryIntervalMs)
        }

        setTimeout(() => {
          if (!settled) {
            settled = true
            if (retryTimer) clearInterval(retryTimer)
            window.removeEventListener('message', handler)
            console.error(
              `[TourWithSpeech] sendMessageAndWait timed out waiting for "${responseType}" after ${timeoutMs}ms`,
            )
            resolve(null)
          }
        }, timeoutMs)
      })

    const calculateZoomTransform = (
      rect,
      iframeViewport,
      baseZoom,
      screenWidth,
      screenHeight,
      action,
    ) => {
      let zoomFactor

      if (action === 'highlight') {
        // Fit the full element on screen with 16px padding on each side
        const padding = 16 * 2
        const fitWidth = (screenWidth - padding) / (rect.width * baseZoom)
        const fitHeight = (screenHeight - padding) / (rect.height * baseZoom)
        zoomFactor = Math.min(fitWidth, fitHeight, 3.5)
        zoomFactor = Math.max(zoomFactor, 1)
      } else {
        const elementSize = Math.max(rect.width, rect.height)
        const multiplier = action === 'type' ? 1 : 0.55
        zoomFactor = Math.min(
          Math.max((screenHeight * multiplier) / elementSize, 1.3),
          3.5,
        )
      }

      const scale = baseZoom * zoomFactor

      // Center the element on screen
      // Element center in iframe coordinates
      const centerX = (rect.left + rect.width / 2) * baseZoom
      const centerY = (rect.top + rect.height / 2) * baseZoom

      // Screen center
      const screenCenterX = screenWidth / 2
      const screenCenterY = screenHeight / 2

      // Translation to center the element, accounting for the scale change
      let translateX = screenCenterX - centerX * zoomFactor
      let translateY = screenCenterY - centerY * zoomFactor

      // Clamp so iframe always covers the full screen (no blank edges)
      const scaledWidth = iframeViewport.width * scale
      const scaledHeight = iframeViewport.height * scale

      // Max translate is 0 (can't show blank on left/top)
      translateX = Math.min(translateX, 0)
      translateY = Math.min(translateY, 0)

      // Min translate: scaled content must cover screen right/bottom edge
      translateX = Math.max(translateX, screenWidth - scaledWidth)
      translateY = Math.max(translateY, screenHeight - scaledHeight)

      return { scale, translateX, translateY }
    }

    const getElementDistance = (rectA, rectB) => {
      const centerAx = rectA.left + rectA.width / 2
      const centerAy = rectA.top + rectA.height / 2
      const centerBx = rectB.left + rectB.width / 2
      const centerBy = rectB.top + rectB.height / 2
      return Math.sqrt((centerAx - centerBx) ** 2 + (centerAy - centerBy) ** 2)
    }

    const EASING_ZOOM_IN = 'cubic-bezier(0.23, 0, 0.16, 1)'
    const EASING_ZOOM_OUT = 'cubic-bezier(0.36, 0, 0.33, 1)'
    const EASING_PAN = 'cubic-bezier(0.4, 0, 0.2, 1)'

    const animateZoom = (iframe, transform, duration, easing) => {
      const anim = iframe.animate(
        [
          {
            transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
          },
        ],
        { duration, easing, fill: 'forwards' },
      )
      return anim.finished.then(() => {
        anim.commitStyles()
        anim.cancel()
      })
    }

    const animateZoomOut = (iframe, baseZoom, duration) => {
      const anim = iframe.animate([{ transform: `scale(${baseZoom})` }], {
        duration,
        easing: EASING_ZOOM_OUT,
        fill: 'forwards',
      })
      return anim.finished.then(() => {
        anim.commitStyles()
        anim.cancel()
      })
    }

    const CURSOR_ACTIONS = new Set(['click', 'type', 'upload', 'move', 'hover'])

    const waitForMessage = (messageType, timeoutMs = 5000) =>
      new Promise(resolve => {
        const timeout = setTimeout(resolve, timeoutMs)
        const handler = event => {
          if (event.data?.type === messageType) {
            clearTimeout(timeout)
            window.removeEventListener('message', handler)
            resolve()
          }
        }
        window.addEventListener('message', handler)
      })

    // Duration scales with how much the zoom level changes — large jumps get
    // more time so the animation doesn't feel rushed.
    const getZoomDuration = (fromScale, toScale, baseDuration) => {
      const ratio = Math.max(fromScale, toScale) / Math.min(fromScale, toScale)
      const effectiveSpeed = speedRef.current || 1
      return Math.round(
        (baseDuration / effectiveSpeed) * Math.max(ratio / 1.15, 1),
      )
    }

    // Shared zoom state across steps — avoids zoom-out/zoom-in between nearby elements
    const zoomState = {
      isZoomed: false,
      lastRect: null,
      lastViewport: null,
      lastScale: null,
      lastStepNavigated: false,
      activeGroup: null, // current group name (e.g. 'import-menu')
      activeGroupScale: null, // zoom scale shared across group steps
    }

    const executeStepWithSpeech = (iframe, origin, step, allSteps) =>
      new Promise(resolve => {
        // Overview steps show karaoke overlay with speech, no iframe interaction
        if (step.action === 'overview') {
          if (speechesPropRef.current === false) {
            resolve()
            return
          }
          const effectiveSpeed = speedRef.current || 1
          const description = step.description
          const speechEntry = description && speechesRef.current?.[description]
          const audioSrc = speechEntry?.base64
          const alignment = speechEntry?.alignment

          if (audioSrc && audioRef.current) {
            const audio = audioRef.current
            audio.src = audioSrc

            if (alignment) {
              // Play audio and show karaoke overlay simultaneously
              audio
                .play()
                .then(() => {
                  // performance.now(), not Date.now(): these timings are turned
                  // into subtitle offsets by subtracting recordingStartTime,
                  // which generateTutorial.js captures with performance.now()
                  // in this same page. Mixing the two clocks left the epoch
                  // almost intact and produced cues 56 years into the video.
                  contextRef.current?.recordSpeechTiming(
                    description,
                    performance.now(),
                  )
                })
                .catch(error => {
                  console.warn('Audio playback failed:', error)
                })
              showOverlayWithKaraoke(audio, alignment, effectiveSpeed).then(
                resolve,
              )
            } else {
              // No alignment: play audio with static text overlay
              const audioPromise = new Promise(audioResolve => {
                const onEnded = () => {
                  audio.removeEventListener('ended', onEnded)
                  audioResolve()
                }
                audio.addEventListener('ended', onEnded)
                audio
                  .play()
                  .then(() => {
                    contextRef.current?.recordSpeechTiming(
                      description,
                      Date.now(),
                    )
                  })
                  .catch(error => {
                    console.warn('Audio playback failed:', error)
                    audio.removeEventListener('ended', onEnded)
                    audioResolve()
                  })
              })
              Promise.all([
                audioPromise,
                showOverlayText(description, effectiveSpeed),
              ]).then(resolve)
            }
          } else if (description) {
            showOverlayText(description, effectiveSpeed).then(resolve)
          } else {
            resolve()
          }
          return
        }

        let stepDone = false
        let audioDone = false

        const preloadedApp = preloadedAppRef?.current
        const baseZoom = preloadedApp?.getZoom?.() || 1
        const screenWidth = window.innerWidth
        const screenHeight = window.innerHeight

        const checkBothDone = () => {
          if (stepDone && audioDone) {
            resolve()
          }
        }

        // Listen for tourStepPosition to animate zoom before cursor action
        const positionHandler = event => {
          if (event.data?.type !== 'tourStepPosition') return
          window.removeEventListener('message', positionHandler)

          const { rect, viewport } = event.data
          const transform = calculateZoomTransform(
            rect,
            viewport,
            baseZoom,
            screenWidth,
            screenHeight,
            step.action,
          )

          const hasCursorMove = CURSOR_ACTIONS.has(step.action || 'click')
          const distance =
            zoomState.isZoomed && zoomState.lastRect
              ? getElementDistance(zoomState.lastRect, rect)
              : Infinity
          // If the zoom level needs to change significantly, skip shortcuts
          const scaleRatio = zoomState.lastScale
            ? Math.max(zoomState.lastScale, transform.scale) /
              Math.min(zoomState.lastScale, transform.scale)
            : 1
          const needsZoomChange = scaleRatio > 2.0
          // After a navigating step the previous rect is from a different page,
          // so the distance is meaningless. Treat as nearby for a smooth pan.
          const crossPageTransition =
            zoomState.isZoomed && zoomState.lastStepNavigated
          // Very close: element is so near the camera doesn't need to move at all
          const veryClose =
            !crossPageTransition &&
            distance < viewport.height * 0.1 &&
            !needsZoomChange
          // Nearby: small pan is enough, no need for full zoom-out/zoom-in
          const nearby =
            (distance < viewport.height * 0.5 || crossPageTransition) &&
            !needsZoomChange

          // Parse step.zoom value
          const zoomMode = step.zoom
          const isGroupZoom =
            typeof zoomMode === 'string' && zoomMode.startsWith('group:')
          const groupName = isGroupZoom ? zoomMode.slice(6) : null
          const isNumericZoom = typeof zoomMode === 'number'

          // Override transform for numeric zoom
          const effectiveTransform = (() => {
            if (isNumericZoom) {
              const scale = baseZoom * zoomMode
              const centerX = (rect.left + rect.width / 2) * baseZoom
              const centerY = (rect.top + rect.height / 2) * baseZoom
              let translateX = screenWidth / 2 - centerX * zoomMode
              let translateY = screenHeight / 2 - centerY * zoomMode
              const scaledWidth = viewport.width * scale
              const scaledHeight = viewport.height * scale
              translateX = Math.min(translateX, 0)
              translateY = Math.min(translateY, 0)
              translateX = Math.max(translateX, screenWidth - scaledWidth)
              translateY = Math.max(translateY, screenHeight - scaledHeight)
              return { scale, translateX, translateY }
            }
            return transform
          })()

          const handleZoomAndProceed = async () => {
            // --- zoom: "none" — full-screen view at base zoom ---
            if (zoomMode === 'none') {
              if (zoomState.isZoomed) {
                const outDuration = getZoomDuration(
                  zoomState.lastScale || baseZoom,
                  baseZoom,
                  TIMING.ZOOM_OUT,
                )
                await animateZoomOut(iframe, baseZoom, outDuration)
              }
              // Proceed at base zoom
              if (hasCursorMove) {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
              }
              zoomState.isZoomed = false
              zoomState.lastRect = rect
              zoomState.lastViewport = viewport
              zoomState.lastScale = baseZoom
              zoomState.lastStepNavigated = !!step.navigates
              zoomState.activeGroup = null
              zoomState.activeGroupScale = null
              return
            }

            // --- zoom: "keep" — maintain current zoom, no camera change ---
            if (zoomMode === 'keep') {
              if (hasCursorMove) {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
              }
              zoomState.lastRect = rect
              zoomState.lastViewport = viewport
              zoomState.lastStepNavigated = !!step.navigates
              return
            }

            // --- zoom: "group:name" — shared zoom for grouped steps ---
            if (isGroupZoom) {
              const isFirstInGroup = zoomState.activeGroup !== groupName

              if (isFirstInGroup) {
                // Collect all selectors for steps in the same group
                const groupSelectors = allSteps
                  .filter(s => s.zoom === `group:${groupName}` && s.selector)
                  .map(s => s.selector)

                // Request positions of all group elements from iframe
                const groupRects = await new Promise(resolve => {
                  const handler = event => {
                    if (event.data?.type === 'groupPositions') {
                      window.removeEventListener('message', handler)
                      resolve(event.data.rects.filter(Boolean))
                    }
                  }
                  window.addEventListener('message', handler)
                  iframe.contentWindow?.postMessage(
                    {
                      type: 'getGroupPositions',
                      selectors: groupSelectors,
                    },
                    origin,
                  )
                  // Fallback: if no response in 1s, use current rect only
                  setTimeout(() => {
                    window.removeEventListener('message', handler)
                    resolve([rect])
                  }, 1000)
                })

                // Compute union bounding box of all group elements
                const unionRect = groupRects.reduce(
                  (acc, r) => ({
                    top: Math.min(acc.top, r.top),
                    left: Math.min(acc.left, r.left),
                    bottom: Math.max(acc.bottom, r.top + r.height),
                    right: Math.max(acc.right, r.left + r.width),
                  }),
                  {
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.top + rect.height,
                    right: rect.left + rect.width,
                  },
                )

                const groupWidth = unionRect.right - unionRect.left
                const groupHeight = unionRect.bottom - unionRect.top
                const groupCenterX = (unionRect.left + unionRect.right) / 2
                const groupCenterY = (unionRect.top + unionRect.bottom) / 2

                // Calculate zoom to fit the group bounding box with padding
                const PADDING = 80
                const GROUP_MAX_ZOOM = 2.0
                const zoomToFitWidth =
                  (screenWidth - PADDING * 2) / (groupWidth * baseZoom)
                const zoomToFitHeight =
                  (screenHeight - PADDING * 2) / (groupHeight * baseZoom)
                let zoomFactor = Math.min(
                  zoomToFitWidth,
                  zoomToFitHeight,
                  GROUP_MAX_ZOOM,
                )
                zoomFactor = Math.max(zoomFactor, 1.3) // minimum zoom

                const groupScale = baseZoom * zoomFactor
                const centerX = groupCenterX * baseZoom
                const centerY = groupCenterY * baseZoom
                let translateX = screenWidth / 2 - centerX * zoomFactor
                let translateY = screenHeight / 2 - centerY * zoomFactor

                // Boundary clamping
                const scaledWidth = viewport.width * groupScale
                const scaledHeight = viewport.height * groupScale
                translateX = Math.min(translateX, 0)
                translateY = Math.min(translateY, 0)
                translateX = Math.max(translateX, screenWidth - scaledWidth)
                translateY = Math.max(translateY, screenHeight - scaledHeight)

                const groupTransform = {
                  scale: groupScale,
                  translateX,
                  translateY,
                }

                // Animate to group zoom level — two-phase if coming from high zoom
                const fromScale = zoomState.isZoomed
                  ? zoomState.lastScale || baseZoom
                  : baseZoom
                const scaleRatio =
                  Math.max(fromScale, groupTransform.scale) /
                  Math.min(fromScale, groupTransform.scale)

                if (zoomState.isZoomed && scaleRatio > 1.8) {
                  // Two-phase: zoom out first, then zoom into group
                  const outDuration = getZoomDuration(
                    fromScale,
                    baseZoom,
                    TIMING.ZOOM_OUT,
                  )
                  await animateZoomOut(iframe, baseZoom, outDuration)
                  const inDuration = getZoomDuration(
                    baseZoom,
                    groupTransform.scale,
                    TIMING.ZOOM_IN,
                  )
                  await animateZoom(
                    iframe,
                    groupTransform,
                    inDuration,
                    EASING_ZOOM_IN,
                  )
                } else {
                  const duration = getZoomDuration(
                    fromScale,
                    groupTransform.scale,
                    TIMING.ZOOM_IN,
                  )
                  await animateZoom(
                    iframe,
                    groupTransform,
                    duration,
                    EASING_ZOOM_IN,
                  )
                }

                zoomState.activeGroup = groupName
                zoomState.activeGroupScale = groupTransform.scale
              } else {
                // Subsequent step in group — camera stays fixed at group position
                // (group zoom was calculated to fit all elements on screen)
              }

              // Proceed with step
              if (hasCursorMove) {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
              }

              zoomState.isZoomed = true
              zoomState.lastRect = rect
              zoomState.lastViewport = viewport
              zoomState.lastScale = zoomState.activeGroupScale
              zoomState.lastStepNavigated = !!step.navigates
              return
            }

            // For "selector" mode or numeric zoom, clear group state
            if (zoomMode === 'selector' || isNumericZoom) {
              zoomState.activeGroup = null
              zoomState.activeGroupScale = null
            }

            // --- zoom: "selector" — force full zoom-out → cursor → zoom-in ---
            if (zoomMode === 'selector') {
              if (zoomState.isZoomed) {
                const outDuration = getZoomDuration(
                  zoomState.lastScale || baseZoom,
                  baseZoom,
                  TIMING.ZOOM_OUT,
                )
                await animateZoomOut(iframe, baseZoom, outDuration)
              }
              if (hasCursorMove) {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                const inDuration = getZoomDuration(
                  baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_IN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  inDuration,
                  EASING_ZOOM_IN,
                )
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else if (step.action === 'highlight') {
                const inDuration = getZoomDuration(
                  baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_IN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  inDuration,
                  EASING_ZOOM_IN,
                )
              } else {
                const inDuration = getZoomDuration(
                  baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_IN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  inDuration,
                  EASING_ZOOM_IN,
                )
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
              }

              zoomState.isZoomed = true
              zoomState.lastRect = rect
              zoomState.lastViewport = viewport
              zoomState.lastScale = effectiveTransform.scale
              zoomState.lastStepNavigated = !!step.navigates
              return
            }

            // --- Default behavior (omitted zoom or numeric zoom) ---
            // Clear group state when leaving a group
            if (!isGroupZoom && zoomState.activeGroup) {
              zoomState.activeGroup = null
              zoomState.activeGroupScale = null
            }

            // Navigating step at base zoom: no camera animation needed.
            // Just respond to the protocol immediately so the iframe
            // doesn't hit its 2-second fallback timeouts.
            if (step.navigates && !zoomState.isZoomed) {
              if (hasCursorMove) {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else {
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
              }
              zoomState.lastStepNavigated = true
              return
            }

            if (hasCursorMove) {
              // Cursor-movement actions: zoom in AFTER cursor arrives
              if (veryClose && !isNumericZoom) {
                // Very close — keep camera still, just let cursor move
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else if (nearby && !isNumericZoom) {
                // Nearby — pan to new position, cursor moves short distance
                const panDuration = getZoomDuration(
                  zoomState.lastScale || baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_PAN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  panDuration,
                  EASING_PAN,
                )
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              } else {
                // Far away or not zoomed — zoom out if needed, let cursor
                // travel at base zoom so the movement is fully visible,
                // then zoom in after cursor arrives at the target
                if (zoomState.isZoomed) {
                  const outDuration = getZoomDuration(
                    zoomState.lastScale || baseZoom,
                    baseZoom,
                    TIMING.ZOOM_OUT,
                  )
                  await animateZoomOut(iframe, baseZoom, outDuration)
                }
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithStep' },
                  origin,
                )
                await waitForMessage('cursorArrived')
                const inDuration = getZoomDuration(
                  baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_IN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  inDuration,
                  EASING_ZOOM_IN,
                )
                iframe.contentWindow?.postMessage(
                  { type: 'proceedWithAction' },
                  origin,
                )
              }
            } else if (step.action === 'highlight') {
              // Highlight: always animate to the computed transform so the
              // zoom level adjusts to fit the full element on screen, even
              // when the element center is nearby the previous target.
              const duration = getZoomDuration(
                zoomState.lastScale || baseZoom,
                effectiveTransform.scale,
                zoomState.isZoomed ? TIMING.ZOOM_OUT : TIMING.ZOOM_IN,
              )
              const easing = zoomState.isZoomed
                ? EASING_ZOOM_OUT
                : EASING_ZOOM_IN
              await animateZoom(iframe, effectiveTransform, duration, easing)
            } else {
              // Non-cursor actions (scroll, wait): zoom BEFORE action
              if (veryClose && !isNumericZoom) {
                // Camera already covers this element, no movement needed
              } else if (nearby && !isNumericZoom) {
                const panDuration = getZoomDuration(
                  zoomState.lastScale || baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_PAN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  panDuration,
                  EASING_PAN,
                )
              } else {
                if (zoomState.isZoomed) {
                  const outDuration = getZoomDuration(
                    zoomState.lastScale || baseZoom,
                    baseZoom,
                    TIMING.ZOOM_OUT,
                  )
                  await animateZoomOut(iframe, baseZoom, outDuration)
                }
                const inDuration = getZoomDuration(
                  baseZoom,
                  effectiveTransform.scale,
                  TIMING.ZOOM_IN,
                )
                await animateZoom(
                  iframe,
                  effectiveTransform,
                  inDuration,
                  EASING_ZOOM_IN,
                )
              }
              iframe.contentWindow?.postMessage(
                { type: 'proceedWithStep' },
                origin,
              )
            }

            zoomState.isZoomed = true
            zoomState.lastRect = rect
            zoomState.lastViewport = viewport
            zoomState.lastScale = effectiveTransform.scale
            zoomState.lastStepNavigated = !!step.navigates
          }

          handleZoomAndProceed()
        }

        // Always participate in the three-phase protocol when the step has a
        // selector, so the iframe doesn't hit its fallback timeouts. Navigating
        // steps from base zoom get a fast-path in handleZoomAndProceed that
        // responds immediately without any camera animation.
        const hasSelector = !!step.selector

        const startStep = async () => {
          if (hasSelector) {
            window.addEventListener('message', positionHandler)
          } else if (zoomState.isZoomed) {
            // Non-zoomable step but we're zoomed — zoom out first
            const outDuration = getZoomDuration(
              zoomState.lastScale || baseZoom,
              baseZoom,
              TIMING.ZOOM_OUT,
            )
            await animateZoomOut(iframe, baseZoom, outDuration)
            zoomState.isZoomed = false
            zoomState.lastRect = null
            zoomState.lastScale = null
            zoomState.lastStepNavigated = false
          }

          // Publish the step we're about to dispatch on window.tutorializer
          // BEFORE sending it, so a step that hangs still leaves its identity
          // visible — that's the case the recorder can't see today, where all
          // we get is a selector and a 60s timeout. Uses performance.now()
          // like every other timestamp the recorder correlates (Date.now()
          // would be a different clock).
          let publishedStep = null
          if (typeof window !== 'undefined') {
            window.tutorializer = window.tutorializer || {}
            publishedStep = {
              tour: name,
              step: step.step,
              selector: step.selector,
              action: step.action,
              description: step.description,
              startedAt: performance.now(),
            }
            window.tutorializer.tourStep = publishedStep
          }

          // Start step execution in iframe
          sendMessageAndWait(
            iframe,
            origin,
            { type: 'executeTourStep', step },
            'tourStepCompleted',
            { timeoutMs: 60000 },
          ).then(result => {
            // A step fails if the iframe never replied (hung → 60s timeout) or
            // it reported success:false (target element never appeared / action
            // threw). Surface a specific, actionable message AND expose it on
            // window.tutorializer.tourError so the recording pipeline can fail
            // fast with a clear reason instead of recording silently until the
            // completion timeout expires.
            const failed = !result || result.success === false
            if (failed) {
              let reason
              if (!result) reason = 'no response within 60s (step hung)'
              else if (result.error) reason = `error: ${result.error}`
              else reason = `element not found for "${step.selector}"`
              const detail = `Tour "${name}" step ${step.step} (${step.action || 'click'} "${step.selector}"${step.description ? ` — ${step.description}` : ''}) FAILED: ${reason}`
              console.error(`[TourWithSpeech] ${detail}`)
              if (typeof window !== 'undefined') {
                window.tutorializer = window.tutorializer || {}
                window.tutorializer.tourError = {
                  tour: name,
                  step: step.step,
                  selector: step.selector,
                  action: step.action,
                  description: step.description,
                  reason,
                  detail,
                }
              }
            }
            // Stamp the published step as finished so a poller can never read
            // a stale entry as still in flight. Mutating our own object is
            // enough: if a later step already replaced window.tutorializer
            // .tourStep, this only touches the orphan.
            if (publishedStep) {
              publishedStep.completedAt = performance.now()
              publishedStep.failed = failed
            }
            stepDone = true
            // Clean up position handler if step completed without position
            window.removeEventListener('message', positionHandler)
            checkBothDone()
          })

          // Play speech audio for this step's description
          const description = step.description
          const audioSrc =
            speechesPropRef.current !== false &&
            description &&
            speechesRef.current?.[description]?.base64

          if (audioSrc && audioRef.current) {
            const audio = audioRef.current
            // Safety net: if the 'ended' event never fires (e.g. playback
            // stalls in the recording environment), force completion so the
            // step — and the whole tour — can't hang to the recorder timeout.
            let endedFallback = null
            const onEnded = () => {
              if (endedFallback) clearTimeout(endedFallback)
              audio.removeEventListener('ended', onEnded)
              audioDone = true
              checkBothDone()
            }
            audio.addEventListener('ended', onEnded)
            audio.src = audioSrc
            audio
              .play()
              .then(() => {
                // Same clock as recordingStartTime — see the note above.
                contextRef.current?.recordSpeechTiming(
                  description,
                  performance.now(),
                )
                const durationMs = Number.isFinite(audio.duration)
                  ? audio.duration * 1000
                  : 0
                const speedFactor = speedRef.current || 1
                endedFallback = setTimeout(
                  onEnded,
                  durationMs / speedFactor + 5000,
                )
              })
              .catch(error => {
                console.warn('Audio playback failed:', error)
                audio.removeEventListener('ended', onEnded)
                audioDone = true
                checkBothDone()
              })
          } else {
            // No audio for this step, mark as done immediately
            audioDone = true
            checkBothDone()
          }
        }

        startStep()
      })

    const finishTour = () => {
      contextRef.current?.recordTourEnd(activeChapterName)
      if (contextRef.current) {
        contextRef.current.signalEventComplete('tourCompleted')
      }
      onCompleteRef.current?.()
    }

    const runStepByStep = async (iframe, origin) => {
      const params = new URLSearchParams(window.location.search)
      const device = params.get('device')

      // Send init message with tourName; iframe reads steps and sends them back
      // Retry periodically in case TourRunner hasn't initialized yet (race condition on cold load)
      const response = await sendMessageAndWait(
        iframe,
        origin,
        {
          type: 'initStepByStep',
          tourName: name,
          options: {
            language,
            metadata,
            skipSteps,
            device,
            speed: speedRef.current || 1,
            cursorType,
            entrance: entranceRef.current,
          },
        },
        'stepByStepReady',
        { timeoutMs: 30000, retryIntervalMs: 2000, maxRetries: 10 },
      )

      if (!response) {
        console.error(
          `[TourWithSpeech] Tour "${name}" failed: iframe did not respond to initStepByStep after retries`,
        )
        finishTour()
        return
      }

      const steps = stepsPropRef.current || response.steps || []

      // Pre-allocate compositor layer for the entire tour
      iframe.style.willChange = 'transform'
      iframe.style.transition = 'none'

      console.log('[TourWithSpeech] runStepByStep', {
        hasStepsProp: !!stepsPropRef.current,
        stepsPropLength: stepsPropRef.current?.length,
        responseStepsLength: response.steps?.length,
        stepsLength: steps.length,
        firstStepAction: steps[0]?.action,
      })

      if (steps.length === 0) {
        console.error(`Tour "${name}" has no steps`)
        iframe.style.willChange = ''
        iframe.style.transition = ''
        finishTour()
        return
      }

      // Execute each step sequentially
      await steps.reduce(async (previousPromise, step) => {
        await previousPromise
        await executeStepWithSpeech(iframe, origin, step, steps)
      }, Promise.resolve())

      // Final zoom-out if still zoomed after last step
      if (zoomState.isZoomed) {
        const baseZoom = preloadedAppRef?.current?.getZoom?.() || 1
        const outDuration = getZoomDuration(
          zoomState.lastScale || baseZoom,
          baseZoom,
          TIMING.ZOOM_OUT,
        )
        await animateZoomOut(iframe, baseZoom, outDuration)
        zoomState.isZoomed = false
      }

      // Cleanup
      await sendMessageAndWait(
        iframe,
        origin,
        { type: 'cleanupStepByStep' },
        'stepByStepCleanedUp',
        { timeoutMs: 5000 },
      )

      iframe.style.willChange = ''
      iframe.style.transition = ''
      finishTour()
    }

    const startTourIfReady = () => {
      const preloadedApp = preloadedAppRef?.current
      if (!preloadedApp) return false

      const iframe = preloadedApp.getIframe()
      const isLoggedIn = preloadedApp.getIsLoggedIn()

      if (isLoggedIn && !tourStartedRef.current && iframe) {
        tourStartedRef.current = true

        const timer = setTimeout(
          () => {
            console.log(`Starting TourWithSpeech: ${name}`)
            contextRef.current?.recordTourStart(activeChapterName)

            const url = preloadedApp.getUrl()
            const origin = new URL(url).origin

            runStepByStep(iframe, origin)
          },
          (TIMING.FADE_IN + 450) / (speedRef.current || 1),
        )

        return () => clearTimeout(timer)
      }
      return false
    }

    // Try immediately
    const cleanup = startTourIfReady()
    if (cleanup) return cleanup

    // If not ready yet, poll until ready
    const interval = setInterval(() => {
      const intervalCleanup = startTourIfReady()
      if (intervalCleanup) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [preloadedAppRef, name, language, metadata, skipSteps, activeChapterName])

  // Reset tour state when component unmounts
  useEffect(
    () => () => {
      tourStartedRef.current = false
    },
    [],
  )

  return (
    // biome-ignore lint/a11y/useMediaCaption: audio element for tour speech narration
    <audio
      ref={audioRef}
      css={{
        display: 'none',
      }}
    />
  )
}

TourWithSpeech.completes = true
TourWithSpeech.completionMode = 'event'

export default TourWithSpeech

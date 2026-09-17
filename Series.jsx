/* Copyright 2026 Tutorializer LLC */
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react'

import useTutorial from './useTutorial.js'

const Series = ({ children, onComplete }) => {
  const [activeChildIndex, setActiveChildIndex] = useState(0)
  const hasCalledComplete = useRef(false)

  const context = useTutorial()

  const childArray = Children.toArray(children).filter(Boolean)

  // Filter utility children (e.g. Music) — they render persistently, not sequentially
  const utilityChildren = childArray.filter(
    child => isValidElement(child) && child.type?.isTutorialUtility,
  )
  const sequentialChildren = childArray.filter(
    child => !(isValidElement(child) && child.type?.isTutorialUtility),
  )

  // When all sequential children complete, signal completion
  useEffect(() => {
    if (hasCalledComplete.current) {
      return
    }

    if (activeChildIndex >= sequentialChildren.length) {
      // All children completed
      hasCalledComplete.current = true
      if (context) {
        context.signalEventComplete('series')
      }
      onComplete?.()
    }
  }, [activeChildIndex, sequentialChildren.length, context, onComplete])

  return (
    <>
      {utilityChildren}
      {sequentialChildren.map((child, index) => {
        // Only render the current active child (exclusive mode)
        if (index !== activeChildIndex) {
          return null
        }

        // Clone element to inject onComplete callback
        if (isValidElement(child)) {
          return cloneElement(child, {
            key: child.key || index,
            onComplete: () => setActiveChildIndex(prev => prev + 1),
          })
        }

        return child
      })}
    </>
  )
}

Series.completes = true

export default Series

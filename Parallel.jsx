/* Copyright 2026 Tutorializer LLC */
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const Parallel = ({ children, onComplete }) => {
  const [completedSet, setCompletedSet] = useState(new Set())
  const hasCalledComplete = useRef(false)
  const childArray = Children.toArray(children).filter(Boolean)

  // Count children that are marked as completing (have static completes = true)
  // Memoize to prevent useEffect from running on every render
  const completableIndices = useMemo(
    () =>
      childArray
        .map((child, i) =>
          isValidElement(child) && child.type?.completes ? i : null,
        )
        .filter(i => i !== null),
    [childArray],
  )

  const handleChildComplete = useCallback(index => {
    // Bail if this child is already marked complete — otherwise we'd allocate a
    // new Set (new reference) on every call and re-render forever. A child whose
    // onComplete closure is recreated each render (see the cloneElement below)
    // can fire onComplete on every render; without this guard that becomes an
    // infinite setState loop ("Maximum update depth exceeded") at chapter
    // transitions (e.g. a <Parallel> of Slide + Speech).
    setCompletedSet(prev =>
      prev.has(index) ? prev : new Set([...prev, index]),
    )
  }, [])

  // Check if all completable children have completed
  useEffect(() => {
    if (hasCalledComplete.current) {
      return
    }

    if (completableIndices.length === 0) {
      // No completing children, complete immediately
      hasCalledComplete.current = true
      onComplete?.()
      return
    }

    const allDone = completableIndices.every(i => completedSet.has(i))
    if (allDone) {
      hasCalledComplete.current = true
      onComplete?.()
    }
  }, [completedSet, completableIndices, onComplete])

  return childArray.map((child, index) => {
    if (isValidElement(child)) {
      return cloneElement(child, {
        key: child.key || index,
        onComplete: () => handleChildComplete(index),
      })
    }
    return child
  })
}

Parallel.completes = true

export default Parallel

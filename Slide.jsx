/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { Children, cloneElement, isValidElement, useEffect } from 'react'

const Slide = ({ children, onComplete }) => {
  const containerStyles = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 9999,
    width: '100%',
    height: '100%',
    background: 'var(--color-primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--color-primary-lightest)',
    fontFamily:
      "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
    fontSize: 'clamp(40px, 5vw, 80px)',
    '& b': {
      color: 'white',
      fontWeight: 'normal',
    },
  }

  const hasCompletingChild = Children.toArray(children).some(
    child => isValidElement(child) && child.type?.completes,
  )

  // If no completing children, signal completion immediately
  useEffect(() => {
    if (!hasCompletingChild && onComplete) {
      onComplete()
    }
  }, [hasCompletingChild, onComplete])

  // Forward onComplete to completing children
  const renderedChildren = hasCompletingChild
    ? Children.map(children, child => {
        if (isValidElement(child) && child.type?.completes) {
          return cloneElement(child, { onComplete })
        }
        return child
      })
    : children

  return <div css={containerStyles}>{renderedChildren}</div>
}

Slide.completes = true

export default Slide

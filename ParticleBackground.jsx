/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */

import { Canvas } from '@react-three/fiber'
import { Children, cloneElement, isValidElement, useEffect } from 'react'

const ParticleBackground = ({
  ParticleComponent,
  color = '#ffffff',
  speed,
  count,
  children,
  onComplete,
}) => {
  const particleProps = { color }
  if (speed !== undefined) particleProps.speed = speed
  if (count !== undefined) particleProps.count = count

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

  return (
    <div
      css={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        css={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        <Canvas
          gl={{ alpha: true }}
          camera={{ position: [0, 0, 15], fov: 50 }}
          style={{ background: 'transparent' }}
        >
          <ParticleComponent {...particleProps} />
        </Canvas>
      </div>
      <div
        css={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {renderedChildren}
      </div>
    </div>
  )
}

ParticleBackground.completes = true

export default ParticleBackground

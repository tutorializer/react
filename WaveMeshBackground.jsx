/* Copyright 2026 Tutorializer LLC */
/* eslint-disable react/no-unknown-property */
/** @jsxImportSource @emotion/react */

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'

const WavePlane = ({ color = '#ffffff', speed = 0.8 }) => {
  const meshRef = useRef()

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() * speed
    const positions = meshRef.current.geometry.attributes.position
    const { array } = positions

    for (let i = 0; i < positions.count; i += 1) {
      const x = array[i * 3]
      const y = array[i * 3 + 1]
      array[i * 3 + 2] =
        Math.sin(x * 0.8 + time) * 0.6 +
        Math.sin(y * 0.6 + time * 0.7) * 0.4 +
        Math.sin((x + y) * 0.5 + time * 0.5) * 0.3
    }
    positions.needsUpdate = true
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 3, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[45, 45, 50, 50]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.15} />
    </mesh>
  )
}

const WaveMeshBackground = ({ color = '#ffffff', speed, children }) => (
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
        camera={{ position: [0, 4, 10], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <WavePlane color={color} speed={speed} />
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
      {children}
    </div>
  </div>
)

export default WaveMeshBackground

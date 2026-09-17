/* Copyright 2026 Tutorializer LLC */
/* eslint-disable react/no-unknown-property */

import { useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

// Generates a soft radial-gradient texture: bright in the center, fading to
// fully transparent at the edges. Combined with AdditiveBlending below this
// produces the "glow" of each light — no post-processing pass needed.
function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function generateLights(count, speed, spread) {
  const data = []
  for (let i = 0; i < count; i += 1) {
    data.push({
      x: (Math.random() - 0.5) * spread * 2,
      y: (Math.random() - 0.5) * spread * 2,
      z: (Math.random() - 0.5) * spread * 0.6,
      scale: Math.random() * 0.8 + 0.4,
      driftSpeed: speed * (0.3 + Math.random() * 0.5),
      wobbleSpeed: speed * (0.8 + Math.random() * 0.6),
      wobbleAmount: 0.3 + Math.random() * 0.5,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.4 + Math.random() * 0.6,
    })
  }
  return data
}

const WarmLights = ({
  count = 50,
  color = '#ffd9a8',
  speed = 0.25,
  spread = 12,
}) => {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const texture = useMemo(() => createGlowTexture(), [])
  const [lights] = useState(() => generateLights(count, speed, spread))

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    const verticalBound = spread
    lights.forEach((light, i) => {
      // Wrap around vertically: each light drifts upward and re-enters from
      // the bottom when it leaves the top of the field. Modulo keeps motion
      // continuous so we never see a "snap" reset on screen.
      const totalRange = verticalBound * 2
      const rawY = light.y + time * light.driftSpeed
      const y =
        ((((rawY + verticalBound) % totalRange) + totalRange) % totalRange) -
        verticalBound
      const x =
        light.x +
        Math.sin(time * light.wobbleSpeed + light.twinklePhase) *
          light.wobbleAmount
      dummy.position.set(x, y, light.z)
      // Each sprite faces the camera; we only need to set scale.
      const twinkle =
        0.85 + 0.15 * Math.sin(time * light.twinkleSpeed + light.twinklePhase)
      const s = light.scale * twinkle
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  )
}

export default WarmLights

/* Copyright 2026 Tutorializer LLC */
/* eslint-disable react/no-unknown-property */

import { useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

function generateParticles(count, speed, spread) {
  const data = []
  for (let i = 0; i < count; i += 1) {
    data.push({
      x: (Math.random() - 0.5) * spread * 2,
      y: (Math.random() - 0.5) * spread * 2,
      z: (Math.random() - 0.5) * spread * 0.4,
      scale: Math.random() * 0.1 + 0.04,
      // Gentle organic drift speeds
      speedX: (Math.random() - 0.5) * speed * 2,
      speedY: (Math.random() - 0.5) * speed * 2,
      // Each firefly has its own glow rhythm
      glowSpeed: Math.random() * 1.5 + 0.5,
      glowPhase: Math.random() * Math.PI * 2,
      // Organic looping path offset
      pathPhase: Math.random() * Math.PI * 2,
      pathRadius: Math.random() * 1.5 + 0.5,
    })
  }
  return data
}

const GlowingFireflies = ({
  count = 40,
  color = '#ffffff',
  speed = 0.15,
  spread = 10,
}) => {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const [particles] = useState(() => generateParticles(count, speed, spread))
  const colorObj = useMemo(() => new THREE.Color(color), [color])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    particles.forEach((particle, i) => {
      // Gentle looping path for organic movement
      const x =
        particle.x +
        Math.sin(time * particle.speedX + particle.pathPhase) *
          particle.pathRadius +
        Math.sin(time * 0.3 + particle.pathPhase) * 1.5
      const y =
        particle.y +
        Math.cos(time * particle.speedY + particle.pathPhase * 0.7) *
          particle.pathRadius +
        Math.cos(time * 0.2 + particle.pathPhase) * 1.5
      const z = particle.z

      dummy.position.set(x, y, z)

      // Pulsing glow: smooth sine wave that fades between dim and bright
      const glow =
        0.3 +
        0.7 *
          Math.max(0, Math.sin(time * particle.glowSpeed + particle.glowPhase))
      const s = particle.scale * (0.6 + 0.8 * glow)
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)

      // Per-instance color with varying opacity via scale (brighter = larger)
      meshRef.current.setColorAt(
        i,
        colorObj.clone().multiplyScalar(0.4 + 0.6 * glow),
      )
    })
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

export default GlowingFireflies

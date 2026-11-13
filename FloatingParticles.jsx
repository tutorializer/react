/* Copyright 2026 Tutorializer LLC */
/* eslint-disable react/no-unknown-property */

import { useFrame } from '@react-three/fiber'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

import { secureRandom } from './secureRandom.js'

function generateParticles(count, speed, spread) {
  const data = []
  for (let i = 0; i < count; i += 1) {
    data.push({
      x: (secureRandom() - 0.5) * spread * 2,
      y: (secureRandom() - 0.5) * spread * 2,
      z: (secureRandom() - 0.5) * spread * 0.5,
      scale: secureRandom() * 0.15 + 0.05,
      speedX: (secureRandom() - 0.5) * speed * 4,
      speedY: (secureRandom() - 0.5) * speed * 4,
      phase: secureRandom() * Math.PI * 2,
    })
  }
  return data
}

const FloatingParticles = ({
  count = 80,
  color = '#ffffff',
  speed = 0.3,
  spread = 10,
}) => {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const [particles] = useState(() => generateParticles(count, speed, spread))

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    particles.forEach((particle, i) => {
      const x =
        particle.x + Math.sin(time * particle.speedX + particle.phase) * 3
      const y =
        particle.y + Math.cos(time * particle.speedY + particle.phase) * 3
      const z = particle.z
      dummy.position.set(x, y, z)
      const s =
        particle.scale * (0.8 + 0.2 * Math.sin(time * 0.5 + particle.phase))
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </instancedMesh>
  )
}

export default FloatingParticles

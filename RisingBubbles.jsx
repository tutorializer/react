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
      z: (Math.random() - 0.5) * spread * 0.3,
      scale: Math.random() * 0.12 + 0.03,
      speed: (Math.random() * 0.5 + 0.5) * speed,
      wobbleSpeed: Math.random() * 2 + 1,
      wobbleAmount: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return data
}

const RisingBubbles = ({
  count = 50,
  color = '#ffffff',
  speed = 0.5,
  spread = 10,
}) => {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const [particles] = useState(() => generateParticles(count, speed, spread))

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    const rangeY = spread * 2

    particles.forEach((particle, i) => {
      let y = particle.y + time * particle.speed
      y = (((y % rangeY) + rangeY) % rangeY) - rangeY / 2

      const x =
        particle.x +
        Math.sin(time * particle.wobbleSpeed + particle.phase) *
          particle.wobbleAmount

      dummy.position.set(x, y, particle.z)
      const s = particle.scale
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.25} />
    </instancedMesh>
  )
}

export default RisingBubbles

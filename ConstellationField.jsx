/* Copyright 2026 Tutorializer LLC */
/* eslint-disable react/no-unknown-property */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'

function generateParticles(count, speed, spread) {
  const data = []
  for (let i = 0; i < count; i += 1) {
    data.push({
      x: (Math.random() - 0.5) * spread * 2,
      y: (Math.random() - 0.5) * spread * 2,
      z: (Math.random() - 0.5) * spread * 0.3,
      speedX: (Math.random() - 0.5) * speed * 4,
      speedY: (Math.random() - 0.5) * speed * 4,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return data
}

function createLineObjects(color, maxLines) {
  const lineGeo = new LineSegmentsGeometry()
  const lineMat = new LineMaterial({
    color,
    transparent: true,
    opacity: 0.15,
    linewidth: 1.5,
  })
  const lines = new LineSegments2(lineGeo, lineMat)
  const linePositions = new Float32Array(maxLines * 6)
  return { lines, linePositions }
}

const nodeScale = 0.03

const ConstellationField = ({
  count = 60,
  color = '#ffffff',
  speed = 0.2,
  spread = 10,
}) => {
  const connectionDistance = spread * 0.3
  const maxLines = count * count
  const meshRef = useRef()
  const linesObjRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const [particles] = useState(() => generateParticles(count, speed, spread))
  const [lineScene] = useState(() => createLineObjects(color, maxLines))
  const linePosRef = useRef(lineScene.linePositions)
  const currentPositions = useRef(new Float32Array(count * 3))

  useFrame(state => {
    const time = state.clock.getElapsedTime()
    const pos = currentPositions.current
    const linePosArray = linePosRef.current

    for (let i = 0; i < count; i += 1) {
      const p = particles[i]
      const x = p.x + Math.sin(time * p.speedX + p.phase) * 3
      const y = p.y + Math.cos(time * p.speedY + p.phase) * 3
      const z = p.z

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z

      dummy.position.set(x, y, z)
      dummy.scale.set(nodeScale, nodeScale, nodeScale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    let lineIndex = 0
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        const dx = pos[i * 3] - pos[j * 3]
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < connectionDistance) {
          linePosArray[lineIndex * 6] = pos[i * 3]
          linePosArray[lineIndex * 6 + 1] = pos[i * 3 + 1]
          linePosArray[lineIndex * 6 + 2] = pos[i * 3 + 2]
          linePosArray[lineIndex * 6 + 3] = pos[j * 3]
          linePosArray[lineIndex * 6 + 4] = pos[j * 3 + 1]
          linePosArray[lineIndex * 6 + 5] = pos[j * 3 + 2]
          lineIndex += 1
        }
      }
    }

    linesObjRef.current.material.resolution.set(
      state.size.width,
      state.size.height,
    )
    if (lineIndex > 0) {
      linesObjRef.current.geometry.setPositions(
        linePosArray.slice(0, lineIndex * 6),
      )
    }
  })

  return (
    <>
      <instancedMesh ref={meshRef} args={[null, null, count]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </instancedMesh>
      <primitive ref={linesObjRef} object={lineScene.lines} />
    </>
  )
}

export default ConstellationField

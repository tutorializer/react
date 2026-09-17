/* Copyright 2026 Tutorializer LLC */

import FloatingParticles from './FloatingParticles.jsx'
import ParticleBackground from './ParticleBackground.jsx'

const FloatingBackground = props => (
  <ParticleBackground ParticleComponent={FloatingParticles} {...props} />
)

FloatingBackground.completes = true

export default FloatingBackground

/* Copyright 2026 Tutorializer LLC */

import GlowingFireflies from './GlowingFireflies.jsx'
import ParticleBackground from './ParticleBackground.jsx'

const FirefliesBackground = props => (
  <ParticleBackground ParticleComponent={GlowingFireflies} {...props} />
)

FirefliesBackground.completes = true

export default FirefliesBackground

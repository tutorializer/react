/* Copyright 2026 Tutorializer LLC */

import ConstellationField from './ConstellationField.jsx'
import ParticleBackground from './ParticleBackground.jsx'

const ConstellationBackground = props => (
  <ParticleBackground ParticleComponent={ConstellationField} {...props} />
)

ConstellationBackground.completes = true

export default ConstellationBackground

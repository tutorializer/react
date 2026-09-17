/* Copyright 2026 Tutorializer LLC */

import ParticleBackground from './ParticleBackground.jsx'
import WarmLights from './WarmLights.jsx'

const WarmLightsBackground = props => (
  <ParticleBackground ParticleComponent={WarmLights} {...props} />
)

WarmLightsBackground.completes = true

export default WarmLightsBackground

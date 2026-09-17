/* Copyright 2026 Tutorializer LLC */

import ParticleBackground from './ParticleBackground.jsx'
import RisingBubbles from './RisingBubbles.jsx'

const BubblesBackground = props => (
  <ParticleBackground ParticleComponent={RisingBubbles} {...props} />
)

BubblesBackground.completes = true

export default BubblesBackground

/* Copyright 2026 Tutorializer LLC */
import SpeechProvider from './SpeechProvider.jsx'
import TutorialProvider from './TutorialProvider.jsx'

const Tutorializer = ({ speeches, children, autoPlay, onComplete }) => {
  const params = new URLSearchParams(window.location.search)
  const showControls = params.has('controls')
  const waitForStart = params.has('waitForStart')

  return (
    <SpeechProvider speeches={speeches}>
      <TutorialProvider
        autoPlay={autoPlay}
        showControls={showControls}
        waitForStart={waitForStart}
        onComplete={onComplete}
      >
        {children}
      </TutorialProvider>
    </SpeechProvider>
  )
}

export default Tutorializer

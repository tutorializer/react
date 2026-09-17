/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import SpeechContext from './SpeechContext.js'

const SpeechProvider = ({ speeches, children }) => (
  <SpeechContext.Provider value={speeches}>{children}</SpeechContext.Provider>
)

export default SpeechProvider

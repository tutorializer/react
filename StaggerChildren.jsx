/* Copyright 2026 Tutorializer LLC */

// StaggerChildren is now a plain wrapper div.
// Child components (ScaleIn, FadeIn, etc.) handle their own delays via CSS
// animation-delay, so motion.dev's staggerChildren orchestration is unnecessary.
const StaggerChildren = ({ children }) => <div>{children}</div>

export default StaggerChildren

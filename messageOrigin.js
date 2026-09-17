/* Copyright 2026 Tutorializer LLC */

export const resolveMessageOrigin = (url, baseUrl = window.location.href) => {
  try {
    return new URL(url, baseUrl).origin
  } catch {
    return null
  }
}

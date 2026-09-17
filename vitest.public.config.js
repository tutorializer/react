/* Copyright 2026 Tutorializer LLC */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['public-tests/**/*.test.{js,jsx}'],
  },
})

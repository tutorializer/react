/* Copyright 2026 Tutorializer LLC */

// This package's own copy of secureRandom() from the monorepo's
// shared/secureRandom.js: the stand-in for Math.random(), drawn from Web
// Crypto's getRandomValues(). The package is mirrored to
// github.com/tutorializer/react and installed on its own, where no
// @monorepool package exists, so it cannot import the shared module
// (CLAUDE.md, "Public mirror").
//
// Values come from a pool of 1,024 words refilled on demand, so a background
// that places hundreds of particles at once makes one native call per pool
// instead of one per value. Nothing is drawn at import time.

const POOL_SIZE = 1024
const TWO_TO_THE_32 = 2 ** 32
const TWO_TO_THE_53 = 2 ** 53

const pool = new Uint32Array(POOL_SIZE)
let nextWord = POOL_SIZE

function randomWord() {
  if (nextWord === POOL_SIZE) {
    globalThis.crypto.getRandomValues(pool)
    nextWord = 0
  }
  const word = pool[nextWord]
  nextWord += 1
  return word
}

// A float in [0, 1) carrying 53 random bits, the full precision of a double:
// Math.random()'s range and distribution, so every expression built on it
// keeps its meaning.
export function secureRandom() {
  const high = Math.floor(randomWord() / 2 ** 11) // the top 21 bits
  const low = randomWord()
  return (high * TWO_TO_THE_32 + low) / TWO_TO_THE_53
}

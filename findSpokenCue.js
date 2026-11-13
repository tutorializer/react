/* Copyright 2026 Tutorializer LLC */

// When a narration line says a word, in milliseconds from the start of the
// line, read from the speech's alignment (the start time of every character
// the voice spoke).
//
// `cue` is the word or phrase as the line's English text has it, optionally
// followed by the forms a translated narration may say instead:
//   'smartphones' or ['smartphones', 'smartphone', 'teléfonos']
// The English word decides which line a cue belongs to: a line whose English
// text does not contain it answers null. In the spoken text, translated in
// other languages, every form is looked for at the start of a word, then as
// words that each begin the spoken words in turn, so a plural still matches
// ("teléfono inteligente" in "teléfonos inteligentes"), then anywhere, which
// is what a language written without spaces needs. When none is spoken, or
// the line has no alignment, the cue lands where its English word sits in
// the English text, as a share of the line's duration.

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u
const WORD = /[\p{L}\p{N}]+/gu

// Case and accents never decide a match: "Teléfonos" is "telefonos"
const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const wordsOf = text =>
  Array.from(text.matchAll(WORD), ({ 0: word, index }) => ({ word, index }))

// Where the first of a run of words starts, when each begins with the
// term's word in the same place: -1 when no run does
const findWordStarts = (text, term) => {
  const termWords = wordsOf(term).map(({ word }) => word)
  if (termWords.length === 0) return -1

  const words = wordsOf(text)
  const first = words.findIndex((_, start) =>
    termWords.every((termWord, offset) =>
      words[start + offset]?.word.startsWith(termWord),
    ),
  )
  return first === -1 ? -1 : words[first].index
}

// Where `term` starts in `text`: at the start of a word if it is there, then
// as the starts of words in a row, otherwise anywhere, otherwise -1
const findTerm = (text, term) => {
  let index = text.indexOf(term)
  while (index > 0 && LETTER_OR_DIGIT.test(text[index - 1])) {
    index = text.indexOf(term, index + 1)
  }
  if (index !== -1) return index

  const wordStarts = findWordStarts(text, term)
  return wordStarts === -1 ? text.indexOf(term) : wordStarts
}

// The folded spoken text, and for each of its characters the alignment
// character it came from: folding can drop an accent or expand a character
const foldSpoken = characters =>
  characters.reduce(
    (spoken, character, index) => {
      const folded = fold(String(character))
      spoken.text += folded
      Array.from({ length: folded.length }).forEach(() =>
        spoken.sources.push(index),
      )
      return spoken
    },
    { text: '', sources: [] },
  )

const findInAlignment = (alignment, terms) => {
  const characters = alignment?.characters
  const starts = alignment?.character_start_times_seconds
  if (!Array.isArray(characters) || !Array.isArray(starts)) return null

  const spoken = foldSpoken(characters)
  const seconds = terms
    .map(term => findTerm(spoken.text, term))
    .filter(index => index !== -1)
    .map(index => starts[spoken.sources[index]])
    .find(Number.isFinite)

  return seconds === undefined ? null : Math.round(seconds * 1000)
}

export default function findSpokenCue(speech, cue) {
  const terms = (Array.isArray(cue) ? cue : [cue])
    .filter(term => typeof term === 'string' && term.trim())
    .map(fold)
  if (!speech?.text || terms.length === 0) return null

  const english = fold(speech.text)
  const englishIndex = findTerm(english, terms[0])
  if (englishIndex === -1) return null

  const spoken = findInAlignment(speech.alignment, terms)
  if (spoken !== null) return spoken

  const { duration } = speech
  if (!Number.isFinite(duration) || duration <= 0) return null
  return Math.round((englishIndex / english.length) * duration)
}

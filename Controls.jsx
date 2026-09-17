/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */

// Common languages to show in the player bar
const LOCALE_OPTIONS = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'zh',
  'ja',
  'ar',
  'hi',
]

const Controls = ({
  language,
  localCurrentIndex,
  chapters,
  currentChapter,
  isPlaying,
  togglePlayPause,
  goToPrevious,
  goToNextChapter,
  goToChapter,
  setLocalHasStarted,
  setLocalHasEnded,
}) => (
  <div
    css={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 56,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      zIndex: 10000,
      padding: '0 24px',
    }}
  >
    {/* Previous button */}
    <button
      type="button"
      onClick={goToPrevious}
      disabled={localCurrentIndex === 0}
      css={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        cursor: localCurrentIndex === 0 ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: localCurrentIndex === 0 ? 0.3 : 1,
        transition: 'opacity 0.2s ease',
        '&:hover': {
          background:
            localCurrentIndex === 0 ? 'transparent' : 'rgba(255,255,255,0.1)',
        },
      }}
      aria-label="Previous chapter"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>

    {/* Play/Pause button */}
    <button
      type="button"
      onClick={togglePlayPause}
      css={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '2px solid white',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s ease',
        '&:hover': {
          background: 'rgba(255,255,255,0.15)',
        },
      }}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {isPlaying ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>

    {/* Next button */}
    <button
      type="button"
      onClick={() => {
        setLocalHasStarted(true)
        setLocalHasEnded(false)
        goToNextChapter()
      }}
      disabled={localCurrentIndex === chapters.length - 1}
      css={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        cursor:
          localCurrentIndex === chapters.length - 1 ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: localCurrentIndex === chapters.length - 1 ? 0.3 : 1,
        transition: 'opacity 0.2s ease',
        '&:hover': {
          background:
            localCurrentIndex === chapters.length - 1
              ? 'transparent'
              : 'rgba(255,255,255,0.1)',
        },
      }}
      aria-label="Next chapter"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
      </svg>
    </button>

    {/* Chapter numbers */}
    <div
      css={{
        display: 'flex',
        gap: 8,
        marginLeft: 16,
        paddingLeft: 16,
        borderLeft: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {chapters.map((chapter, index) => {
        const chapterName = chapter.props.name || chapter.type?.chapterName
        return (
          <button
            key={chapterName || `chapter-${index}`}
            type="button"
            onClick={() => goToChapter(index)}
            css={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border:
                index === localCurrentIndex
                  ? 'none'
                  : '1px solid rgba(255,255,255,0.8)',
              background: index === localCurrentIndex ? 'white' : 'transparent',
              color: index === localCurrentIndex ? '#000' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              padding: 0,
              '&:hover': {
                background:
                  index === localCurrentIndex
                    ? 'white'
                    : 'rgba(255,255,255,0.2)',
              },
            }}
            aria-label={`Go to chapter ${chapterName || index + 1}`}
          >
            {index + 1}
          </button>
        )
      })}
    </div>

    {/* Chapter name */}
    <span
      css={{
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        marginLeft: 16,
        minWidth: 120,
      }}
    >
      {currentChapter?.props?.name || `Chapter ${localCurrentIndex + 1}`}
    </span>

    {/* Language switcher */}
    <div
      css={{
        display: 'flex',
        gap: 4,
        marginLeft: 'auto',
        paddingLeft: 16,
        borderLeft: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {LOCALE_OPTIONS.map(locale => (
        <button
          key={locale}
          type="button"
          onClick={() => {
            const newParams = new URLSearchParams(window.location.search)
            newParams.set('language', locale)
            window.location.search = newParams.toString()
          }}
          css={{
            padding: '4px 8px',
            borderRadius: 4,
            border: 'none',
            background: locale === language ? 'white' : 'rgba(255,255,255,0.1)',
            color: locale === language ? '#000' : 'white',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: locale === language ? 600 : 400,
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            '&:hover': {
              background:
                locale === language ? 'white' : 'rgba(255,255,255,0.25)',
            },
          }}
          aria-label={`Switch to ${locale}`}
        >
          {locale}
        </button>
      ))}
    </div>
  </div>
)

export default Controls

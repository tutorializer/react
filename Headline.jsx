/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */

const Headline = ({ children }) => {
  const baseContainerStyles = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 9999,
    width: '100%',
    height: '100%',
    background: 'var(--color-primary)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'var(--color-primary-lightest)',
    fontFamily:
      "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'",
    fontSize: 'clamp(40px, 5vw, 80px)',
    '& b': {
      color: 'white',
      fontWeight: 'normal',
    },
  }

  const spanStyles = {
    padding: '1em',
    textAlign: 'center',
  }

  return (
    <div id="headline" css={baseContainerStyles}>
      <span css={spanStyles} dangerouslySetInnerHTML={{ __html: children }} />
    </div>
  )
}

export default Headline

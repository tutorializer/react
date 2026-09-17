/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */
import { useEffect, useRef, useState } from 'react'

/**
 * Animated phone walking through WhatsApp's "Link a device" flow:
 * slides in from the bottom-right, opens WhatsApp, taps the ⋮ menu,
 * taps "Linked devices", taps "Link a device", then leans toward the
 * screen with its camera viewfinder open and "scans" the QR code shown
 * by the app behind it.
 *
 * Meant to overlay a PreloadedPage that is currently displaying a
 * WhatsApp pairing QR code (e.g. during a connect-whatsapp tour).
 *
 * Props:
 * - onScan   — called at the moment the QR is scanned (green check).
 *              Wire it to whatever simulates the pairing server-side
 *              (e.g. the wapiworld dev mock's /simulate-scan endpoint).
 * - labels   — { linkedDevices, linkADevice, scanQr } UI strings,
 *              pass translated values for localized recordings.
 * - onComplete — injected by Series/Parallel (timing system).
 *
 * Pure CSS keyframes/transitions (GPU compositor) — no motion.dev, so
 * the animation stays smooth during screen recording.
 */

// Phase timeline (ms from mount)
const PHASES = [
  ['home', 60], // slide in, WhatsApp chat list
  ['tap-menu', 2400], // tap ripple on the ⋮ menu
  ['menu', 2900], // dropdown menu open
  ['tap-linked', 4300], // tap ripple on "Linked devices"
  ['linked', 4800], // Linked devices screen
  ['tap-link', 6300], // tap ripple on "Link a device"
  ['camera', 6800], // camera viewfinder opens, phone leans toward QR
  ['scanning', 7800], // scan line sweeps over the QR
  ['scanned', 10000], // green check — onScan() fires
  ['exit', 11600], // phone slides out
  ['done', 12600], // onComplete() fires
]

const GREEN_DARK = '#008069'
const GREEN = '#00a884'
const GREEN_LIGHT = '#25d366'

const AVATAR_COLORS = ['#f5b041', '#7fb3d5', '#c39bd3', '#7dcea0', '#f1948a']

const TapRipple = ({ top, left }) => (
  <span
    css={{
      position: 'absolute',
      width: 34,
      height: 34,
      marginTop: -17,
      marginInlineStart: -17,
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.28)',
      border: '2px solid rgba(255, 255, 255, 0.85)',
      pointerEvents: 'none',
      zIndex: 5,
      animation: 'whatsappPhoneTap 500ms ease-out forwards',
      '@keyframes whatsappPhoneTap': {
        from: { transform: 'scale(0.4)', opacity: 0 },
        '40%': { transform: 'scale(1)', opacity: 1 },
        to: { transform: 'scale(1.5)', opacity: 0 },
      },
    }}
    style={{ top, left }}
  />
)

const Bar = ({ width, height = 8, color = '#d5dbe1', rounded = 4 }) => (
  <div style={{ width, height, background: color, borderRadius: rounded }} />
)

// Stylized QR pattern shown inside the camera viewfinder
const MiniQr = () => {
  const cells = [
    [4, 0],
    [5, 0],
    [7, 0],
    [4, 1],
    [6, 1],
    [5, 2],
    [7, 2],
    [4, 3],
    [5, 3],
    [6, 3],
    [0, 4],
    [2, 4],
    [3, 4],
    [5, 4],
    [8, 4],
    [10, 4],
    [1, 5],
    [4, 5],
    [6, 5],
    [9, 5],
    [0, 6],
    [3, 6],
    [5, 6],
    [7, 6],
    [10, 6],
    [2, 7],
    [4, 7],
    [8, 7],
    [4, 8],
    [6, 8],
    [9, 8],
    [5, 9],
    [7, 9],
    [10, 9],
    [4, 10],
    [6, 10],
    [8, 10],
    [10, 10],
  ]
  const finder = (x, y) => (
    <>
      <rect
        x={x}
        y={y}
        width={3}
        height={3}
        fill="none"
        stroke="#111"
        strokeWidth={0.8}
      />
      <rect x={x + 1} y={y + 1} width={1} height={1} fill="#111" />
    </>
  )
  return (
    <svg viewBox="-0.6 -0.6 12.2 12.2" css={{ width: '100%', height: '100%' }}>
      <rect x={-0.6} y={-0.6} width={12.2} height={12.2} fill="white" />
      {finder(0, 0)}
      {finder(8, 0)}
      {finder(0, 8)}
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#111" />
      ))}
    </svg>
  )
}

const WhatsappLinkPhoneAnimation = ({ onScan, labels = {}, onComplete }) => {
  const {
    linkedDevices = 'Linked devices',
    linkADevice = 'Link a device',
    scanQr = 'Scan QR code',
  } = labels

  const [phase, setPhase] = useState('enter')
  const callbacksRef = useRef({ onScan, onComplete })

  useEffect(() => {
    callbacksRef.current = { onScan, onComplete }
  }, [onScan, onComplete])

  useEffect(() => {
    const timers = PHASES.map(([name, at]) =>
      setTimeout(() => {
        setPhase(name)
        if (name === 'scanned') {
          callbacksRef.current.onScan?.()
        }
        if (name === 'done') {
          callbacksRef.current.onComplete?.()
        }
      }, at),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const homeVisible = ['home', 'tap-menu', 'menu', 'tap-linked'].includes(phase)
  const menuOpen = ['menu', 'tap-linked'].includes(phase)
  const linkedVisible = ['linked', 'tap-link'].includes(phase)
  // The camera screen stays up while the phone slides out, so the screen
  // doesn't flash blank mid-exit
  const cameraVisible = [
    'camera',
    'scanning',
    'scanned',
    'exit',
    'done',
  ].includes(phase)
  const scanned = ['scanned', 'exit', 'done'].includes(phase)

  let outerTransform = 'translateY(130%) rotate(6deg)' // enter / offscreen
  if (
    ['home', 'tap-menu', 'menu', 'tap-linked', 'linked', 'tap-link'].includes(
      phase,
    )
  ) {
    outerTransform = 'translateY(0) rotate(0deg)'
  } else if (['exit', 'done'].includes(phase)) {
    outerTransform = 'translateY(140%) rotate(8deg)'
  } else if (cameraVisible) {
    // Lean toward the QR code on screen
    outerTransform = 'translate(-34px, -48px) rotate(-8deg) scale(1.04)'
  }

  return (
    <div
      css={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        css={{
          position: 'absolute',
          right: '6%',
          bottom: '-7%',
          width: 'clamp(170px, min(30vh, 44vw), 270px)',
          aspectRatio: '9 / 18.5',
          transition: 'transform 900ms cubic-bezier(0.32, 0.72, 0.25, 1)',
          willChange: 'transform',
        }}
        style={{ transform: outerTransform }}
      >
        {/* Phone body */}
        <div
          css={{
            position: 'absolute',
            inset: 0,
            borderRadius: '11% / 5.4%',
            background: '#0d1418',
            boxShadow:
              '0 24px 60px rgba(0, 0, 0, 0.45), 0 6px 18px rgba(0, 0, 0, 0.3), inset 0 0 0 2px #2c363c',
          }}
        >
          {/* Screen */}
          <div
            css={{
              position: 'absolute',
              inset: '2.4% 3.6%',
              borderRadius: '9% / 4.4%',
              overflow: 'hidden',
              background: '#f6f5f3',
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {/* ——— WhatsApp home (chat list) ——— */}
            {homeVisible && (
              <div css={{ position: 'absolute', inset: 0 }}>
                <div
                  css={{
                    height: '13%',
                    background: GREEN_DARK,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    padding: '0 7% 4%',
                  }}
                >
                  <div css={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                    WhatsApp
                  </div>
                  <div css={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg
                      viewBox="0 0 24 24"
                      css={{
                        width: 12,
                        height: 12,
                        fill: 'white',
                        opacity: 0.9,
                      }}
                    >
                      <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
                    </svg>
                    {/* ⋮ menu */}
                    <div
                      css={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2.5,
                        padding: '0 2px',
                      }}
                    >
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          css={{
                            width: 3.5,
                            height: 3.5,
                            borderRadius: '50%',
                            background: 'white',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div
                  css={{
                    padding: '5% 6%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7.5%',
                    height: '80%',
                  }}
                >
                  {AVATAR_COLORS.map((color, i) => (
                    <div
                      key={color}
                      css={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <div
                        css={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          flexShrink: 0,
                        }}
                        style={{ background: color }}
                      />
                      <div
                        css={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          flexGrow: 1,
                        }}
                      >
                        <Bar
                          width={`${52 - i * 4}%`}
                          height={7}
                          color="#b9c2c9"
                        />
                        <Bar
                          width={`${72 - i * 5}%`}
                          height={5}
                          color="#dde3e7"
                        />
                      </div>
                      <Bar width={12} height={5} color="#dde3e7" />
                    </div>
                  ))}
                </div>
                {/* FAB */}
                <div
                  css={{
                    position: 'absolute',
                    right: '6%',
                    bottom: '4%',
                    width: 30,
                    height: 30,
                    borderRadius: '28%',
                    background: GREEN_LIGHT,
                    boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                  }}
                />
                {phase === 'tap-menu' && <TapRipple top="9%" left="88%" />}
                {/* Dropdown menu */}
                {menuOpen && (
                  <div
                    css={{
                      position: 'absolute',
                      top: '11%',
                      right: '4%',
                      width: '64%',
                      background: 'white',
                      borderRadius: 8,
                      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                      padding: '5% 0',
                      display: 'flex',
                      flexDirection: 'column',
                      animation: 'whatsappPhoneMenuIn 200ms ease-out',
                      '@keyframes whatsappPhoneMenuIn': {
                        from: {
                          transform: 'scale(0.85)',
                          opacity: 0,
                          transformOrigin: 'top right',
                        },
                        to: {
                          transform: 'scale(1)',
                          opacity: 1,
                          transformOrigin: 'top right',
                        },
                      },
                    }}
                  >
                    <div css={{ padding: '6% 9%' }}>
                      <Bar width="55%" height={7} />
                    </div>
                    <div css={{ padding: '6% 9%' }}>
                      <Bar width="70%" height={7} />
                    </div>
                    <div
                      css={{
                        padding: '6% 9%',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#111b21',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      style={{
                        background:
                          phase === 'tap-linked' ? '#e7f8f1' : 'transparent',
                      }}
                    >
                      {linkedDevices}
                    </div>
                    <div css={{ padding: '6% 9%' }}>
                      <Bar width="48%" height={7} />
                    </div>
                    {phase === 'tap-linked' && (
                      <TapRipple top="57%" left="38%" />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ——— Linked devices ——— */}
            {linkedVisible && (
              <div
                css={{ position: 'absolute', inset: 0, background: 'white' }}
              >
                <div
                  css={{
                    height: '13%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 8,
                    padding: '0 7% 4%',
                    borderBottom: '1px solid #eef1f3',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    css={{ width: 12, height: 12, fill: '#54656f' }}
                  >
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                  <div
                    css={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#111b21',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {linkedDevices}
                  </div>
                </div>
                <div
                  css={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6%',
                    padding: '12% 10%',
                    height: '70%',
                  }}
                >
                  {/* laptop + phone illustration */}
                  <svg viewBox="0 0 96 60" css={{ width: '62%' }}>
                    <rect
                      x="14"
                      y="6"
                      width="56"
                      height="36"
                      rx="3"
                      fill="#e9edef"
                      stroke="#c6cfd4"
                      strokeWidth="2"
                    />
                    <rect
                      x="8"
                      y="44"
                      width="68"
                      height="5"
                      rx="2.5"
                      fill="#c6cfd4"
                    />
                    <rect
                      x="64"
                      y="22"
                      width="22"
                      height="34"
                      rx="4"
                      fill="white"
                      stroke={GREEN}
                      strokeWidth="2.5"
                    />
                    <circle cx="75" cy="49" r="1.8" fill={GREEN} />
                    <path
                      d="M36 20 a8 8 0 1 1 -1 8"
                      fill="none"
                      stroke={GREEN_LIGHT}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    css={{
                      background: GREEN,
                      color: 'white',
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: '7px 16px',
                      maxWidth: '92%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      boxShadow: '0 2px 6px rgba(0,168,132,0.35)',
                    }}
                  >
                    {linkADevice}
                  </div>
                  <div
                    css={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      marginTop: '4%',
                    }}
                  >
                    <Bar width={110} height={5} color="#e2e7ea" />
                    <Bar width={80} height={5} color="#e2e7ea" />
                  </div>
                </div>
                {phase === 'tap-link' && <TapRipple top="56%" left="50%" />}
              </div>
            )}

            {/* ——— Camera viewfinder ——— */}
            {cameraVisible && (
              <div
                css={{ position: 'absolute', inset: 0, background: '#0b0f12' }}
              >
                <div
                  css={{
                    color: 'rgba(255,255,255,0.92)',
                    fontSize: 10.5,
                    fontWeight: 600,
                    textAlign: 'center',
                    marginTop: '16%',
                    padding: '0 8%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {scanQr}
                </div>
                <div
                  css={{
                    position: 'absolute',
                    top: '30%',
                    left: '14%',
                    width: '72%',
                    aspectRatio: '1',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                  style={{
                    boxShadow: scanned
                      ? `0 0 0 3px ${GREEN_LIGHT}, 0 0 24px rgba(37,211,102,0.55)`
                      : '0 0 0 2px rgba(255,255,255,0.9)',
                    transition: 'box-shadow 300ms ease',
                  }}
                >
                  {phase === 'camera' ? (
                    <div
                      css={{
                        position: 'absolute',
                        inset: 0,
                        background: '#1c2429',
                      }}
                    />
                  ) : (
                    <MiniQr />
                  )}
                  {phase === 'scanning' && (
                    <div
                      css={{
                        position: 'absolute',
                        left: 0,
                        width: '100%',
                        height: 3,
                        background: GREEN_LIGHT,
                        boxShadow: `0 0 12px 3px ${GREEN_LIGHT}`,
                        animation:
                          'whatsappPhoneScanline 1100ms ease-in-out infinite alternate',
                        '@keyframes whatsappPhoneScanline': {
                          from: { top: '4%' },
                          to: { top: '93%' },
                        },
                      }}
                    />
                  )}
                </div>
                {scanned && (
                  <div
                    css={{
                      position: 'absolute',
                      top: '44%',
                      left: '50%',
                      width: 44,
                      height: 44,
                      marginInlineStart: -22,
                      borderRadius: '50%',
                      background: GREEN_LIGHT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 18px rgba(37,211,102,0.6)',
                      animation:
                        'whatsappPhoneCheckIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                      '@keyframes whatsappPhoneCheckIn': {
                        from: { transform: 'scale(0)' },
                        to: { transform: 'scale(1)' },
                      },
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      css={{ width: 24, height: 24, fill: 'white' }}
                    >
                      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera punch-hole */}
          <div
            css={{
              position: 'absolute',
              top: '3.4%',
              left: '50%',
              width: 7,
              height: 7,
              marginInlineStart: -3.5,
              borderRadius: '50%',
              background: '#000',
              zIndex: 4,
            }}
          />
        </div>
      </div>
    </div>
  )
}

WhatsappLinkPhoneAnimation.completes = true

export default WhatsappLinkPhoneAnimation

/* Copyright 2026 Tutorializer LLC */
/** @jsxImportSource @emotion/react */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Chapter from '../Chapter.jsx'
import Tutorial from '../Tutorial.jsx'
import Tutorializer from '../Tutorializer.jsx'

describe('@tutorializer/react public package', () => {
  it('renders a tutorial chapter from standalone imports', async () => {
    render(
      <Tutorializer>
        <Tutorial language="en">
          <Chapter name="Demo" animation="none">
            <div>Executable tutorial</div>
          </Chapter>
        </Tutorial>
      </Tutorializer>,
    )

    expect(await screen.findAllByText('Executable tutorial')).toHaveLength(1)
  })
})

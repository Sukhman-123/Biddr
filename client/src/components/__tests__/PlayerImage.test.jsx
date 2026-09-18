import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PlayerImage from '../PlayerImage'

describe('PlayerImage', () => {
  it('falls back to initials when an image cannot be loaded', () => {
    render(<PlayerImage src="https://example.com/broken.jpg" name="Aarav Singh" alt="Aarav" />)

    fireEvent.error(screen.getByRole('img', { name: 'Aarav' }))

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('AS')).toBeInTheDocument()
  })
});

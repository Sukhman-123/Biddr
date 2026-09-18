import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddLotModal from '../AddLotModal'

const cloudinaryUrl =
  'https://res.cloudinary.com/biddr/image/upload/c_fill,g_auto,w_800,h_800/player.jpg'

const player = {
  id: 'player-1',
  name: 'Aarav Singh',
  style: 'Batsman',
  country: 'India',
  basePrice: 1000000,
  photoUrl: cloudinaryUrl,
  set: 'Marquee',
}

describe('AddLotModal', () => {
  it('locks background scrolling and restores it when closed', () => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'scroll'

    const { unmount } = render(
      <AddLotModal lot={player} onClose={vi.fn()} onSaved={vi.fn()} />,
    )

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('auto')
    expect(document.documentElement.style.overflow).toBe('scroll')
  })

  it('opens the stored Cloudinary image in a new tab', () => {
    render(<AddLotModal lot={player} onClose={vi.fn()} onSaved={vi.fn()} />)

    const previewLink = screen.getByRole('link', {
      name: /open full photo for aarav singh/i,
    })
    expect(previewLink).toHaveAttribute('href', cloudinaryUrl)
    expect(previewLink).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: /open full image/i })).toHaveAttribute(
      'href',
      cloudinaryUrl,
    )
  })
})

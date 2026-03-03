import { describe, it, expect } from 'vitest'
import { slugify } from './PdfExportButton'

describe('slugify', () => {
  it('produces correct slug for "Acme Corp" → ai-maturity-acme-corp.pdf', () => {
    expect(`ai-maturity-${slugify('Acme Corp')}.pdf`).toBe('ai-maturity-acme-corp.pdf')
  })

  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp')
  })

  it('collapses multiple special characters into a single hyphen', () => {
    expect(slugify('Foo & Bar, Inc.')).toBe('foo-bar-inc')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  Test  ')).toBe('test')
  })
})

// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssessmentStore } from '@/store/assessmentStore'
import { QUESTIONS } from '@/lib/scoring/questions'
import { LikertCard } from './LikertCard'
import { CompanyStep } from './CompanyStep'
import { DimensionStep } from './DimensionStep'
import { ReviewStep } from './ReviewStep'
import { ProgressBar } from './ProgressBar'

beforeEach(() => {
  useAssessmentStore.getState().reset()
})

// Test 1: LikertCard
describe('LikertCard', () => {
  it('renders question text', () => {
    render(<LikertCard question="Test question here" value={0} onChange={() => {}} />)
    expect(screen.getByText('Test question here')).toBeInTheDocument()
  })

  it('renders 5 buttons with correct aria-labels', () => {
    render(<LikertCard question="Q" value={0} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '0 - Not started' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 - Partially implemented' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4 - Fully embedded' })).toBeInTheDocument()
  })

  it('calls onChange with the correct value when a button is clicked', async () => {
    const onChange = vi.fn()
    render(<LikertCard question="Q" value={0} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: '3 - Broadly implemented' }))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('highlights the selected button with blue background class', () => {
    render(<LikertCard question="Q" value={2} onChange={() => {}} />)
    const selected = screen.getByRole('button', { name: '2 - Partially implemented' })
    expect(selected.className).toContain('bg-blue-600')
  })
})

// Test 2: CompanyStep
describe('CompanyStep', () => {
  it('disables Next when companyName is empty', () => {
    render(<CompanyStep />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables Next after typing a name', async () => {
    render(<CompanyStep />)
    await userEvent.type(screen.getByRole('textbox'), 'Acme Corp')
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
  })
})

// Test 3: DimensionStep
describe('DimensionStep', () => {
  it('renders 8 question texts for the strategy dimension', () => {
    useAssessmentStore.setState({ step: 2 })
    render(<DimensionStep dimension="strategy" />)
    QUESTIONS.strategy.forEach(q => {
      expect(screen.getByText(q)).toBeInTheDocument()
    })
  })

  it('renders 8 LikertCards (40 buttons = 8 × 5)', () => {
    useAssessmentStore.setState({ step: 2 })
    render(<DimensionStep dimension="strategy" />)
    const buttons = screen.getAllByRole('button')
    // 40 Likert buttons + Back + Next = 42
    const likertButtons = buttons.filter(b => /^\d+ - /.test(b.getAttribute('aria-label') ?? ''))
    expect(likertButtons).toHaveLength(40)
  })
})

// Test 4: ReviewStep
describe('ReviewStep', () => {
  it('renders all 6 dimension labels', () => {
    render(<ReviewStep />)
    expect(screen.getByText('Strategy')).toBeInTheDocument()
    expect(screen.getByText('Architecture')).toBeInTheDocument()
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('Talent')).toBeInTheDocument()
    expect(screen.getByText('Adoption')).toBeInTheDocument()
  })

  it('renders answer label chips for current responses', () => {
    // Default responses are all 0 → "Not started"
    render(<ReviewStep />)
    const chips = screen.getAllByText('Not started')
    // 6 dimensions × 8 questions = 48 chips
    expect(chips).toHaveLength(48)
  })
})

// Test 5: ProgressBar
describe('ProgressBar', () => {
  it('at step=4 (Workflow), 3 of 6 segments are filled', () => {
    const { container } = render(<ProgressBar currentStep={4} />)
    const segments = container.querySelectorAll('div > div')
    const filled = Array.from(segments).filter(s => s.className.includes('bg-blue-600'))
    expect(filled).toHaveLength(3)
  })

  it('at step=2 (Strategy), 1 segment is filled', () => {
    const { container } = render(<ProgressBar currentStep={2} />)
    const segments = container.querySelectorAll('div > div')
    const filled = Array.from(segments).filter(s => s.className.includes('bg-blue-600'))
    expect(filled).toHaveLength(1)
  })
})

/**
 * A rating, as a coloured circle with the number inside it.
 *
 * The number is always drawn, at every size. Red-green colour blindness is
 * common enough — roughly one man in twelve — that a red-to-green scale cannot
 * be the only channel, and this scale is going to be scanned down a calendar
 * by people who may also be elderly. Colour makes a bad week visible at a
 * glance; the digit is what actually carries the value.
 *
 * Ink is chosen per step rather than globally, because white clears 4.5:1 on
 * the red but not on the amber or the green.
 */
export type RatingTier = 'bad' | 'poor' | 'ok' | 'good' | 'none'

/** 1 is easy, 10 is as bad as it gets — so low numbers are the green end. */
export function ratingTier(rating: number | null): RatingTier {
  if (rating === null) return 'none'
  if (rating <= 3) return 'good'
  if (rating <= 5) return 'ok'
  if (rating <= 7) return 'poor'
  return 'bad'
}

export const TIER_LABEL: Record<RatingTier, string> = {
  bad: 'Awful',
  poor: 'Rough',
  ok: 'Average',
  good: 'Easy',
  none: 'Not rated',
}

export function RatingDot({
  rating,
  size = 'md',
}: {
  rating: number | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const tier = ratingTier(rating)
  return (
    <span
      className={`rating-dot rating-dot--${size}`}
      data-tier={tier}
      aria-label={
        rating === null ? 'Not rated' : `Rated ${rating} out of 10 for badness, ${TIER_LABEL[tier].toLowerCase()}`
      }
    >
      {rating ?? '·'}
    </span>
  )
}

/** The legend that has to accompany the scale wherever it is scanned in bulk. */
export function RatingLegend() {
  const tiers: { tier: RatingTier; label: string }[] = [
    { tier: 'good', label: '1–3 easy' },
    { tier: 'ok', label: '4–5 average' },
    { tier: 'poor', label: '6–7 rough' },
    { tier: 'bad', label: '8–10 awful' },
  ]
  return (
    <ul className="viz__legend">
      {tiers.map(({ tier, label }) => (
        <li key={tier}>
          <span className="swatch" data-tier={tier} style={{ background: `var(--rate-${tier})` }} />
          {label}
        </li>
      ))}
    </ul>
  )
}

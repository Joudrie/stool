/**
 * Sample data, for trying the app before you have any of your own.
 *
 * A brand-new journal is an empty calendar and a Patterns screen that says it
 * needs more entries — which is honest but tells a first-time user nothing
 * about what they are signing up for. This fills it with a couple of plausible
 * weeks so every screen has something in it.
 *
 * Two rules. It is obviously and reversibly fake: every id carries the
 * SAMPLE_PREFIX, so "remove sample data" is exact and can never take a real
 * entry with it. And it is nobody's actual medical history — an earlier version
 * shipped one real person's episode to every user, which is not something a
 * stranger downloading a poop tracker should be handed.
 */
import { newId, type BristolType, type FoodEntry, type StoolEntry } from '../db/schema'
import { autoTagItems } from './foodTags'

export const SAMPLE_PREFIX = 'sample-'

const DAY = 86_400_000
const HOUR = 3_600_000

const sampleId = () => `${SAMPLE_PREFIX}${newId()}`

/** Deterministic, so the sample looks the same each time it is added. */
function makeRandom(seed: number) {
  let s = seed
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
}

const MEALS: { items: string[]; hour: number }[] = [
  { items: ['coffee', 'toast'], hour: 8 },
  { items: ['chicken salad'], hour: 13 },
  { items: ['pasta'], hour: 19 },
  { items: ['ice cream'], hour: 21 },
  { items: ['oatmeal', 'banana'], hour: 8 },
  { items: ['sandwich'], hour: 13 },
  { items: ['rice and chicken'], hour: 19 },
  { items: ['cheese and crackers'], hour: 16 },
  { items: ['eggs', 'coffee'], hour: 8 },
  { items: ['burger', 'fries'], hour: 13 },
  { items: ['soup'], hour: 19 },
  { items: ['latte'], hour: 15 },
]

/**
 * Builds 16 days of entries with a mild, honest dairy association in them, so
 * the Patterns screen has something real to find rather than a contrived
 * slam dunk.
 */
export function buildSampleData(now = Date.now()): { stool: StoolEntry[]; food: FoodEntry[] } {
  const rnd = makeRandom(20260928)
  const stool: StoolEntry[] = []
  const food: FoodEntry[] = []

  for (let d = 16; d >= 1; d--) {
    const midnight = new Date(now - d * DAY)
    midnight.setHours(0, 0, 0, 0)
    const base = midnight.getTime()

    const dairyDay = d % 3 === 0
    const todaysMeals = dairyDay
      ? [MEALS[0]!, MEALS[3]!, MEALS[7]!]
      : [MEALS[4]!, MEALS[5]!, MEALS[6]!]

    for (const meal of todaysMeals) {
      const ts = base + meal.hour * HOUR + Math.floor(rnd() * 40) * 60_000
      food.push({
        id: sampleId(),
        kind: 'food',
        ts,
        items: meal.items,
        tags: autoTagItems(meal.items),
        mealKind: 'meal',
        waterOz: rnd() > 0.5 ? 16 : null,
        notes: '',
        source: 'manual',
        createdAt: ts,
        updatedAt: ts,
      })
    }

    const count = rnd() > 0.75 ? 2 : 1
    for (let i = 0; i < count; i++) {
      const ts = base + (9 + i * 6) * HOUR + Math.floor(rnd() * 90) * 60_000
      // Dairy days skew loose and uncomfortable, but not every time.
      const rough = dairyDay && rnd() < 0.7
      const bristol: BristolType = rough
        ? ((rnd() < 0.4 ? 7 : 6) as BristolType)
        : ((3 + Math.floor(rnd() * 3)) as BristolType)

      stool.push({
        id: sampleId(),
        kind: 'stool',
        ts,
        bristol,
        color: 'brown',
        urgency: rough ? 7 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 2),
        pain: rough ? 5 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 2),
        painPhase: rough ? ['before'] : [],
        rating: null,
        flags: [],
        photoId: null,
        notes: '',
        source: 'manual',
        createdAt: ts,
        updatedAt: ts,
      })
    }
  }

  return { stool, food }
}

export const isSampleEntry = (id: string) => id.startsWith(SAMPLE_PREFIX)

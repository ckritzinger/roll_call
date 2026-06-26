import type { ClassSlot } from '~/types'
import {
  getCurrentWeekRange,
  findOrCreateClassInstance as findOrCreateClassInstanceShared
} from '#shared/utils/weekGeneration'

export { getCurrentWeekRange }

/** Client-side wrapper: binds the shared helper to the browser's
 * Supabase client. Used by the ad-hoc session modal. Week generation
 * itself runs server-side — see server/api/generate-week.post.ts. */
export async function findOrCreateClassInstance(classSlot: ClassSlot, date: string) {
  const supabase = useSupabaseClient()
  return findOrCreateClassInstanceShared(supabase, classSlot, date)
}

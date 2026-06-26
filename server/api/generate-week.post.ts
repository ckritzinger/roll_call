import { serverSupabaseClient } from '#supabase/server'
import { generateCurrentWeekData } from '#shared/utils/weekGeneration'
import type { Database } from '~/types'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient<Database>(event)
  await generateCurrentWeekData(supabase)
  return { ok: true }
})

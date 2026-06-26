import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClassSlot, Database, Day } from '~/types'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Studio week runs Monday–Saturday. Returns ISO date strings for the
 * Monday and Saturday of the week containing `now`. */
export function getCurrentWeekRange(now = new Date()) {
  const todayIndex = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((todayIndex + 6) % 7))
  const saturday = new Date(monday)
  saturday.setDate(monday.getDate() + 5)
  return { start: toISODate(monday), end: toISODate(saturday) }
}

function dateForDayInCurrentWeek(day: Day, now = new Date()) {
  const dayIndex = DAY_NAMES.indexOf(day)
  const { start } = getCurrentWeekRange(now)
  const monday = new Date(start)
  monday.setDate(monday.getDate() + (dayIndex - 1))
  return toISODate(monday)
}

/**
 * Business rule 2 (instance half): find the class_instance for a given
 * slot+date, creating it from the slot's current time/location/capacity
 * if it doesn't exist yet. Shared by week generation and ad-hoc adds.
 */
export async function findOrCreateClassInstance(
  supabase: SupabaseClient<Database>,
  classSlot: ClassSlot,
  date: string
) {
  const { data: existing } = await supabase
    .from('class_instances')
    .select('*')
    .eq('class_slot_id', classSlot.id)
    .eq('date', date)
    .maybeSingle()
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('class_instances')
    .insert({
      class_slot_id: classSlot.id,
      date,
      time: classSlot.time,
      location: classSlot.location,
      capacity: classSlot.capacity
    })
    .select()
    .single()

  if (error) {
    // unique constraint race: another tab/request created it first
    const { data: refetched } = await supabase
      .from('class_instances')
      .select('*')
      .eq('class_slot_id', classSlot.id)
      .eq('date', date)
      .single()
    return refetched
  }
  return created
}

/**
 * Business rule 1: on app open, generate class_instance + session rows
 * for the current week for every active client with a recurring slot.
 * Business rule 2: never duplicate an instance for the same slot+date,
 * or a session for the same client+instance — enforced here via
 * find-or-create, and backstopped by DB unique constraints.
 */
export async function generateCurrentWeekData(supabase: SupabaseClient<Database>) {
  const [{ data: clients }, { data: recurringSlots }] = await Promise.all([
    supabase.from('clients').select('*').eq('archived', false),
    supabase.from('client_recurring_slots').select('*, class_slot:class_slots(*)')
  ])

  if (!clients || !recurringSlots) return

  for (const recurring of recurringSlots) {
    const client = clients.find((c) => c.id === recurring.client_id)
    const classSlot = recurring.class_slot as ClassSlot | null
    if (!client || !classSlot || classSlot.archived) continue

    const date = dateForDayInCurrentWeek(recurring.day as Day)
    const instance = await findOrCreateClassInstance(supabase, classSlot, date)
    if (!instance) continue

    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('client_id', client.id)
      .eq('class_instance_id', instance.id)
      .maybeSingle()

    if (!existingSession) {
      await supabase.from('sessions').insert({
        client_id: client.id,
        class_instance_id: instance.id,
        date,
        status: 'attended',
        is_recurring: true,
        amount: client.rate
      })
    }
  }
}

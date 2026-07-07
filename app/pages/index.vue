<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-semibold text-gray-900">This Week</h2>
        <button
          class="text-gray-400 disabled:opacity-30 leading-none"
          :disabled="generating"
          :title="generating ? 'Generating…' : 'Generate this week'"
          @click="generateWeek"
        >
          {{ generating ? '⏳' : '🔄' }}
        </button>
      </div>
      <button
        class="text-sm text-blue-600 font-medium"
        @click="showPast = !showPast"
      >
        {{ showPast ? 'Hide past' : 'Show past' }}
      </button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <ul v-else class="space-y-2">
      <li
        v-for="session in visibleSessions"
        :key="session.id"
        class="bg-white rounded-lg border p-3 flex items-center justify-between"
      >
        <div>
          <p class="font-medium text-gray-900">{{ session.client.name }}</p>
          <p class="text-sm text-gray-500">
            {{ session.class_instance.class_slot.name }} ·
            {{ formatDateTime(session.date, session.class_instance.time) }}
          </p>
        </div>
        <button
          class="text-sm font-medium px-3 py-1.5 rounded-full"
          :class="{
            'bg-green-100 text-green-700': session.status === 'attended',
            'bg-red-100 text-red-700':     session.status === 'absent',
            'bg-yellow-100 text-yellow-700': session.status === 'excused',
          }"
          @click="toggleStatus(session)"
        >
          {{ session.status === 'attended' ? 'Attended' : session.status === 'absent' ? 'Absent' : 'Excused' }}
        </button>
      </li>
      <li v-if="!visibleSessions.length" class="text-sm text-gray-400 py-8 text-center">
        {{ sessions.length ? 'No upcoming sessions, have a great weekend!' : 'No sessions this week. Hit 🔄 to generate them.' }}
      </li>
    </ul>

    <button
      class="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full px-4 py-3 shadow-lg font-medium"
      @click="showAddModal = true"
    >
      + Ad-hoc session
    </button>

    <AddAdHocSessionModal
      v-if="showAddModal"
      @close="showAddModal = false"
      @added="showAddModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@powersync/vue'
import { getCurrentWeekRange } from '~/composables/useWeekGeneration'
import type { SessionWithDetails, SessionStatus, ClientLocation, ServiceType, Currency, Location, Day } from '~/types'

const ps = usePowerSync()
const generating = ref(false)
const showPast = ref(false)
const showAddModal = ref(false)
const sessions = ref<SessionWithDetails[]>([])

const { start, end } = getCurrentWeekRange()

// Flatten the PowerSync JOIN result back into the nested SessionWithDetails shape
// the template expects. SQLite booleans come back as 0/1 integers.
function mapRow(row: Record<string, unknown>): SessionWithDetails {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    class_instance_id: row.class_instance_id as string,
    date: row.date as string,
    status: row.status as SessionStatus,
    is_recurring: Boolean(row.is_recurring),
    amount: row.amount as number,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    client: {
      id: row.client_id as string,
      name: row.c_name as string,
      location: row.c_location as ClientLocation,
      service_type: row.c_service_type as ServiceType,
      rate: row.c_rate as number,
      scale_enabled: Boolean(row.c_scale_enabled),
      currency: row.c_currency as Currency,
      month_rate: row.c_month_rate as number,
      archived: Boolean(row.c_archived),
      created_at: row.created_at as string,
    },
    class_instance: {
      id: row.class_instance_id as string,
      class_slot_id: row.class_slot_id as string,
      date: row.date as string,
      time: row.ci_time as string,
      location: row.ci_location as Location,
      capacity: row.ci_capacity as number,
      created_at: row.created_at as string,
      class_slot: {
        id: row.class_slot_id as string,
        name: row.cs_name as string,
        location: row.cs_location as Location,
        day: row.cs_day as Day,
        time: row.cs_time as string,
        capacity: row.cs_capacity as number,
        archived: Boolean(row.cs_archived),
        created_at: row.created_at as string,
      },
    },
  }
}

const { data: rawRows, isLoading: loading } = useQuery(
  `SELECT
    s.id, s.client_id, s.class_instance_id, s.date, s.status,
    s.is_recurring, s.amount, s.notes, s.created_at,
    c.name AS c_name, c.location AS c_location, c.service_type AS c_service_type,
    c.rate AS c_rate, c.scale_enabled AS c_scale_enabled, c.currency AS c_currency,
    c.month_rate AS c_month_rate, c.archived AS c_archived,
    ci.time AS ci_time, ci.location AS ci_location,
    ci.capacity AS ci_capacity, ci.class_slot_id,
    cs.name AS cs_name, cs.location AS cs_location, cs.day AS cs_day,
    cs.time AS cs_time, cs.capacity AS cs_capacity, cs.archived AS cs_archived
   FROM sessions s
   JOIN clients c ON s.client_id = c.id
   JOIN class_instances ci ON s.class_instance_id = ci.id
   JOIN class_slots cs ON ci.class_slot_id = cs.id
   WHERE s.date >= ? AND s.date <= ?
   ORDER BY s.date, ci.time`,
  [start, end]
)

// Keep a mutable ref so optimistic status toggles work without waiting for sync
watch(rawRows, (rows) => {
  sessions.value = (rows ?? []).map(mapRow)
}, { immediate: true })

async function generateWeek() {
  generating.value = true
  await $fetch('/api/generate-week', { method: 'POST' })
  // No manual reload needed — PowerSync syncs the new sessions reactively
  generating.value = false
}

const visibleSessions = computed(() => {
  if (showPast.value) return sessions.value
  const now = new Date()
  return sessions.value.filter((s) => new Date(`${s.date}T${s.class_instance.time}`) >= now)
})

async function toggleStatus(session: SessionWithDetails) {
  const cycle = { attended: 'absent', absent: 'excused', excused: 'attended' } as const
  const next = cycle[session.status]
  session.status = next  // optimistic: prevent flicker before useQuery reacts
  await ps.value.execute('UPDATE sessions SET status = ? WHERE id = ?', [next, session.id])
  // PowerSync updates local SQLite instantly → useQuery reacts → uploadData pushes to Supabase
}

function formatDateTime(date: string, time: string) {
  const d = new Date(`${date}T${time}`)
  return d.toLocaleString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">This Week</h2>
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
          :class="
            session.status === 'absent'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          "
          @click="toggleStatus(session)"
        >
          {{ session.status === 'absent' ? 'Absent' : 'Attended' }}
        </button>
      </li>
      <li v-if="!visibleSessions.length" class="text-sm text-gray-400 py-8 text-center">
        No upcoming sessions this week.
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
      @added="onAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { getCurrentWeekRange, generateCurrentWeekData } from '~/composables/useWeekGeneration'
import type { SessionWithDetails } from '~/types'

const supabase = useSupabaseClient()
const loading = ref(true)
const showPast = ref(false)
const showAddModal = ref(false)
const sessions = ref<SessionWithDetails[]>([])

async function loadWeek() {
  const { start, end } = getCurrentWeekRange()
  const { data } = await supabase
    .from('sessions')
    .select('*, client:clients(*), class_instance:class_instances(*, class_slot:class_slots(*))')
    .gte('date', start)
    .lte('date', end)

  sessions.value = ((data as SessionWithDetails[]) ?? []).sort((a, b) => {
    const aKey = `${a.date}T${a.class_instance.time}`
    const bKey = `${b.date}T${b.class_instance.time}`
    return aKey.localeCompare(bKey)
  })
}

const visibleSessions = computed(() => {
  if (showPast.value) return sessions.value
  const now = new Date()
  return sessions.value.filter((s) => new Date(`${s.date}T${s.class_instance.time}`) >= now)
})

async function toggleStatus(session: SessionWithDetails) {
  const next = session.status === 'attended' ? 'absent' : 'attended'
  const { error } = await supabase.from('sessions').update({ status: next }).eq('id', session.id)
  if (!error) session.status = next
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

async function onAdded() {
  showAddModal.value = false
  await loadWeek()
}

onMounted(async () => {
  await generateCurrentWeekData()
  await loadWeek()
  loading.value = false
})
</script>

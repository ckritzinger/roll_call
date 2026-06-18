<template>
  <div class="p-4 space-y-4">
    <h2 class="text-base font-semibold text-gray-900">Session Log</h2>

    <div class="grid grid-cols-3 gap-2">
      <input v-model="filters.month" type="month" class="border rounded-lg p-2 text-sm col-span-1" />
      <select v-model="filters.clientId" class="border rounded-lg p-2 text-sm col-span-1">
        <option value="">All clients</option>
        <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select v-model="filters.location" class="border rounded-lg p-2 text-sm col-span-1">
        <option value="">All locations</option>
        <option>Sedgefield</option>
        <option>Knysna</option>
      </select>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">Loading…</div>

    <ul v-else class="space-y-2">
      <li
        v-for="session in filtered"
        :key="session.id"
        class="bg-white rounded-lg border p-3 flex items-center justify-between gap-2"
      >
        <div class="min-w-0" @click="edit(session)">
          <p class="font-medium text-gray-900 truncate">{{ session.client.name }}</p>
          <p class="text-sm text-gray-500 truncate">
            {{ session.class_instance.class_slot.name }} · {{ session.date }} ·
            R{{ session.amount.toFixed(2) }}
          </p>
          <p v-if="session.notes" class="text-xs text-gray-400 truncate">{{ session.notes }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span
            class="text-xs font-medium px-2 py-1 rounded-full"
            :class="session.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
          >
            {{ session.status }}
          </span>
          <button class="text-sm text-red-600" @click="remove(session)">Remove</button>
        </div>
      </li>
      <li v-if="!filtered.length" class="text-sm text-gray-400 py-8 text-center">
        No sessions match these filters.
      </li>
    </ul>

    <SessionEditModal
      v-if="editingSession"
      :session="editingSession"
      @close="editingSession = null"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { Client, SessionWithDetails } from '~/types'

const supabase = useSupabaseClient()
const sessions = ref<SessionWithDetails[]>([])
const clients = ref<Client[]>([])
const loading = ref(true)
const editingSession = ref<SessionWithDetails | null>(null)

const now = new Date()
const filters = reactive({
  month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  clientId: '',
  location: ''
})

const filtered = computed(() =>
  sessions.value
    .filter((s) => s.date.startsWith(filters.month))
    .filter((s) => !filters.clientId || s.client_id === filters.clientId)
    .filter((s) => !filters.location || s.class_instance.location === filters.location)
    .sort((a, b) => b.date.localeCompare(a.date))
)

async function load() {
  const [{ data: s }, { data: c }] = await Promise.all([
    supabase
      .from('sessions')
      .select('*, client:clients(*), class_instance:class_instances(*, class_slot:class_slots(*))'),
    supabase.from('clients').select('*').order('name')
  ])
  sessions.value = (s as SessionWithDetails[]) ?? []
  clients.value = (c as Client[]) ?? []
  loading.value = false
}

function edit(session: SessionWithDetails) {
  editingSession.value = session
}

async function remove(session: SessionWithDetails) {
  if (!confirm(`Remove session for ${session.client.name} on ${session.date}?`)) return
  await supabase.from('sessions').delete().eq('id', session.id)
  await load()
}

async function onSaved() {
  editingSession.value = null
  await load()
}

onMounted(load)
</script>

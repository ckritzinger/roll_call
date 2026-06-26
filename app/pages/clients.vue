<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">Clients</h2>
      <button class="text-sm text-blue-600 font-medium" @click="showArchived = !showArchived">
        {{ showArchived ? 'Hide archived' : 'Show archived' }}
      </button>
    </div>

    <ul class="space-y-2">
      <li
        v-for="client in visibleClients"
        :key="client.id"
        class="bg-white rounded-lg border p-3"
        @click="edit(client)"
      >
        <div class="flex items-center justify-between">
          <p class="font-medium text-gray-900">{{ client.name }}</p>
          <p class="text-sm text-gray-500">R{{ client.rate.toFixed(2) }} / R{{ client.month_rate.toFixed(2) }}pm</p>
        </div>
        <p class="text-sm text-gray-500">
          {{ client.location }} · {{ client.service_type }}
          <span v-if="client.scale_enabled">· scale</span>
          <span v-if="client.archived" class="text-orange-600">· archived</span>
        </p>
        <p v-if="recurringFor(client.id).length" class="text-xs text-gray-400 mt-1">
          {{ recurringFor(client.id).map((r) => `${r.day} ${r.time.slice(0, 5)}`).join(', ') }}
        </p>
      </li>
      <li v-if="!visibleClients.length" class="text-sm text-gray-400 py-8 text-center">
        No clients yet.
      </li>
    </ul>

    <button
      class="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full px-4 py-3 shadow-lg font-medium"
      @click="addNew"
    >
      + Client
    </button>

    <ClientFormModal
      v-if="showModal"
      :client="editingClient"
      :class-slots="classSlots"
      :recurring-slots="editingClient ? recurringFor(editingClient.id) : []"
      @close="showModal = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { Client, ClassSlot, ClientRecurringSlot } from '~/types'

const supabase = useSupabaseClient()
const clients = ref<Client[]>([])
const classSlots = ref<ClassSlot[]>([])
const recurringSlots = ref<ClientRecurringSlot[]>([])
const showArchived = ref(false)
const showModal = ref(false)
const editingClient = ref<Client | null>(null)

const visibleClients = computed(() =>
  showArchived.value ? clients.value : clients.value.filter((c) => !c.archived)
)

function recurringFor(clientId: string) {
  return recurringSlots.value.filter((r) => r.client_id === clientId)
}

async function load() {
  const [{ data: c }, { data: s }, { data: r }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('class_slots').select('*').eq('archived', false).order('name'),
    supabase.from('client_recurring_slots').select('*')
  ])
  clients.value = (c as Client[]) ?? []
  classSlots.value = (s as ClassSlot[]) ?? []
  recurringSlots.value = (r as ClientRecurringSlot[]) ?? []
}

function addNew() {
  editingClient.value = null
  showModal.value = true
}

function edit(client: Client) {
  editingClient.value = client
  showModal.value = true
}

async function onSaved() {
  showModal.value = false
  await load()
}

onMounted(load)
</script>

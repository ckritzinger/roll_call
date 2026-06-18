<template>
  <div class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
    <div class="bg-white rounded-t-xl sm:rounded-xl p-4 w-full sm:max-w-sm space-y-3">
      <h3 class="font-semibold text-gray-900">Add ad-hoc session</h3>

      <label class="block text-sm">
        Client
        <select v-model="clientId" class="mt-1 w-full border rounded-lg p-2">
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </label>

      <label class="block text-sm">
        Class slot
        <select v-model="classSlotId" class="mt-1 w-full border rounded-lg p-2">
          <option v-for="s in classSlots" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </label>

      <label class="block text-sm">
        Date
        <input v-model="date" type="date" class="mt-1 w-full border rounded-lg p-2" />
      </label>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-2 pt-2">
        <button class="flex-1 py-2 rounded-lg border" @click="$emit('close')">Cancel</button>
        <button
          class="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          :disabled="!clientId || !classSlotId || !date || saving"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Add' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { findOrCreateClassInstance } from '~/composables/useWeekGeneration'
import type { Client, ClassSlot } from '~/types'

const emit = defineEmits<{ close: []; added: [] }>()

const supabase = useSupabaseClient()
const clients = ref<Client[]>([])
const classSlots = ref<ClassSlot[]>([])
const clientId = ref('')
const classSlotId = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const saving = ref(false)
const error = ref('')

onMounted(async () => {
  const [{ data: c }, { data: s }] = await Promise.all([
    supabase.from('clients').select('*').eq('archived', false).order('name'),
    supabase.from('class_slots').select('*').eq('archived', false).order('name')
  ])
  clients.value = (c as Client[]) ?? []
  classSlots.value = (s as ClassSlot[]) ?? []
})

async function save() {
  saving.value = true
  error.value = ''

  const client = clients.value.find((c) => c.id === clientId.value)
  const classSlot = classSlots.value.find((s) => s.id === classSlotId.value)
  if (!client || !classSlot) {
    error.value = 'Select a client and class slot.'
    saving.value = false
    return
  }

  const instance = await findOrCreateClassInstance(classSlot, date.value)
  if (!instance) {
    error.value = 'Could not create class instance.'
    saving.value = false
    return
  }

  const { error: insertError } = await supabase.from('sessions').insert({
    client_id: client.id,
    class_instance_id: instance.id,
    date: date.value,
    status: 'attended',
    is_recurring: false,
    amount: client.rate
  })

  saving.value = false
  if (insertError) {
    error.value = insertError.message.includes('duplicate')
      ? 'Session already exists for this client and class.'
      : insertError.message
    return
  }
  emit('added')
}
</script>

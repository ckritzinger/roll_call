<template>
  <div class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
    <div class="bg-white rounded-t-xl sm:rounded-xl p-4 w-full sm:max-w-sm space-y-3 max-h-[90vh] overflow-y-auto">
      <h3 class="font-semibold text-gray-900">{{ client ? 'Edit client' : 'New client' }}</h3>

      <label class="block text-sm">
        Name
        <input v-model="form.name" type="text" class="mt-1 w-full border rounded-lg p-2" />
      </label>

      <label class="block text-sm">
        Location
        <select v-model="form.location" class="mt-1 w-full border rounded-lg p-2">
          <option>Sedgefield</option>
          <option>Knysna</option>
          <option>Both</option>
        </select>
      </label>

      <label class="block text-sm">
        Service type
        <select v-model="form.service_type" class="mt-1 w-full border rounded-lg p-2">
          <option>Group</option>
          <option>Private</option>
          <option>Both</option>
        </select>
      </label>

      <label class="block text-sm">
        Rate (R)
        <input v-model.number="form.rate" type="number" min="0" step="0.01" class="mt-1 w-full border rounded-lg p-2" />
      </label>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.scale_enabled" type="checkbox" />
        Scale (body composition tracking)
      </label>

      <div class="space-y-2">
        <p class="text-sm font-medium text-gray-700">Recurring schedule</p>
        <div v-for="(row, i) in recurring" :key="i" class="flex gap-2 items-center">
          <select v-model="row.class_slot_id" class="flex-1 border rounded-lg p-2 text-sm">
            <option v-for="s in classSlots" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <button class="text-red-600 text-sm" @click="recurring.splice(i, 1)">Remove</button>
        </div>
        <button class="text-sm text-blue-600 font-medium" @click="addRecurringRow">+ Add slot</button>
      </div>

      <label v-if="client" class="flex items-center gap-2 text-sm pt-2 border-t">
        <input v-model="form.archived" type="checkbox" />
        Archived
      </label>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-2 pt-2">
        <button class="flex-1 py-2 rounded-lg border" @click="$emit('close')">Cancel</button>
        <button
          class="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          :disabled="!form.name || saving"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Client, ClassSlot, ClientRecurringSlot } from '~/types'

const props = defineProps<{
  client: Client | null
  classSlots: ClassSlot[]
  recurringSlots: ClientRecurringSlot[]
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const supabase = useSupabaseClient()
const saving = ref(false)
const error = ref('')

const form = reactive({
  name: props.client?.name ?? '',
  location: props.client?.location ?? 'Sedgefield',
  service_type: props.client?.service_type ?? 'Group',
  rate: props.client?.rate ?? 0,
  scale_enabled: props.client?.scale_enabled ?? false,
  archived: props.client?.archived ?? false
})

const recurring = ref(
  props.recurringSlots.map((r) => ({ class_slot_id: r.class_slot_id }))
)

function addRecurringRow() {
  if (props.classSlots[0]) recurring.value.push({ class_slot_id: props.classSlots[0].id })
}

async function save() {
  saving.value = true
  error.value = ''

  let clientId = props.client?.id

  if (clientId) {
    const { error: updateError } = await supabase.from('clients').update(form).eq('id', clientId)
    if (updateError) {
      error.value = updateError.message
      saving.value = false
      return
    }
  } else {
    const { data, error: insertError } = await supabase.from('clients').insert(form).select().single()
    if (insertError || !data) {
      error.value = insertError?.message ?? 'Could not create client.'
      saving.value = false
      return
    }
    clientId = data.id
  }

  // Replace recurring slots wholesale — simplest correct approach for a
  // short list that's fully re-rendered each time the modal opens.
  await supabase.from('client_recurring_slots').delete().eq('client_id', clientId)
  const rows = recurring.value
    .map((r) => {
      const slot = props.classSlots.find((s) => s.id === r.class_slot_id)
      if (!slot) return null
      return { client_id: clientId, class_slot_id: slot.id, day: slot.day, time: slot.time }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length) {
    const { error: recurringError } = await supabase.from('client_recurring_slots').insert(rows)
    if (recurringError) {
      error.value = recurringError.message
      saving.value = false
      return
    }
  }

  saving.value = false
  emit('saved')
}
</script>

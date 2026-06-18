<template>
  <div class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
    <div class="bg-white rounded-t-xl sm:rounded-xl p-4 w-full sm:max-w-sm space-y-3">
      <h3 class="font-semibold text-gray-900">{{ session.client.name }} · {{ session.date }}</h3>

      <label class="block text-sm">
        Status
        <select v-model="form.status" class="mt-1 w-full border rounded-lg p-2">
          <option value="attended">Attended</option>
          <option value="absent">Absent</option>
        </select>
      </label>

      <label class="block text-sm">
        Amount (R)
        <input v-model.number="form.amount" type="number" min="0" step="0.01" class="mt-1 w-full border rounded-lg p-2" />
      </label>

      <label class="block text-sm">
        Notes
        <textarea v-model="form.notes" class="mt-1 w-full border rounded-lg p-2" rows="2" />
      </label>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-2 pt-2">
        <button class="flex-1 py-2 rounded-lg border" @click="$emit('close')">Cancel</button>
        <button
          class="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SessionWithDetails } from '~/types'

const props = defineProps<{ session: SessionWithDetails }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const supabase = useSupabaseClient()
const saving = ref(false)
const error = ref('')

const form = reactive({
  status: props.session.status,
  amount: props.session.amount,
  notes: props.session.notes ?? ''
})

async function save() {
  saving.value = true
  error.value = ''
  const { error: saveError } = await supabase
    .from('sessions')
    .update({ status: form.status, amount: form.amount, notes: form.notes || null })
    .eq('id', props.session.id)

  saving.value = false
  if (saveError) {
    error.value = saveError.message
    return
  }
  emit('saved')
}
</script>

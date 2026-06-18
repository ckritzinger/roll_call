<template>
  <div class="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
    <div class="bg-white rounded-t-xl sm:rounded-xl p-4 w-full sm:max-w-sm space-y-3">
      <h3 class="font-semibold text-gray-900">{{ slot ? 'Edit class slot' : 'New class slot' }}</h3>

      <label class="block text-sm">
        Name
        <input v-model="form.name" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="Sedgefield Group Mon" />
      </label>

      <label class="block text-sm">
        Location
        <select v-model="form.location" class="mt-1 w-full border rounded-lg p-2">
          <option>Sedgefield</option>
          <option>Knysna</option>
        </select>
      </label>

      <label class="block text-sm">
        Day
        <select v-model="form.day" class="mt-1 w-full border rounded-lg p-2">
          <option v-for="d in days" :key="d">{{ d }}</option>
        </select>
      </label>

      <label class="block text-sm">
        Time
        <input v-model="form.time" type="time" class="mt-1 w-full border rounded-lg p-2" />
      </label>

      <label class="block text-sm">
        Capacity
        <input v-model.number="form.capacity" type="number" min="1" class="mt-1 w-full border rounded-lg p-2" />
      </label>

      <label v-if="slot" class="flex items-center gap-2 text-sm pt-2 border-t">
        <input v-model="form.archived" type="checkbox" />
        Archived
      </label>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex gap-2 pt-2">
        <button class="flex-1 py-2 rounded-lg border" @click="$emit('close')">Cancel</button>
        <button
          class="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50"
          :disabled="!form.name || !form.time || saving"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ClassSlot } from '~/types'

const props = defineProps<{ slot: ClassSlot | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const supabase = useSupabaseClient()
const saving = ref(false)
const error = ref('')
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const form = reactive({
  name: props.slot?.name ?? '',
  location: props.slot?.location ?? 'Sedgefield',
  day: props.slot?.day ?? 'Monday',
  time: props.slot?.time?.slice(0, 5) ?? '',
  capacity: props.slot?.capacity ?? 10,
  archived: props.slot?.archived ?? false
})

async function save() {
  saving.value = true
  error.value = ''

  const { error: saveError } = props.slot
    ? await supabase.from('class_slots').update(form).eq('id', props.slot.id)
    : await supabase.from('class_slots').insert(form)

  saving.value = false
  if (saveError) {
    error.value = saveError.message
    return
  }
  emit('saved')
}
</script>

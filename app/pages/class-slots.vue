<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold text-gray-900">Class Slots</h2>
      <button class="text-sm text-blue-600 font-medium" @click="showArchived = !showArchived">
        {{ showArchived ? 'Hide archived' : 'Show archived' }}
      </button>
    </div>

    <ul class="space-y-2">
      <li
        v-for="slot in visibleSlots"
        :key="slot.id"
        class="bg-white rounded-lg border p-3"
        @click="edit(slot)"
      >
        <div class="flex items-center justify-between">
          <p class="font-medium text-gray-900">{{ slot.name }}</p>
          <p class="text-sm text-gray-500">cap {{ slot.capacity }}</p>
        </div>
        <p class="text-sm text-gray-500">
          {{ slot.location }} · {{ slot.day }} {{ slot.time.slice(0, 5) }}
          <span v-if="slot.archived" class="text-orange-600">· archived</span>
        </p>
      </li>
      <li v-if="!visibleSlots.length" class="text-sm text-gray-400 py-8 text-center">
        No class slots yet.
      </li>
    </ul>

    <button
      class="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full px-4 py-3 shadow-lg font-medium"
      @click="addNew"
    >
      + Class slot
    </button>

    <ClassSlotFormModal
      v-if="showModal"
      :slot="editingSlot"
      @close="showModal = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { ClassSlot } from '~/types'

const supabase = useSupabaseClient()
const slots = ref<ClassSlot[]>([])
const showArchived = ref(false)
const showModal = ref(false)
const editingSlot = ref<ClassSlot | null>(null)

const visibleSlots = computed(() =>
  showArchived.value ? slots.value : slots.value.filter((s) => !s.archived)
)

async function load() {
  const { data } = await supabase.from('class_slots').select('*').order('day').order('time')
  slots.value = (data as ClassSlot[]) ?? []
}

function addNew() {
  editingSlot.value = null
  showModal.value = true
}

function edit(slot: ClassSlot) {
  editingSlot.value = slot
  showModal.value = true
}

async function onSaved() {
  showModal.value = false
  await load()
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <header class="bg-white border-b px-4 py-3 print:hidden">
      <h1 class="text-lg font-semibold text-gray-900">Barbara's Studio</h1>
    </header>

    <main class="flex-1 pb-20 print:pb-0">
      <slot />
    </main>

    <nav
      class="fixed bottom-0 left-0 right-0 bg-white border-t flex print:hidden"
      aria-label="Primary"
    >
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium text-gray-500"
        active-class="text-blue-600"
      >
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/class-slots', label: 'Class Slots' },
  { to: '/session-log', label: 'Session Log' }
]
</script>

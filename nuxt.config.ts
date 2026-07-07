// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@powersync/nuxt'],
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login'],
    },
  },
  runtimeConfig: {
    public: {
      powerSyncUrl: '',   // NUXT_PUBLIC_POWER_SYNC_URL
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['@powersync/web'],
    },
    worker: {
      format: 'es',
    },
  },
})
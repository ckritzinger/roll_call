// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@powersync/nuxt'],
  supabase: {
    // Phase 1 is unauthenticated (admin-only, no login screen) — disable
    // the module's default redirect-to-login behavior.
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['*']
    }
  },
  runtimeConfig: {
    powerSyncToken: '',   // NUXT_POWER_SYNC_TOKEN
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
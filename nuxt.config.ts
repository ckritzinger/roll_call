// https://nuxt.com/docs/api/configuration/nuxt-config
import { cpSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
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
  nitro: {
    hooks: {
      // @powersync/node's native SQLite extension binaries and its worker
      // thread entrypoint are loaded via dlopen()/dynamic Worker() paths, so
      // Nitro's file tracer doesn't detect them as build output dependencies
      // and drops them from .output. Copy them back in after build.
      compiled(nitro) {
        const src = join(process.cwd(), 'node_modules/@powersync/node/lib')
        const dest = join(nitro.options.output.serverDir, 'node_modules/@powersync/node/lib')
        if (!existsSync(src) || !existsSync(dest)) return
        for (const file of readdirSync(src)) {
          if (/\.(so|dylib|dll)$/.test(file) || file.startsWith('worker.js')) {
            cpSync(join(src, file), join(dest, file))
          }
        }
      },
    },
  },
})
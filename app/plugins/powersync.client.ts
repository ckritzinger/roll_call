import { createPowerSyncPlugin } from '@powersync/vue'
import { AppSchema } from '~/powersync/schema'

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const db = new NuxtPowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'roll_call.db' },
    })

    const connector = {
      async fetchCredentials() {
        return $fetch<{ token: string; endpoint: string }>('/api/powersync/token')
      },
      async uploadData() {
        // All writes go through Supabase directly — nothing to upload via PowerSync
      },
    }

    await db.init()
    await db.connect(connector)

    nuxtApp.vueApp.use(createPowerSyncPlugin({ database: db }))
  },
})

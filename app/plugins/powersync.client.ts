import { createPowerSyncPlugin } from '@powersync/vue'
import { AppSchema } from '~/powersync/schema'

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const supabase = useSupabaseClient()

    const db = new NuxtPowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'roll_call.db' },
    })

    const connector = {
      async fetchCredentials() {
        return $fetch<{ token: string; endpoint: string }>('/api/powersync/token')
      },

      async uploadData(database: typeof db) {
        const transaction = await database.getNextCrudTransaction()
        if (!transaction) return

        try {
          for (const op of transaction.crud) {
            const { table, id, opData, op: opType } = op

            if (opType === 'PATCH') {
              const { error } = await supabase.from(table as any).update(opData!).eq('id', id)
              if (error) throw error
            } else if (opType === 'PUT') {
              const { error } = await supabase.from(table as any).upsert({ id, ...opData })
              if (error) throw error
            } else if (opType === 'DELETE') {
              const { error } = await supabase.from(table as any).delete().eq('id', id)
              if (error) throw error
            }
          }
          await transaction.complete()
        } catch (e) {
          console.error('[PowerSync] uploadData failed:', e)
          throw e // PowerSync will retry
        }
      },
    }

    await db.init()
    await db.connect(connector)

    nuxtApp.vueApp.use(createPowerSyncPlugin({ database: db }))
  },
})

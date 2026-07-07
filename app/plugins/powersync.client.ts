import { createPowerSyncPlugin } from '@powersync/vue'
import { AppSchema } from '~/powersync/schema'

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const config = useRuntimeConfig()

    const db = new NuxtPowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'roll_call.db' },
    })

    const connector = {
      async fetchCredentials() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')
        return {
          endpoint: config.public.powerSyncUrl as string,
          token: session.access_token,
        }
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
          throw e
        }
      },
    }

    await db.init()

    if (user.value) {
      await db.connect(connector)
    }

    watch(user, async (newUser, oldUser) => {
      if (newUser && !oldUser) {
        await db.connect(connector)
      } else if (!newUser && oldUser) {
        await db.disconnect()
      }
    })

    nuxtApp.vueApp.use(createPowerSyncPlugin({ database: db }))
  },
})

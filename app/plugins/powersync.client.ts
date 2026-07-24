import { createPowerSyncPlugin } from '@powersync/vue'
import { createConsoleLogger, LogLevels } from '@powersync/web'
import { AppSchema } from '~/powersync/schema'

export default defineNuxtPlugin({
  setup(nuxtApp) {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()
    const config = useRuntimeConfig()

    const db = new NuxtPowerSyncDatabase({
      schema: AppSchema,
      database: { dbFilename: 'roll_call.db' },
      logger: createConsoleLogger({ minLevel: LogLevels.trace }),
    })

    const connector = {
      async fetchCredentials() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')
        const endpoint = config.public.powerSyncUrl as string
        console.log('[PowerSync] connecting to', endpoint || '(empty — NUXT_PUBLIC_POWER_SYNC_URL not set)')
        return { endpoint, token: session.access_token }
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

    // Provide DB synchronously so usePowerSync() / useQuery() are available
    // immediately when components render. init() + connect() run in the background.
    nuxtApp.vueApp.use(createPowerSyncPlugin({ database: db }))

    db.init().then(() => {
      if (user.value) db.connect(connector)
    })

    watch(user, (newUser, oldUser) => {
      if (newUser && !oldUser) db.connect(connector)
      else if (!newUser && oldUser) db.disconnect()
    })
  },
})

import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { PowerSyncDatabase } from '@powersync/node'
import { AppSchema } from '~/powersync/schema'

// Opens a real PowerSync client connection and closes it, so the instance
// registers a "client connection" and isn't deprovisioned for inactivity
// (PowerSync Cloud free tier deprovisions after 7 days with no deploys or
// client connections). Scheduled via the `crons` entry in vercel.json.
// Standalone version for manual testing: scripts/powersync-keepalive.ts

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = getHeader(event, 'authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
  }

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_KEY
  const POWERSYNC_URL = process.env.NUXT_PUBLIC_POWER_SYNC_URL
  const KEEPALIVE_EMAIL = process.env.KEEPALIVE_EMAIL
  const KEEPALIVE_PASSWORD = process.env.KEEPALIVE_PASSWORD

  for (const [name, value] of Object.entries({
    SUPABASE_URL, SUPABASE_KEY, POWERSYNC_URL, KEEPALIVE_EMAIL, KEEPALIVE_PASSWORD,
  })) {
    if (!value) throw createError({ statusCode: 500, statusMessage: `Missing ${name} env var` })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: KEEPALIVE_EMAIL!,
    password: KEEPALIVE_PASSWORD!,
  })
  if (error || !data.session) {
    throw createError({ statusCode: 500, statusMessage: `Supabase sign-in failed: ${error?.message}` })
  }

  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: `keepalive-${randomUUID()}.db`, dbLocation: '/tmp' },
  })

  const connector = {
    async fetchCredentials() {
      return { endpoint: POWERSYNC_URL!, token: data.session!.access_token }
    },
    async uploadData() {
      // No local writes ever happen in this route.
    },
  }

  await db.init()
  await db.connect(connector)

  const connected = await waitUntil(() => db.connected, 15_000)

  await db.disconnect()
  await db.close()
  await supabase.auth.signOut()

  if (!connected) {
    throw createError({ statusCode: 504, statusMessage: 'PowerSync never reached connected state within timeout' })
  }

  return { ok: true, connected }
})

function waitUntil(check: () => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now()
    const interval = setInterval(() => {
      if (check()) {
        clearInterval(interval)
        resolve(true)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve(false)
      }
    }, 250)
  })
}

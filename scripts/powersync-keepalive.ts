#!/usr/bin/env node
// Opens a real PowerSync client connection and immediately closes it, so the
// instance registers a "client connection" and doesn't get deprovisioned for
// inactivity (PowerSync Cloud free tier deprovisions after 7 days with no
// deploys or client connections). Standalone for now — will be wired up to
// run on a Vercel Cron schedule once proven out here.
//
// Usage:
//   node scripts/powersync-keepalive.ts

import { randomUUID } from 'node:crypto'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PowerSyncDatabase } from '@powersync/node'
import { AppSchema } from '../app/powersync/schema.ts'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const POWERSYNC_URL = process.env.NUXT_PUBLIC_POWER_SYNC_URL
const KEEPALIVE_EMAIL = process.env.KEEPALIVE_EMAIL
const KEEPALIVE_PASSWORD = process.env.KEEPALIVE_PASSWORD

for (const [name, value] of Object.entries({
  SUPABASE_URL, SUPABASE_KEY, POWERSYNC_URL, KEEPALIVE_EMAIL, KEEPALIVE_PASSWORD,
})) {
  if (!value) {
    console.error(`Missing ${name} in .env`)
    process.exit(1)
  }
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: KEEPALIVE_EMAIL!,
    password: KEEPALIVE_PASSWORD!,
  })
  if (error || !data.session) {
    console.error('[keepalive] Supabase sign-in failed:', error?.message)
    process.exit(1)
  }
  console.log('[keepalive] signed in as', data.user?.email)

  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: `keepalive-${randomUUID()}.db`, dbLocation: '/tmp' },
  })

  const connector = {
    async fetchCredentials() {
      return { endpoint: POWERSYNC_URL!, token: data.session!.access_token }
    },
    async uploadData() {
      // No local writes ever happen in this script.
    },
  }

  await db.init()
  await db.connect(connector)

  const connected = await waitUntil(() => db.connected, 15_000)
  console.log('[keepalive] connected:', connected)

  await db.disconnect()
  await db.close()
  await supabase.auth.signOut()

  if (!connected) {
    console.error('[keepalive] never reached connected state within timeout')
    process.exit(1)
  }
  console.log('[keepalive] done')
}

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

main().catch((err) => {
  console.error('[keepalive] failed:', err)
  process.exit(1)
})

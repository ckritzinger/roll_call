#!/usr/bin/env node
// @powersync/node's native SQLite extension binaries and its worker thread
// entrypoint are loaded via dlopen()/dynamic Worker() paths, so Nitro's file
// tracer doesn't detect them as build output dependencies and drops them from
// the production bundle. Copy them back in after build.
//
// Deliberately NOT a nitro.hooks.compiled hook: registering any handler on
// that hook — even a no-op — breaks the `vercel` preset's own output
// finalization (missing .vc-config.json / routes, deployment 404s). Plain
// postbuild step instead.

import { existsSync, readdirSync, cpSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(process.cwd(), 'node_modules/@powersync/node/lib')

function findFuncDirs(dir) {
  if (!existsSync(dir)) return []
  const found = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    if (entry.endsWith('.func')) found.push(full)
    else found.push(...findFuncDirs(full))
  }
  return found
}

const CANDIDATE_DIRS = [
  join(process.cwd(), '.output/server/node_modules/@powersync/node/lib'),
  ...findFuncDirs(join(process.cwd(), '.vercel/output/functions'))
    .map((dir) => join(dir, 'node_modules/@powersync/node/lib')),
]

if (!existsSync(SRC)) process.exit(0)

for (const dest of CANDIDATE_DIRS) {
  if (!existsSync(dest)) continue
  for (const file of readdirSync(SRC)) {
    if (/\.(so|dylib|dll)$/.test(file) || file.startsWith('worker.js')) {
      cpSync(join(SRC, file), join(dest, file))
    }
  }
  console.log(`[fix-powersync-native] patched ${dest}`)
}

#!/usr/bin/env node
// Imports data/Barbara Classes - Classes.csv and data/Barbara Classes - Clients.csv
// into the linked Supabase project. Idempotent: re-running without --wipe won't
// create duplicates.
//
// Validates ALL rows in both CSVs before writing anything — any bad data aborts
// with no writes made.
//
// Usage:
//   node scripts/import-data.js             # import (idempotent)
//   node scripts/import-data.js --wipe      # delete all records first, then import
//   node scripts/import-data.js --dry-run   # validate + show planned changes, no writes

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DRY_RUN = process.argv.includes('--dry-run')
const WIPE = process.argv.includes('--wipe')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_KEY in .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

class ValidationError extends Error {}

// ── CSV tokenizer ────────────────────────────────────────────────────
function tokenizeCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i+1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.map((r) => r.map((f) => f.trim()))
}

// ── validators ───────────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const LOCATIONS = ['Sedgefield','Knysna']
const CLIENT_LOCATIONS = [...LOCATIONS, 'Both', 'Zoom']
const SERVICE_TYPES = ['Group','Private','Both','Duet','Zoom']

function requireOneOf(value, allowed, label, context) {
  if (!allowed.includes(value))
    throw new ValidationError(`${context}: invalid ${label} "${value}" (expected: ${allowed.join(', ')})`)
  return value
}

function normalizeTime(raw, context) {
  const m = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) throw new ValidationError(`${context}: invalid time "${raw}"`)
  return `${m[1].padStart(2, '0')}:${m[2]}:00`
}

function requireInt(raw, label, context) {
  if (!/^\d+$/.test(raw)) throw new ValidationError(`${context}: ${label} "${raw}" is not an integer`)
  const n = parseInt(raw, 10)
  if (n <= 0) throw new ValidationError(`${context}: ${label} must be > 0, got ${n}`)
  return n
}

// Detect currency from rate string: R/r prefix → ZAR, $ suffix → USD, else ZAR
function detectCurrency(raw) {
  if (/^[Rr]/.test(raw)) return 'ZAR'
  if (/\$$/.test(raw)) return 'USD'
  return 'ZAR'
}

// Strip currency symbols and parse; empty → 0
function parseAmount(raw, label, context) {
  const stripped = raw.replace(/^[Rr]/, '').replace(/\$$/, '').trim()
  if (stripped === '') return 0
  const n = Number(stripped)
  if (Number.isNaN(n) || n < 0)
    throw new ValidationError(`${context}: ${label} "${raw}" is not a valid non-negative amount`)
  return n
}

// Empty or missing → false; y/Y → true; n/N → false; anything else → error
function parseYN(raw, label, context) {
  const v = raw.trim().toLowerCase()
  if (v === '' || v === 'n') return false
  if (v === 'y') return true
  throw new ValidationError(`${context}: ${label} "${raw}" must be "y", "n", or empty`)
}

// ── parse + validate Classes.csv ─────────────────────────────────────
function loadClassSlotDefs() {
  const rows = tokenizeCsv(readFileSync(path.join(DATA_DIR, 'Barbara Classes - Classes.csv'), 'utf-8'))
  rows.shift() // header

  const defs = []
  const seenNames = new Set()
  for (const [name, day, time, location, capacity] of rows) {
    const ctx = `Classes.csv "${name}"`
    if (!name) throw new ValidationError(`Classes.csv: row missing slot name`)
    if (seenNames.has(name)) throw new ValidationError(`Classes.csv: duplicate slot name "${name}"`)
    seenNames.add(name)
    defs.push({
      name,
      day: requireOneOf(day, DAYS, 'day', ctx),
      time: normalizeTime(time, ctx),
      location: requireOneOf(location, LOCATIONS, 'location', ctx),
      capacity: requireInt(capacity, 'capacity', ctx),
    })
  }
  return defs
}

// ── parse + validate Clients.csv ─────────────────────────────────────
// Columns: Name[0], Location[1], Type[2], Rate[3], Month Rate[4], Scale[5], Classes[6+]
function loadClientDefs(slotDefs) {
  const rows = tokenizeCsv(readFileSync(path.join(DATA_DIR, 'Barbara Classes - Clients.csv'), 'utf-8'))
  rows.shift() // header

  const slotsByName = new Map(slotDefs.map((s) => [s.name, s]))
  const defs = []

  for (const row of rows) {
    const [name, location, service_type, rawRate, rawMonthRate, rawScale, ...classEntries] = row
    const ctx = `Clients.csv "${name}"`
    if (!name) throw new ValidationError(`Clients.csv: row missing client name`)

    const recurringSlots = []
    for (const entry of classEntries.filter((e) => e !== '')) {
      const slot = slotsByName.get(entry)
      if (!slot) throw new ValidationError(`${ctx}: recurring class "${entry}" not in Classes.csv`)
      recurringSlots.push(slot)
    }

    defs.push({
      name,
      location: requireOneOf(location, CLIENT_LOCATIONS, 'location', ctx),
      service_type: requireOneOf(service_type, SERVICE_TYPES, 'service type', ctx),
      currency: detectCurrency(rawRate),
      rate: parseAmount(rawRate, 'rate', ctx),
      month_rate: parseAmount(rawMonthRate, 'month rate', ctx),
      scale_enabled: parseYN(rawScale, 'scale', ctx),
      recurringSlots,
    })
  }
  return defs
}

// ── wipe ─────────────────────────────────────────────────────────────
async function wipeAll() {
  // Delete in FK-safe order
  const tables = ['sessions', 'client_recurring_slots', 'class_instances', 'invoices', 'clients', 'class_slots']
  for (const table of tables) {
    console.log(`  deleting ${table}...`)
    if (!DRY_RUN) {
      const { error } = await supabase.from(table).delete().gte('created_at', '1900-01-01')
      if (error) throw error
    }
  }
}

// ── writes ───────────────────────────────────────────────────────────
async function upsertClassSlots(slotDefs) {
  const { data: existing, error } = await supabase.from('class_slots').select('*')
  if (error) throw error

  const result = new Map()
  for (const def of slotDefs) {
    const match = existing.find((s) => s.day === def.day && s.time === def.time && s.location === def.location)
    if (match) { result.set(def.name, match); continue }

    console.log(`  + class_slot: ${def.name}`)
    if (DRY_RUN) { result.set(def.name, { id: null, ...def }); continue }

    const { data, error: e } = await supabase.from('class_slots')
      .insert({ name: def.name, location: def.location, day: def.day, time: def.time, capacity: def.capacity })
      .select().single()
    if (e) throw e
    result.set(def.name, data)
  }
  return result
}

async function upsertClients(clientDefs, slotRowsByName) {
  const { data: existingClients, error: ce } = await supabase.from('clients').select('*')
  if (ce) throw ce
  const { data: existingLinks, error: le } = await supabase.from('client_recurring_slots').select('*')
  if (le) throw le

  for (const def of clientDefs) {
    let client = existingClients.find((c) => c.name === def.name)
    if (!client) {
      console.log(`  + client: ${def.name} (${def.location}, ${def.service_type}, ${def.currency} ${def.rate} / R${def.month_rate}pm)`)
      if (DRY_RUN) { client = { id: null, ...def }; continue }

      const { data, error: e } = await supabase.from('clients')
        .insert({ name: def.name, location: def.location, service_type: def.service_type,
                  rate: def.rate, currency: def.currency, month_rate: def.month_rate, scale_enabled: def.scale_enabled })
        .select().single()
      if (e) throw e
      client = data
    } else {
      console.log(`  = client exists: ${def.name}`)
    }

    for (const slotDef of def.recurringSlots) {
      const slotRow = slotRowsByName.get(slotDef.name)
      if (existingLinks.find((l) => l.client_id === client.id && l.class_slot_id === slotRow?.id)) {
        console.log(`    = already linked: ${slotDef.name}`)
        continue
      }
      console.log(`    + recurring: ${slotDef.name}`)
      if (DRY_RUN || !slotRow?.id) continue

      const { error: e } = await supabase.from('client_recurring_slots')
        .insert({ client_id: client.id, class_slot_id: slotRow.id, day: slotRow.day, time: slotRow.time })
      if (e) throw e
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) console.log('--- DRY RUN ---\n')

  console.log('Validating Classes.csv...')
  const slotDefs = loadClassSlotDefs()
  console.log(`  ${slotDefs.length} slot(s) OK`)

  console.log('Validating Clients.csv...')
  const clientDefs = loadClientDefs(slotDefs)
  console.log(`  ${clientDefs.length} client(s) OK`)

  if (WIPE) {
    console.log('\nWiping all records...')
    await wipeAll()
  }

  console.log('\nImporting class slots...')
  const slotRowsByName = await upsertClassSlots(slotDefs)

  console.log('\nImporting clients...')
  await upsertClients(clientDefs, slotRowsByName)

  console.log('\nDone.')
}

main().catch((err) => {
  if (err instanceof ValidationError) console.error('\nValidation failed:', err.message)
  else console.error('\nImport failed:', err.message)
  process.exit(1)
})

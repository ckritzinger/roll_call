#!/usr/bin/env node
// Imports data/Barbara Classes - Classes.csv and data/Barbara Classes - Clients.csv
// into the linked Supabase project. Idempotent: re-running won't create duplicates.
//
// Validates ALL rows in both CSVs before writing anything — any bad data
// (unknown location/type, non-integer capacity, unmatched recurring class)
// aborts the import with no writes made.
//
// Usage: node scripts/import-data.js [--dry-run]

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DRY_RUN = process.argv.includes('--dry-run')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

class ValidationError extends Error {}

// ── CSV tokenizer: returns array-of-arrays (handles quoted fields) ──
function tokenizeCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows.map((r) => r.map((f) => f.trim()))
}

// ── validators (throw ValidationError, never warn-and-continue) ────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const LOCATIONS = ['Sedgefield', 'Knysna']
const CLIENT_LOCATIONS = [...LOCATIONS, 'Both']
const SERVICE_TYPES = ['Group', 'Private', 'Both']

function requireOneOf(value, allowed, label, context) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${context}: invalid ${label} "${value}" (expected one of ${allowed.join(', ')})`)
  }
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

function requireNumber(raw, label, context) {
  const n = Number(raw)
  if (raw === '' || Number.isNaN(n) || n < 0) throw new ValidationError(`${context}: ${label} "${raw}" is not a valid non-negative number`)
  return n
}

function requireYN(raw, label, context) {
  const v = raw.trim().toLowerCase()
  if (v !== 'y' && v !== 'n') throw new ValidationError(`${context}: ${label} "${raw}" must be "y" or "n"`)
  return v === 'y'
}

// ── parse + validate Classes.csv -> class slot definitions ─────────
function loadClassSlotDefs() {
  const csvPath = path.join(DATA_DIR, 'Barbara Classes - Classes.csv')
  const rows = tokenizeCsv(readFileSync(csvPath, 'utf-8'))
  rows.shift() // header

  const defs = []
  const seenNames = new Set()
  for (const [name, day, time, location, capacity] of rows) {
    const context = `Classes.csv row "${name}"`
    if (!name) throw new ValidationError(`Classes.csv: row missing slot name (${[day, time, location, capacity].join(',')})`)
    if (seenNames.has(name)) throw new ValidationError(`Classes.csv: duplicate slot name "${name}"`)
    seenNames.add(name)

    defs.push({
      name,
      day: requireOneOf(day, DAYS, 'day', context),
      time: normalizeTime(time, context),
      location: requireOneOf(location, LOCATIONS, 'location', context),
      capacity: requireInt(capacity, 'capacity', context),
    })
  }
  return defs
}

// ── parse + validate Clients.csv -> client definitions ─────────────
function loadClientDefs(slotDefs) {
  const csvPath = path.join(DATA_DIR, 'Barbara Classes - Clients.csv')
  const rows = tokenizeCsv(readFileSync(csvPath, 'utf-8'))
  rows.shift() // header (trailing columns past "Classes" are unnamed — classes are positional)

  const slotsByName = new Map(slotDefs.map((s) => [s.name, s]))

  const defs = []
  for (const row of rows) {
    const [name, location, service_type, rate, scale, ...classEntries] = row
    const context = `Clients.csv row "${name}"`
    if (!name) throw new ValidationError(`Clients.csv: row missing client name`)

    const recurringSlots = []
    for (const entry of classEntries.filter((e) => e.trim() !== '')) {
      const slot = slotsByName.get(entry)
      if (!slot) {
        throw new ValidationError(
          `${context}: recurring class "${entry}" does not match any slot name in Classes.csv`
        )
      }
      recurringSlots.push(slot)
    }

    defs.push({
      name,
      location: requireOneOf(location, CLIENT_LOCATIONS, 'location', context),
      service_type: requireOneOf(service_type, SERVICE_TYPES, 'service type', context),
      rate: requireNumber(rate, 'rate', context),
      scale_enabled: requireYN(scale, 'scale', context),
      recurringSlots,
    })
  }
  return defs
}

// ── writes (only reached once both files are fully validated) ──────
async function upsertClassSlots(slotDefs) {
  const { data: existing, error } = await supabase.from('class_slots').select('*')
  if (error) throw error

  const result = new Map() // name -> row
  for (const def of slotDefs) {
    const match = existing.find((s) => s.day === def.day && s.time === def.time && s.location === def.location)
    if (match) { result.set(def.name, match); continue }

    console.log(`  + class_slot: ${def.name} (${def.day} ${def.time} ${def.location}, cap ${def.capacity})`)
    if (DRY_RUN) { result.set(def.name, { id: null, ...def }); continue }

    const { data, error: insertErr } = await supabase
      .from('class_slots')
      .insert({ name: def.name, location: def.location, day: def.day, time: def.time, capacity: def.capacity })
      .select()
      .single()
    if (insertErr) throw insertErr
    result.set(def.name, data)
  }
  return result
}

async function upsertClients(clientDefs, slotRowsByName) {
  const { data: existingClients, error: clientsErr } = await supabase.from('clients').select('*')
  if (clientsErr) throw clientsErr
  const { data: existingLinks, error: linksErr } = await supabase.from('client_recurring_slots').select('*')
  if (linksErr) throw linksErr

  for (const def of clientDefs) {
    let client = existingClients.find((c) => c.name === def.name)
    if (!client) {
      console.log(`  + client: ${def.name} (${def.location}, ${def.service_type}, R${def.rate})`)
      if (DRY_RUN) {
        client = { id: null, ...def }
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: def.name,
            location: def.location,
            service_type: def.service_type,
            rate: def.rate,
            scale_enabled: def.scale_enabled,
          })
          .select()
          .single()
        if (error) throw error
        client = data
      }
    } else {
      console.log(`  = client already exists: ${def.name}`)
    }

    for (const slotDef of def.recurringSlots) {
      const slotRow = slotRowsByName.get(slotDef.name)
      const alreadyLinked = existingLinks.find(
        (l) => l.client_id === client.id && l.class_slot_id === slotRow.id
      )
      if (alreadyLinked) {
        console.log(`    = recurring slot already linked: ${slotDef.name}`)
        continue
      }

      console.log(`    + recurring slot: ${slotDef.name}`)
      if (DRY_RUN) continue

      const { error } = await supabase.from('client_recurring_slots').insert({
        client_id: client.id,
        class_slot_id: slotRow.id,
        day: slotRow.day,
        time: slotRow.time,
      })
      if (error) throw error
    }
  }
}

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN: no writes will be made ---\n')

  console.log('Validating Classes.csv...')
  const slotDefs = loadClassSlotDefs()
  console.log(`  ${slotDefs.length} slot(s) OK`)

  console.log('Validating Clients.csv...')
  const clientDefs = loadClientDefs(slotDefs)
  console.log(`  ${clientDefs.length} client(s) OK`)

  console.log('\nImporting class slots...')
  const slotRowsByName = await upsertClassSlots(slotDefs)

  console.log('\nImporting clients...')
  await upsertClients(clientDefs, slotRowsByName)

  console.log('\nDone.')
}

main().catch((err) => {
  if (err instanceof ValidationError) console.error('Validation failed:', err.message)
  else console.error('Import failed:', err.message)
  process.exit(1)
})

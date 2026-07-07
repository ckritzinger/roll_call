import { column, Schema, Table } from '@powersync/web'

// id column is auto-created by PowerSync — don't redeclare it.
// boolean -> integer (SQLite has no boolean type).

const class_slots = new Table({
  name: column.text,
  location: column.text,
  day: column.text,
  time: column.text,
  capacity: column.integer,
  archived: column.integer,
  created_at: column.text,
})

const class_instances = new Table({
  class_slot_id: column.text,
  date: column.text,
  time: column.text,
  location: column.text,
  capacity: column.integer,
  created_at: column.text,
})

const clients = new Table({
  name: column.text,
  location: column.text,
  service_type: column.text,
  rate: column.real,
  scale_enabled: column.integer,
  currency: column.text,
  month_rate: column.real,
  archived: column.integer,
  created_at: column.text,
})

const client_recurring_slots = new Table({
  client_id: column.text,
  class_slot_id: column.text,
  day: column.text,
  time: column.text,
  created_at: column.text,
})

const sessions = new Table({
  client_id: column.text,
  class_instance_id: column.text,
  date: column.text,
  status: column.text,
  is_recurring: column.integer,
  amount: column.real,
  notes: column.text,
  created_at: column.text,
})

export const AppSchema = new Schema({
  class_slots,
  class_instances,
  clients,
  client_recurring_slots,
  sessions,
})

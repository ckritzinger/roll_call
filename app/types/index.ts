export type Currency = 'ZAR' | 'USD' | 'CAD'
export type Location = 'Sedgefield' | 'Knysna'
export type ClientLocation = Location | 'Both' | 'Zoom'
export type ServiceType = 'Group' | 'Private' | 'Both' | 'Duet' | 'Zoom'
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
export type SessionStatus = 'attended' | 'absent'

export interface ClassSlot {
  id: string
  name: string
  location: Location
  day: Day
  time: string // HH:MM:SS
  capacity: number
  archived: boolean
  created_at: string
}

export interface ClassInstance {
  id: string
  class_slot_id: string
  date: string // YYYY-MM-DD
  time: string
  location: Location
  capacity: number
  created_at: string
}

export interface ClientRecurringSlot {
  id: string
  client_id: string
  class_slot_id: string
  day: Day
  time: string
}

export interface Client {
  id: string
  name: string
  location: ClientLocation
  service_type: ServiceType
  rate: number
  scale_enabled: boolean
  currency: Currency
  month_rate: number
  archived: boolean
  created_at: string
}

export interface Session {
  id: string
  client_id: string
  class_instance_id: string
  date: string
  status: SessionStatus
  is_recurring: boolean
  amount: number
  notes: string | null
  created_at: string
}

export interface InvoiceLineItem {
  date: string
  description: string
  amount: number
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  month: string
  line_items: InvoiceLineItem[]
  scale_line_item: { description: string; amount: number } | null
  total: number
  issued_date: string
  created_at: string
}

export interface Settings {
  id: true
  studio_name: string
  banking_details: string
  invoice_counter: number
}

// Joined shapes used by views
export interface SessionWithDetails extends Session {
  client: Client
  class_instance: ClassInstance & { class_slot: ClassSlot }
}

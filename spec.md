Barbara’s Studio Billing Tracker

OVERVIEW

A mobile-first web app for a Pilates studio owner (Barbara) to log client sessions and generate formal monthly invoices. Phase 1 is admin-only (Barbara logs everything). 

Phase 2 will add a client-facing booking layer — the architecture must anticipate this without building it yet.


PHASED SCOPE

|Phase |Who uses it |What it does |
|-------------|------------|---------------------------------------------------|
|1 (build now)|Barbara only|Log sessions, generate invoices, track Robin ledger of classes that were run|
|2 (future) |Clients too |Self-booking, Barbara confirms/manages |

Design decisions must not block Phase 2. Flag anything that would need to be retrofitted.

DATA MODEL

ClassSlot

id string
name string e.g. "Sedgefield Group Mon"
location enum Sedgefield | Knysna
day enum Monday–Saturday
time string HH:MM
capacity int


Client

id string
name string
location enum Sedgefield | Knysna | Both
serviceType enum Group | Private | Both
rate number Rands — single flat rate, set manually per client
scaleEnabled boolean default false
recurring object { classSlotId, day, time } | null

Session

id string
clientId string → Client.id
classSlotId string → ClassSlot.id
date string YYYY-MM-DD
status enum attended | absent
isRecurring boolean
notes string optional


Invoice

id string
invoiceNumber string INV-0001, sequential, never reused
clientId string → Client.id
month string YYYY-MM
lineItems array [{ date, description, amount }]
scaleLineItem object { description: "Body composition tracking", amount: 100 } | null
total number
issuedDate string YYYY-MM-DD


Settings (singleton)

studioName string
bankingDetails string
invoiceCounter integer increment on each invoice generated


BUSINESS RULES

1. On app open, generate session entries for the current week for all clients where recurring !== null. Default status = attended. Barbara only acts if someone was absent.
2. A session entry must not be duplicated if it already exists for that client + classSlot + date.
3. Knysna ledger: any session where client location is Knysna or Both AND status is attended → contributes R40 to Robin ledger for that month. Robin ledger is read-only; it is calculated, not stored.
4. Scale: if scaleEnabled = true → add one R100 line item to that client’s invoice for the month, regardless of session count. Label: “Body composition tracking.” This is dormant by default — the toggle exists on every client card but does not affect billing until switched on.
5. Invoice line items: one line per attended session. Fields: date (DD Mon), class slot name, rate. Scale line appended last if applicable.
6. Invoice numbers are sequential integers, zero-padded to 4 digits (INV-0001). Counter lives in Settings. Increment on generation. Never reset. Never reused even if invoice is deleted.
7. Sedgefield group attendance: clients book via WhatsApp poll (external, not in this app). Barbara logs attendance manually after the fact. The app must make this fast — tap class, see client list, tick who attended. No client self-entry in Phase 1.

VIEWS

Dashboard

• Shows current week’s sessions, pre-populated from recurring schedules. Sessions are sorted chronologically, sessions that are in the past are hidden by default, the next session after right now will be the starting point
• Each entry shows: client name, class slot name, date, status (attended default)
• One-tap to mark absent
• Button to add an ad-hoc session

Clients

• List of all clients
• Add / edit / archive (not delete — preserve invoice history)
• Client card fields: name, location, service type, rate, scale toggle, recurring schedule

Class Slots

• List of named slots
• Add / edit / remove
• Fields: name, location, day, time

Session Log

• Full history
• Filterable by: month, client, location
• Edit or remove individual entries

Invoices

• Select client + month → preview → generate
• Generated invoice is print-clean (nav and controls hidden via print CSS)
• PDF via browser print
• Invoice shows: studio name, banking details, invoice number, issue date, client name, month, line items, total, payment instruction

Robin Ledger

• Select month → shows list of Knysna sessions that month, client per row, R40 per unique (date, time) session, total at bottom. So if Jane and Bob were both in a class together, 
• Read-only. No invoicing — this is Barbara’s reference only.

Settings

• Studio name
• Banking details
• Invoice number counter (visible, editable only to correct errors)

TECH REQUIREMENTS

• Single deployable web app, mobile-first
• Supabase for persistence
• No data should be lost if Barbara closes the app mid-session
• Print CSS: invoice view only, all chrome hidden
• Phase 2 readiness: auth layer, client-facing booking view, and session confirmation flow should be architecturally possible without rewriting the data model

WHAT CARL DECIDES

• Stack and framework
• Whether Phase 2 backend is built now (stub) or later (migration)
• Hosting approach
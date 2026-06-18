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

ClassInstance

id 
ClassSlotId
date
time
location
capacity


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
classInstanceId string → ClassSlot.id
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

1. On app open, generate classInstance and session entries for the current week for all clients where recurring !== null. Default status = attended. Barbara only acts if someone was absent.
2. A session entry must not be duplicated if it already exists for that client + classInstance + date. A classInstance should not be duplicated if it already exists for that classSlot + date

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


TECH REQUIREMENTS

• Single deployable web app, mobile-first.
• Supabase for persistence
• No data should be lost if Barbara closes the app mid-session
• Print CSS: invoice view only, all chrome hidden
• Phase 2 readiness: auth layer, client-facing booking view, and session confirmation flow should be architecturally possible without rewriting the data model

WHAT CARL DECIDES

• Stack and framework
• Whether Phase 2 backend is built now (stub) or later (migration)
• Hosting approach
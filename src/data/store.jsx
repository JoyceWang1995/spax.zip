import { createContext, useContext, useMemo, useReducer, useState, useCallback, useEffect } from 'react'
import { img } from './assets'

/* ───────────────────────── Seed data ───────────────────────── */

export const STAFF = [
  { id: 'elena', name: 'Elena J.', role: 'Lead Therapist', status: 'available', note: 'Available until 12:30', photo: img.staff.elena },
  { id: 'lisa', name: 'Lisa W.', role: 'Therapist', status: 'busy', note: 'TR-04 · until 12:15', photo: img.staff.lisa },
  { id: 'marcus', name: 'Marcus A.', role: 'Facial Therapist', status: 'break', note: 'Break · until 12:20', photo: img.staff.marcus },
  { id: 'sofia', name: 'Sofia M.', role: 'Therapist', status: 'available', note: 'Available until 13:30', photo: img.staff.sofia },
  { id: 'daniel', name: 'Daniel R.', role: 'Therapist', status: 'busy', note: 'TR-01 · until 12:45', photo: img.staff.daniel },
  { id: 'maya', name: 'Maya L.', role: 'Therapist', status: 'available', note: 'Available until 13:00', photo: img.staff.maya },
  { id: 'amara', name: 'Amara K.', role: 'Pedicure Spec', status: 'break', note: 'Break · until 12:50', photo: img.staff.amara },
  { id: 'lucas', name: 'Lucas T.', role: 'Massage Spec', status: 'available', note: 'Available until 13:00', photo: img.staff.lucas },
  { id: 'chloe', name: 'Chloe S.', role: 'Facial Therapist', status: 'busy', note: 'TR-05 · until 13:15', photo: img.staff.chloe },
  // the signed-in staff member (not shown in the manager's 3×3 grid)
  { id: 'amy', name: 'Amy M.', role: 'Therapist', status: 'available', note: 'On shift until 17:00', photo: img.meStaff, self: true },
]
export const staffById = Object.fromEntries(STAFF.map(s => [s.id, s]))

const SOP_PREP = [
  { title: 'Pre-shift PPE & area clear', body: 'Put on gloves and apron. Clear the treatment area of personal items and the previous guest’s linen.' },
  { title: 'Prepare treatment products', body: 'Check and prepare the products required for this booking.',
    ai: [
      ['Match the booking', 'Use the product list and quantities specified in the treatment protocol.'],
      ['Check each product', 'Confirm sufficient quantity, valid expiry dates, and any recorded guest restrictions.'],
    ] },
  { title: 'Linen & equipment changeover', body: 'Fresh couch roll, towels and blanket. Warm the bed to 32°C and check the steamer is filled.' },
  { title: 'Floor & air sanitation', body: 'Mop with the blue-coded mop and run the air purifier on boost for 5 minutes.' },
  { title: 'Room reset & compliance log', body: 'Set lighting to scene 2, start the playlist, then sign the compliance log on this screen.' },
]
const GENERIC_STEPS = (t) => [
  { title: 'Check brief', body: `Read the notes for “${t}” and confirm the location.` },
  { title: 'Carry out task', body: 'Follow the SOP for this area. Photograph anything unusual.' },
  { title: 'Sign off', body: 'Mark complete and leave a voice note if a follow-up is needed.' },
]

const KIT_FACIAL = {
  name: 'Facial Treatment Kit',
  items: [
    { name: 'Dynamic Resurfacing Facial Wash', qty: '1 × 200ml', img: img.products.cleanser },
    { name: 'Pro-Collagen Marine Cream', qty: '1 × 50ml', img: img.products.cream },
    { name: 'Dynamic Resurfacing Facial Pads', qty: '3 pads', img: img.products.pads },
    { name: 'Pro-Collagen Future Restore Eye Serum', qty: '1 × 15ml', img: img.products.eyeSerum },
  ],
}

// status: overdue | pending | soon | progress | done
const TASKS = [
  { id: 't-meeting', title: 'Daily Meeting', due: '09:30', repeat: 'Everyday', location: 'Office', room: null, status: 'overdue', people: ['elena', 'lisa', 'marcus', 'amy'] },
  { id: 't-heater', title: 'Refill Heater', due: '10:30', location: 'Thermal suite', room: 'thermal', status: 'overdue', people: ['amy'] },
  { id: 't-prep', title: 'Treatment prep', sopTitle: 'Treatment Preparation', due: '11:30', repeat: 'Every Friday', location: 'Treatment Room 2', room: 'tr2', status: 'pending', people: ['daniel', 'amy'],
    booking: 'Facial Rejuvenation · 10:00–11:00', steps: SOP_PREP, kit: KIT_FACIAL, step: 1 },
  { id: 't-restock', title: 'Restock Products', due: '13:00', repeat: 'Every Tuesday', location: 'Lounge', room: null, status: 'soon', people: ['lucas', 'amy'] },
  { id: 't-sheet', title: 'Fill In Sheet', due: '13:30', location: 'Staff room', room: 'boh', status: 'progress', people: ['amy'] },
  { id: 't-towels', title: 'Restock towels', due: '9:00', repeat: 'Every Friday', location: 'Treatment Room 1', room: 'tr1', status: 'done', people: ['sofia'] },
  { id: 't-retail', title: 'Restock retail', due: '10:00', location: 'Reception', room: 'reception', status: 'progress', people: ['elena'] },
  { id: 't-vip', title: 'Greet VIP arrival', due: '09:30', location: 'Reception', room: 'reception', status: 'done', people: ['amy'] },
  { id: 't-fridge', title: 'Restock fridge', due: '10:00', location: 'Cafe', room: 'cafe', status: 'progress', people: ['maya'] },
  { id: 't-tr2-clean', title: 'Deep clean floor', due: '09:00', location: 'Treatment Room 2', room: 'tr2', status: 'overdue', people: ['lisa'] },
  { id: 't-tr2-san', title: 'Room Sanitization', due: '11:30', location: 'Treatment Room 2', room: 'tr2', status: 'pending', people: ['amy', 'elena'] },
  { id: 't-tr3-org', title: 'Organise products', due: '10:00', location: 'Treatment Room 3', room: 'tr3', status: 'progress', people: ['elena'] },
  { id: 't-tr3-post', title: 'Post treatment change', due: '10:00', location: 'Treatment Room 3', room: 'tr3', status: 'pending', people: ['elena'] },
  { id: 't-gym-clean', title: 'Deep clean floor', due: '09:00', location: 'Gym', room: 'gym', status: 'overdue', people: ['lisa'] },
  { id: 't-gym-fix', title: 'Equipment fix', due: '10:00', location: 'Gym', room: 'gym', status: 'soon', people: ['elena'] },
  { id: 't-pool', title: 'Poolside clean', due: '10:03', location: 'Hydro pool', room: 'hydro', status: 'overdue', people: ['lisa', 'lucas'] },
  { id: 't-sauna', title: 'Sauna check', due: '10:15', location: 'Thermal suite', room: 'thermal', status: 'overdue', people: ['daniel'] },
  { id: 't-lounger', title: 'Fresh towels on loungers', due: '11:00', location: 'Hydro pool', room: 'hydro', status: 'soon', people: ['maya'] },
  { id: 't-laundry', title: 'Laundry run', due: '12:00', location: 'Staff room', room: 'boh', status: 'pending', people: ['amara'] },
  // pending assignment — no owner yet (the "7 tasks pending assignment" notification)
  { id: 't-u1', title: 'Steam room descale', due: '12:30', location: 'Steam room', room: 'steam', status: 'pending', people: [] },
  { id: 't-u2', title: 'Pool chemical check', due: '12:00', location: 'Hydro pool', room: 'hydro', status: 'pending', people: [] },
  { id: 't-u3', title: 'Reception flower refresh', due: '13:00', location: 'Reception', room: 'reception', status: 'pending', people: [] },
  { id: 't-u4', title: 'Mirror & glass clean', due: '14:00', location: 'Gym', room: 'gym', status: 'pending', people: [] },
  { id: 't-u5', title: 'Robe & slipper restock', due: '12:45', location: 'Linen store', room: 'linen', status: 'pending', people: [] },
  { id: 't-u6', title: 'Treatment couch check', due: '13:30', location: 'Treatment Room 4', room: 'tr4', status: 'pending', people: [] },
  { id: 't-u7', title: 'Lounger cushions out', due: '12:15', location: 'Hydro pool', room: 'hydro', status: 'pending', people: [] },
].map(t => ({ steps: GENERIC_STEPS(t.title), step: 0, ...t }))

// LG rooms are blocks on the Map page's customisable plan: `block` = grid cell (c, r) and size (w, h) on a 6 × 4 grid.
// `stock` = RFID-tagged items in the room: [count, par] for stocked items, plain counts for tagged people/equipment.
const ROOMS = [
  { id: 'reception', name: 'Reception', type: 'reception', floor: 'LG', people: ['elena', 'amara', 'sofia'], block: { c: 0, r: 0, w: 2, h: 1 },
    stock: { products: [18, 30], guests: 6 } },
  { id: 'relax', name: 'Relaxation lounge', type: 'wellness', floor: 'LG', people: ['sofia', 'maya'], block: { c: 2, r: 0, w: 2, h: 1 },
    stock: { towels: [14, 20], robes: [10, 16], guests: 9 } },
  { id: 'gym', name: 'Gym', type: 'fitness', floor: 'LG', people: ['lucas', 'daniel', 'marcus', 'lisa'], block: { c: 4, r: 0, w: 2, h: 1 },
    stock: { towels: [12, 20], equipment: 9, guests: 5 } },
  { id: 'tr1', name: 'Treatment Room 1', type: 'treatment', floor: 'LG', mode: 'inuse', booking: '09:30–10:30 · Deep Tissue · 60mins', therapist: 'Sarah M.', guest: 'sofia',
    block: { c: 0, r: 1, w: 1, h: 1 }, stock: { towels: [4, 6], products: [6, 8], guests: 1 } },
  { id: 'tr2', name: 'Treatment Room 2', type: 'treatment', floor: 'LG', people: ['daniel', 'elena'], block: { c: 1, r: 1, w: 1, h: 1 },
    stock: { towels: [4, 6], products: [2, 8] } },
  { id: 'tr3', name: 'Treatment Room 3', type: 'treatment', floor: 'LG', people: ['marcus', 'elena'], block: { c: 2, r: 1, w: 1, h: 1 },
    stock: { towels: [4, 6], products: [6, 8] } },
  { id: 'hydro', name: 'Hydro pool', type: 'wellness', floor: 'LG', people: ['lisa', 'lucas'], block: { c: 3, r: 1, w: 2, h: 2 },
    stock: { towels: [20, 20], guests: 7, equipment: 2 } },
  { id: 'tr4', name: 'Treatment Room 4', type: 'treatment', floor: 'LG', mode: 'ready', booking: '11:30–12:00 · Cryo · 30mins', sanitized: '09:15 AM', therapist: 'James K.', guest: 'lucas',
    block: { c: 5, r: 1, w: 1, h: 1 }, stock: { towels: [5, 6], products: [7, 8] } },
  { id: 'thermal', name: 'Thermal suite', type: 'wellness', floor: 'LG', mode: 'zone', block: { c: 0, r: 2, w: 2, h: 1 },
    stock: { towels: [18, 60], robes: [12, 20], guests: 11 },
    zones: [{ name: 'Sauna', count: 4, alert: true, people: ['lisa', 'maya', 'daniel'] }, { name: 'Steam', done: true, people: ['sofia', 'lucas', 'chloe'] }, { name: 'Vitality Pool', count: 3 }, { name: 'Changing Room', count: 4 }] },
  { id: 'steam', name: 'Steam room', type: 'wellness', floor: 'LG', people: [], block: { c: 2, r: 2, w: 1, h: 1 }, stock: { towels: [8, 12], guests: 3 } },
  { id: 'ice', name: 'Ice fountain', type: 'wellness', floor: 'LG', people: [], block: { c: 5, r: 2, w: 1, h: 1 }, stock: { towels: [6, 10], equipment: 1 } },
  { id: 'cafe', name: 'Spa café', type: 'reception', floor: 'LG', people: ['maya', 'lucas', 'chloe'], block: { c: 0, r: 3, w: 2, h: 1 },
    stock: { towels: [24, 30], products: [20, 30], guests: 6 } },
  { id: 'linen', name: 'Linen store', type: 'boh', floor: 'LG', people: ['amara'], block: { c: 2, r: 3, w: 1, h: 1 }, stock: { towels: [96, 120], robes: [61, 80] } },
  { id: 'retail', name: 'Retail', type: 'reception', floor: 'LG', people: ['amara'], block: { c: 3, r: 3, w: 1, h: 1 }, stock: { products: [64, 80] } },
  { id: 'boh', name: 'Staff room', type: 'boh', floor: 'LG', people: ['amara', 'amy'], block: { c: 4, r: 3, w: 1, h: 1 }, stock: { equipment: 4 } },
  { id: 'tr5', name: 'Treatment Room 5', type: 'treatment', floor: 'L1', mode: 'inuse', booking: '10:00–11:00 · Cryotherapy · 60mins', therapist: 'Chloe S.' },
  { id: 'tr6', name: 'Treatment Room 6', type: 'treatment', floor: 'L1', mode: 'ready', booking: '12:00–13:00 · Hot Stone · 60mins', sanitized: '10:40 AM', therapist: 'Lucas T.' },
  { id: 'tr7', name: 'Treatment Room 7', type: 'treatment', floor: 'L1', mode: 'ready', booking: '13:00–14:00 · Swedish · 60mins', sanitized: '09:50 AM', therapist: 'Maya L.' },
  { id: 'nails', name: 'Nail Studio', type: 'wellness', floor: 'L1', people: ['amara'] },
  { id: 'relax', name: 'Relaxation Lounge', type: 'wellness', floor: 'L2', people: ['sofia', 'maya'] },
  { id: 'roof', name: 'Rooftop Pool', type: 'fitness', floor: 'L2', mode: 'ready', booking: 'Open · 07:00–21:00', sanitized: '08:00 AM', therapist: 'Lifeguard on duty' },
]

export const BOOKINGS = [
  { time: '09:00', guest: 'Sarah M.', treatment: 'Deep Tissue', room: 'TR-02', status: 'done' },
  { time: '10:30', guest: 'Emma R.', treatment: 'Cryotherapy', room: 'TR-05', status: 'treatment' },
  { time: '12:00', guest: 'James K.', treatment: 'Hot Stone', room: 'TR-04', status: 'ready' },
  { time: '15:30', guest: 'Tom W.', treatment: 'Couple’s Ritual', room: 'TR-02', status: 'assigned' },
  { time: '16:00', guest: 'Jade W.', treatment: 'Facial Ritual', room: 'TR-03', status: 'unassigned' },
  { time: '16:30', guest: 'Isla B.', treatment: 'Prenatal Massage', room: 'TR-06', status: 'unassigned' },
  { time: '17:00', guest: 'Leo G.', treatment: 'Hydrating Facial', room: 'TR-07', status: 'unassigned' },
]

// Schedule grid: TR01..TR07 × 09:00..15:00.  state: past | assigned | open
export const SCHEDULE_ROOMS = ['TR01', 'TR02', 'TR03', 'TR04', 'TR05', 'TR06', 'TR07']
export const SCHEDULE_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']
// Booking states — the calendar colours and the left-hand counters all derive from these:
//   past     = finished (faded)
//   ai       = assigned automatically by the AI — no manager needed (lighter, faded cell)
//   manual   = needs a manager to assign a therapist (light blue, same colour as the "manual assign" card)
//   assigned = assigned by a manager — no longer needs anything (lighter, faded cell)
// due = needs assigning now (teal dot); otherwise pending (orange dot)
const S = (guest, treatment, state, therapist = null, due = false) => ({ guest, treatment, state, therapist, due })
const SCHEDULE_SEED = {
  '09:00': [S('Olivia P.', 'Deep Tissue Massage', 'past', 'sofia'), S('Sarah M.', 'Deep Tissue', 'past', 'lisa'), null, S('Nathan B.', 'Back, Neck & Shoulder', 'past', 'daniel'), S('Oliver T.', 'Signature Body Scrub', 'past', 'amara'), S('Amelia R.', 'Relaxation Massage', 'past', 'maya'), null],
  '10:00': [S('Mark R.', 'Sports Recovery', 'manual', null, true), null, S('Grace W.', 'Facial Rejuvenation', 'manual'), null, null, null, S('Leo G.', 'Hydrating Facial', 'ai', 'chloe')],
  '11:00': [S('Lisa W.', 'Diagnostics', 'manual'), S('Sophie L.', 'Aromatherapy Massage', 'manual'), null, S('James K.', 'Hot Stone', 'manual', null, true), null, S('Hannah K.', 'Cryotherapy', 'ai', 'elena'), null],
  '12:00': [null, null, S('Tom W.', 'Couple’s Ritual', 'ai', 'daniel'), null, S('Emma R.', 'Cryotherapy', 'manual'), null, S('Isla B.', 'Prenatal Massage', 'manual')],
  '13:00': [S('Daniel H.', 'Hot Stone Therapy', 'ai', 'lucas'), null, null, null, null, S('Ava M.', 'Hot Stone Therapy', 'ai', 'daniel'), S('Chloe S.', 'Couple’s Ritual', 'manual')],
  '14:00': [S('Jade W.', 'Couple’s Ritual', 'manual'), null, S('Ruby H.', 'Facial', 'manual'), null, null, S('Emily C.', 'Swedish Massage', 'ai', 'sofia'), S('Noah C.', 'Swedish Massage', 'ai', 'maya')],
  '15:00': [null, null, null, null, S('Leo G.', 'Prenatal Massage', 'manual'), null, null],
}

/** Counts shown around the calendar — always computed from the calendar itself */
export function scheduleStats(schedule) {
  const cells = Object.values(schedule).flat().filter(Boolean)
  const c = { bookings: cells.length, past: 0, ai: 0, manual: 0, assigned: 0 }
  cells.forEach(x => { c[x.state]++ })
  c.triggered = c.bookings * 4 // each booking triggers prep, product check, greeting and reset tasks
  c.handled = c.bookings - c.manual // everything that isn't light blue
  return c
}

const SKILLS = [
  [/facial|rejuvenation|hydrating/i, ['marcus', 'chloe']],
  [/prenatal/i, ['maya', 'sofia']],
  [/cryo|diagnostic/i, ['elena', 'chloe']],
  [/hot stone|sports/i, ['lucas', 'daniel']],
  [/couple/i, ['daniel', 'sofia', 'lucas']],
  [/massage|aromatherapy|swedish|tissue|scrub/i, ['sofia', 'lucas', 'daniel', 'maya']],
]
/** Therapists for a booking, best first: trained for the treatment and not already booked that hour */
export function therapistOptions(schedule, hour, roomIdx, treatment) {
  const cell = schedule[hour][roomIdx]
  const skilled = (SKILLS.find(([re]) => re.test(treatment || cell?.treatment || '')) || [null, []])[1]
  const busyThatHour = schedule[hour].filter((c, i) => c && i !== roomIdx).map(c => c.therapist)
  const pool = ['elena', 'lisa', 'marcus', 'sofia', 'daniel', 'maya', 'amara', 'lucas', 'chloe']
  const rank = id => (skilled.includes(id) ? skilled.indexOf(id) : 99)
  return pool.map(id => ({
    id, skilled: skilled.includes(id), free: !busyThatHour.includes(id),
  })).sort((a, b) => (b.skilled && b.free) - (a.skilled && a.free) || b.free - a.free || rank(a.id) - rank(b.id))
}

export const TRAINING = [
  { id: 'gdpr', title: 'GDPR & Client Privacy', cat: 'Operations & Compliance', group: 'Hospitality', mins: 15, kind: 'Selective', image: null, progress: 0.4 },
  { id: 'deep', title: 'Deep Tissue Massage Protocol', cat: 'Therapy Tech', group: 'Therapy tech', mins: 25, kind: 'Mandatory', image: img.training.deep, progress: 0.8 },
  { id: 'scent', title: 'Signature Scent Compounding', cat: 'Product Mastery', group: 'Therapy tech', mins: 15, kind: 'Selective', image: img.training.scent, progress: 0 },
  { id: 'setup', title: 'Treatment Room Setup Standards', cat: 'Operations & Compliance', group: 'Sanitisation', mins: 20, kind: 'Mandatory', image: img.training.setup, progress: 0.2 },
  { id: 'stone', title: 'Hot Stone Placement Guide', cat: 'Therapy Tech', group: 'Therapy tech', mins: 20, kind: 'Selective', image: img.training.stone, progress: 1 },
  { id: 'cryo', title: 'Cryotherapy Equipment', cat: 'Equipment', group: 'Sanitisation', mins: 12, kind: 'Selective', image: null, progress: 0, liked: true },
  { id: 'arrival', title: 'The Arrival Ritual SOP', cat: 'Dermotology', group: 'Hospitality', mins: 25, kind: 'Selective', image: img.training.arrival, progress: 0.5 },
  { id: 'sound', title: 'Sound Bath Essentials', cat: 'Wellness', group: 'Therapy tech', mins: 18, kind: 'Mandatory', image: img.training.sound, progress: 0,
    desc: 'Understand the principles of sound therapy and how to deliver calming, restorative sound journeys.' },
  { id: 'quiz-coshh', title: 'COSHH Quick Quiz', cat: 'Compliance Quiz', group: 'Quiz', mins: 5, kind: 'Mandatory', image: null, progress: 0 },
  { id: 'linen', title: 'Linen Handling & Laundry', cat: 'Operations', group: 'Sanitisation', mins: 10, kind: 'Selective', image: img.training.setup, progress: 0 },
]

// Notes pinned on the plan, inside a block (fx, fy = 0…1 across the block). New notes are dropped by tapping a block.
const NOTES = [
  { id: 'n1', kind: 'photo', title: 'Plant Room Report', count: 4, by: 'marcus', where: 'Staff room', room: 'boh', when: '16th Nov 2026', fx: 0.3, fy: 0.64, photo: img.plantRoom },
  { id: 'v1', kind: 'voice', title: 'Changing room drain slow', len: '0:19', by: 'lisa', where: 'Thermal suite', room: 'thermal', when: 'today 09:12', fx: 0.42, fy: 0.62, wave: true },
  { id: 'v2', kind: 'voice', title: 'Hydro jets weak', len: '0:05', by: 'marcus', where: 'Hydro pool', room: 'hydro', when: 'today 09:40', fx: 0.08, fy: 0.62 },
  { id: 'v3', kind: 'voice', title: 'Café fridge noisy', len: '0:05', by: 'elena', where: 'Spa café', room: 'cafe', when: 'today 10:02', fx: 0.42, fy: 0.62 },
]

// Where each staff member is right now: the block they're in, and where inside it
export const STAFF_PINS = [
  { staff: 'elena', room: 'relax', fx: 0.86, fy: 0.4 }, { staff: 'lisa', room: 'tr1', fx: 0.8, fy: 0.36 },
  { staff: 'marcus', room: 'tr3', fx: 0.8, fy: 0.36 }, { staff: 'daniel', room: 'thermal', fx: 0.86, fy: 0.42 },
  { staff: 'sofia', room: 'hydro', fx: 0.66, fy: 0.62 }, { staff: 'maya', room: 'cafe', fx: 0.86, fy: 0.42 },
  { staff: 'lucas', room: 'retail', fx: 0.8, fy: 0.36 }, { staff: 'chloe', room: 'boh', fx: 0.8, fy: 0.36 },
]

// Plan grid used by the Map page and by new rooms
export const PLAN_COLS = 6, PLAN_ROWS = 4
const overlaps = (a, b) => a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h
export function blockFits(rooms, blk, ignoreId) {
  if (blk.c < 0 || blk.r < 0 || blk.c + blk.w > PLAN_COLS || blk.r + blk.h > PLAN_ROWS) return false
  return !rooms.some(r => r.id !== ignoreId && r.floor === 'LG' && r.block && overlaps(r.block, blk))
}
export function freeCell(rooms, w = 1, h = 1) {
  for (let r = 0; r < PLAN_ROWS; r++) for (let c = 0; c < PLAN_COLS; c++) {
    const b = { c, r, w, h }
    if (blockFits(rooms, b)) return b
  }
  return null
}

// AI task templates per room type, used when a manager drags a staff member onto a room
export const TEMPLATES = {
  reception: [
    { title: 'Restock retail', duration: 15, steps: ['Check stock levels', 'Refill retail display', 'Record missing products'] },
    { title: 'Greet VIP arrival', duration: 10, steps: ['Check guest notes & preferences', 'Prepare welcome drink', 'Escort guest to changing rooms'] },
    { title: 'Desk reset', duration: 10, steps: ['Clear desk and wipe surfaces', 'Restock brochures and pens', 'Check card machine'] },
  ],
  treatment: [
    { title: 'Room sanitisation', duration: 20, steps: ['Strip used linen', 'Sanitise couch and surfaces', 'Mop floor', 'Sign compliance log'] },
    { title: 'Post treatment change', duration: 15, steps: ['Fresh couch roll and towels', 'Reset products to tray', 'Reset lighting and music'] },
    { title: 'Organise products', duration: 10, steps: ['Check expiry dates', 'Restock trolley to par', 'Record low items'] },
  ],
  fitness: [
    { title: 'Deep clean floor', duration: 30, steps: ['Clear mats and weights', 'Vacuum and mop floor', 'Wipe down machines'] },
    { title: 'Equipment check', duration: 15, steps: ['Test each machine', 'Tag faulty equipment', 'Log issues with maintenance'] },
  ],
  wellness: [
    { title: 'Poolside clean', duration: 20, steps: ['Collect used towels', 'Hose and squeegee deck', 'Check water clarity and temperature'] },
    { title: 'Sauna check', duration: 10, steps: ['Check temperature and stones', 'Refill water bucket', 'Wipe benches'] },
    { title: 'Fresh towels', duration: 10, steps: ['Collect used towels', 'Lay fresh towels on loungers', 'Restock towel station'] },
  ],
  boh: [
    { title: 'Laundry run', duration: 20, steps: ['Collect linen bags', 'Load and log machines', 'Fold and shelve clean linen'] },
    { title: 'Fill in sheet', duration: 10, steps: ['Complete daily checklist', 'Note any incidents', 'Sign and file'] },
  ],
}

export const fmtTime = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/* ───────────────────────── Reducer ───────────────────────── */

function reducer(state, action) {
  switch (action.type) {
    case 'completeStep': {
      return {
        ...state,
        tasks: state.tasks.map(t => {
          if (t.id !== action.id) return t
          const step = Math.min(t.step + 1, t.steps.length)
          const status = step >= t.steps.length ? 'done' : (t.status === 'pending' || t.status === 'soon' ? 'progress' : t.status)
          return { ...t, step, status }
        }),
      }
    }
    case 'setStep':
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, step: action.step } : t) }
    case 'setTaskStatus':
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, status: action.status, step: action.status === 'done' ? t.steps.length : t.step } : t) }
    case 'addTask':
      return { ...state, lastTask: action.task.id, tasks: [...state.tasks, { steps: GENERIC_STEPS(action.task.title), step: 0, people: [], ...action.task }] }
    case 'updateTask':
      return { ...state, lastTask: action.task.id, tasks: state.tasks.map(t => {
        if (t.id !== action.task.id) return t
        const next = { ...t, ...action.task }
        const n = next.steps.length
        // completed → every step ticked; re-opened → back to the first unticked step
        next.step = next.status === 'done' ? n : Math.min(t.status === 'done' ? 0 : t.step, n - 1)
        return next
      }) }
    case 'deleteTask':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) }
    case 'addRoom': {
      const room = { people: [], stock: {}, ...action.room }
      if (room.floor === 'LG' && !room.block) room.block = freeCell(state.rooms) || undefined
      return { ...state, rooms: [...state.rooms, room] }
    }
    case 'updateRoom':
      return { ...state, rooms: state.rooms.map(r => r.id === action.room.id ? { ...r, ...action.room } : r) }
    case 'removeRoom':
      return { ...state, rooms: state.rooms.filter(r => r.id !== action.id), notes: state.notes.filter(n => n.room !== action.id) }
    case 'addBlock':
      return { ...state, blocks: [...state.blocks, action.block] }
    case 'removeBlock':
      return { ...state, blocks: state.blocks.filter(b => b.id !== action.id) }
    case 'assignBooking': {
      const { hour, room, therapist, by = 'assigned' } = action
      return { ...state, schedule: { ...state.schedule, [hour]: state.schedule[hour].map((c, i) => i === room ? { ...c, state: by, therapist } : c) } }
    }
    case 'addBooking': {
      const { hour, room, booking } = action
      return { ...state, schedule: { ...state.schedule, [hour]: state.schedule[hour].map((c, i) => i === room ? booking : c) } }
    }
    case 'autoAssignAll': {
      // AI assigns every booking still waiting for a manager, one hour at a time so nobody is double-booked
      const next = {}
      for (const h of Object.keys(state.schedule)) {
        let row = state.schedule[h]
        row.forEach((c, i) => {
          if (c?.state !== 'manual') return
          const pick = therapistOptions({ ...state.schedule, [h]: row }, h, i)[0]
          row = row.map((x, j) => j === i ? { ...x, state: 'ai', therapist: pick.id } : x)
        })
        next[h] = row
      }
      return { ...state, schedule: next }
    }
    case 'addNote':
      return { ...state, notes: [action.note, ...state.notes] }
    case 'toggleLike':
      return { ...state, liked: { ...state.liked, [action.id]: !state.liked[action.id] } }
    default:
      return state
  }
}

const initial = {
  tasks: TASKS,
  rooms: ROOMS,
  blocks: [],
  schedule: SCHEDULE_SEED,
  notes: NOTES,
  liked: { cryo: true },
}

/* ───────────────────────── Context ───────────────────────── */

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [toast, setToast] = useState(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [night, setNight] = useState(false)
  const [nowPlaying, setNowPlaying] = useState({ title: 'Facial treatment', secs: 623, playing: true })

  const notify = useCallback((msg) => {
    setToast({ msg, key: Math.random() })
  }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // tick the "now playing" treatment timer
  useEffect(() => {
    if (!nowPlaying?.playing) return
    const t = setInterval(() => setNowPlaying(n => n && ({ ...n, secs: n.secs + 1 })), 1000)
    return () => clearInterval(t)
  }, [nowPlaying?.playing])

  const value = useMemo(() => ({
    ...state, dispatch, toast, notify,
    assistantOpen, setAssistantOpen, assignOpen, setAssignOpen, searchOpen, setSearchOpen,
    night, setNight, nowPlaying, setNowPlaying,
  }), [state, toast, notify, assistantOpen, assignOpen, searchOpen, night, nowPlaying])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

/* ───────────────────────── Helpers ───────────────────────── */

// The five task statuses, used everywhere a task appears (room cards, map, task list, editor)
export const TASK_STATUS = {
  pending: { label: 'Pending', caps: 'PENDING', color: '#5c6a6d', chip: '#e1e7e7' },     // darker grey
  progress: { label: 'In progress', caps: 'IN PROGRESS', color: '#12846f', chip: '#bfdad8' }, // green
  soon: { label: 'Due soon', caps: 'DUE SOON', color: '#d29a12', chip: '#f1e5c2' },       // yellow
  overdue: { label: 'Overdue', caps: 'OVERDUE', color: '#d8432f', chip: '#f6dcd3' },      // red
  done: { label: 'Completed', caps: 'COMPLETED', color: '#a9b4b5', chip: '#eef2f2' },     // grey
}
export const STATUS_ORDER = ['pending', 'progress', 'soon', 'overdue', 'done']

export function taskStats(tasks) {
  const c = { all: tasks.length, overdue: 0, soon: 0, progress: 0, pending: 0, done: 0 }
  tasks.forEach(t => { c[t.status]++ })
  c.pct = Math.round((c.done / Math.max(1, c.all)) * 100)
  return c
}

export function roomSummary(room, tasks) {
  const list = tasks.filter(t => t.room === room.id)
  const overdue = list.filter(t => t.status === 'overdue').length
  const progress = list.filter(t => t.status === 'progress').length
  return { list, overdue, progress, total: list.length }
}

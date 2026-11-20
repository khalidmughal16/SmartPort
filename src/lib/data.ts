export type Role = 'A' | 'G' | 'Y' | 'D' | 'B' | 'C'

export const R: Record<Role, string> = {
  A: 'Admin', G: 'Gate Officer', Y: 'Yard Supervisor', D: 'Documentation Clerk', B: 'Billing Clerk', C: 'Client',
}
export const RD: Record<Role, string> = {
  A: 'The complete picture. Every operation under control.',
  G: 'Smooth arrivals. Safe releases. A gate that flows.',
  Y: 'The right slot. The right move. Every time.',
  D: 'Clear documents. Clear cargo. No loose ends.',
  B: 'Accurate charges. Settled dues. Confident releases.',
  C: 'Track your containers, book gate slots and pay dues online.',
}
/** SVG path data for each role icon (24x24 viewBox). */
export const IC: Record<Role, string> = {
  A: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4',
  G: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14M19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  Y: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12M3.29 7 12 12l8.71-5M7.5 4.27l9 5.15',
  D: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7zM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8',
  B: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11',
  C: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
}

export interface PageDef { id: string; label: string; group: string; roles: string; desc: string }
const rows: [string, string, string, string, string][] = [
  ['overview', 'Overview', 'Client', 'C', 'Your containers at a glance'],
  ['shipments', 'My Shipments', 'Client', 'C', 'Track every container you own'],
  ['book-slot', 'Book a Slot', 'Client', 'C', 'Reserve a gate time for pickup or drop-off'],
  ['my-billing', 'My Billing', 'Client', 'C', 'Dues, payments and release'],
  ['dashboard', 'Dashboard', 'Operations', 'AGYDB', 'Your terminal, at a glance'],
  ['yard-map', 'Yard Map', 'Operations', 'AY', 'A live view of every stack'],
  ['containers', 'Containers', 'Operations', 'AGY', 'Track inventory and movements'],
  ['vessels', 'Inbound Vessels', 'Operations', 'AGY', 'Arrivals, schedules and manifests'],
  ['gate-in', 'Gate-In', 'Gate', 'AG', 'Check in trucks and cargo'],
  ['appointments', 'Appointments', 'Gate', 'AG', 'Keep the gate moving'],
  ['placement', 'Placement', 'Yard', 'AY', 'Put every container in its place'],
  ['crane-tasks', 'Crane Tasks', 'Yard', 'AY', 'Prioritise your next move'],
  ['router', 'A* Router', 'Yard', 'AY', 'Find the shortest clear path'],
  ['customs-billing', 'Customs and Billing', 'Finance', 'ADB', 'Clear documents, dues and release'],
  ['reports', 'Reports', 'Finance', 'AB', 'Turn terminal data into decisions'],
  ['users', 'Users and Settings', 'Admin', 'A', 'People, permissions and preferences'],
  ['profile', 'Profile', 'Admin', 'AGYDBC', 'Your terminal identity'],
]
export const P: PageDef[] = rows.map(([id, label, group, roles, desc]) => ({ id, label, group, roles, desc }))
export const staffPages = P.filter((p) => p.roles !== 'C')
export const pagesFor = (r: Role) => P.filter((p) => p.roles.includes(r))
export const homeOf = (r: Role) => (r === 'C' ? 'overview' : 'dashboard')

export interface Container {
  id: string; d: number; cus: 'Hold' | 'Cleared'; paid: boolean; zone: string; st: string; slot: string; bk?: boolean
}
export interface Booking { id: string; t: string; d: string; s: string }
export interface User {
  n: string; e: string; p: string; r: Role; sg?: 1; watch?: string[]; slots?: Booking[]; co?: string
}

// Deterministic generator: keeps the sample data identical on every load.
let seed = 11
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647

export const initialContainers = (): Container[] =>
  Array.from({ length: 14 }, (_, i) => {
    const d = 1 + Math.floor(rnd() * 9)
    return {
      id: 'GMT-' + String(i + 17).padStart(4, '0'), d, cus: rnd() > 0.6 ? 'Hold' : 'Cleared', paid: false,
      zone: i % 7 === 0 ? 'Hazard' : 'Standard', st: 'In yard',
      slot: 'B' + (1 + (i % 4)) + '-R' + (1 + (i % 3)) + '-T' + (1 + (i % 4)),
    }
  })
export const initialYard = (): number[][] => [[9, 5, 3], [7, 2], [8, 6, 4, 2], [3], [9, 7, 6], [5, 4], [8], [6, 3, 2]]
export const initialTasks = (): [string, number][] => [
  ['Lift GMT-0017 to truck T-88', 3], ['Restack bay 3 (blockers)', 5], ['Move reefer GMT-0021 to cold zone', 4], ['Load GMT-0031', 2],
]
export const initialSlots = (): [string, number][] => [
  ['08:00', 3], ['09:00', 3], ['10:00', 1], ['11:00', 3], ['12:00', 2], ['13:00', 0], ['14:00', 3], ['15:00', 1],
]
export const DEMO_USERS: User[] = [
  { n: 'Demo Admin', e: 'admin@smartport.pk', p: 'Admin@123', r: 'A' },
  { n: 'Demo Gate Officer', e: 'gate@smartport.pk', p: 'Gate@123', r: 'G' },
  { n: 'Demo Yard Supervisor', e: 'yard@smartport.pk', p: 'Yard@123', r: 'Y' },
  { n: 'Demo Documentation Clerk', e: 'docs@smartport.pk', p: 'Docs@123', r: 'D' },
  { n: 'Demo Billing Clerk', e: 'billing@smartport.pk', p: 'Bill@123', r: 'B' },
  { n: 'Demo Client', e: 'client@smartport.pk', p: 'Client@123', r: 'C', watch: ['GMT-0017', 'GMT-0019', 'GMT-0021'], slots: [] },
]

/** The ten chapters of the landing film: [line1, line2, body, status, location, _, dwell]. */
export const STORY: string[][] = [
  ['Born at sea.', 'Bound for better.', 'One container. Ten connected moments. Follow GMT-0042 from the first lift to the final mile.', 'On vessel', 'Berth B-3', '0', '0'],
  ['Crossing land.', 'Straight to the dry port.', 'Rail and truck shuttles carry cargo inland, so the seaport stays clear.', 'In transit', 'Rail shuttle', '0', '0'],
  ['At the gate.', 'Checked in, seconds.', 'The gate officer records the truck, the driver and the container, then lifts the barrier.', 'At gate', 'Gate 2', '0', '0'],
  ['Cleared,', 'not stuck.', 'Documents are verified and the hold clears. Nothing leaves without customs clearance and cleared dues.', 'Customs', 'Customs desk', '0', '1'],
  ['Buried', 'by chaos.', 'Stack it wrong and every pickup costs extra crane moves.', 'Buried', 'Bay 3, tier 1', '', '2'],
  ['Placed', 'by logic.', 'The optimizer scores every free slot and picks the one that blocks nothing.', 'Slot assigned', 'Bay 7, tier 2', '', '2'],
  ['The shortest', 'way there.', 'A* finds the shortest clear path for the crane and the truck.', 'Routing', 'Yard lane 2', '0', '3'],
  ['First', 'in line.', 'Pickups wait in a priority queue, so urgent trucks are served first.', 'Queued, P1', 'Bay 7, tier 2', '0', '4'],
  ['Paid', 'in full.', 'Free days, then a daily storage charge. Dues clear and the release is approved.', 'Release ok', 'Billing', '0', '5'],
  ['Out', 'the gate.', 'Container GMT-0042 leaves with the customer. Every move was connected.', 'Released', 'Gate-out', '0', '5'],
]
export const CHIPS = [
  'Berth B-3 · vessel arriving', 'Rail shuttle · inland', 'Gate 2 · check-in', 'Customs · documents', 'Yard · bay 3',
  'Optimizer · best slot', 'Router · shortest path', 'Queue · priority P1', 'Billing · dues clear', 'Gate-out · released',
]

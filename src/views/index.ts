import { ComponentType } from 'react'
import { Appointments, GateIn, Placement } from './Gate'
import { BookSlot, MyBilling, Overview, Shipments } from './Client'
import { Containers, Dashboard, Vessels, YardMap } from './Operations'
import { CustomsBilling, Reports, Users } from './Finance'
import { CraneTasks, Router } from './Yard'
import { Profile } from './Profile'

/** Page id -> component. Page metadata (title, roles) lives in lib/data.ts. */
export const views: Record<string, ComponentType> = {
  overview: Overview, shipments: Shipments, 'book-slot': BookSlot, 'my-billing': MyBilling,
  dashboard: Dashboard, 'yard-map': YardMap, containers: Containers, vessels: Vessels,
  'gate-in': GateIn, appointments: Appointments, placement: Placement,
  'crane-tasks': CraneTasks, router: Router, 'customs-billing': CustomsBilling, reports: Reports,
  users: Users, profile: Profile,
}

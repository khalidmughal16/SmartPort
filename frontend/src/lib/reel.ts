/**
 * The landing slider is made of 8 full-length videos (public/video/s0, s1, s3..s8.mp4, ~8 s each; the last one is the logo animation), in the order of
 * a container's journey. Each slide: [headline, italic part, body, status, location, extra moves, dwell days].
 * `stage` = which pill of Vessel / Gate-in / Customs / Yard / Released is current.
 */
export type Slide = { src: string; poster: string; stage: number; s: string[]; clean?: boolean } // clean = video only, no overlays
export const SLIDES: Slide[] = [
  { src: '/video/s0.mp4', poster: '/video/s0.jpg', stage: 0, s: ['Born at sea.', 'Bound for better.', 'One container. Ten connected moments. Follow GMT-0042 from the first lift to the final mile.', 'On vessel', 'Berth B-3', '0', '0'] },
  { src: '/video/s1.mp4', poster: '/video/s1.jpg', stage: 0, s: ['Alongside,', 'right on time.', 'Tugs bring the vessel to its berth while the yard prepares for the first lift.', 'Berthing', 'Berth B-3', '0', '0'] },
  { src: '/video/s3.mp4', poster: '/video/s3.jpg', stage: 1, s: ['Crossing land.', 'Straight to the dry port.', 'Rail and truck shuttles carry cargo inland, so the seaport stays clear.', 'In transit', 'Rail shuttle', '0', '0'] },
  { src: '/video/s4.mp4', poster: '/video/s4.jpg', stage: 2, s: ['Gate, customs,', 'release.', 'Trucks check in, documents are verified, and cargo moves only when it is cleared.', 'Customs', 'Customs desk', '0', '1'] },
  { src: '/video/s5.mp4', poster: '/video/s5.jpg', stage: 3, s: ['Placed', 'by logic.', 'The optimizer scores every free slot and picks the one that blocks nothing.', 'Slot assigned', 'Bay 7, tier 2', '0', '2'] },
  { src: '/video/s6.mp4', poster: '/video/s6.jpg', stage: 3, s: ['Every move,', 'one screen.', 'Operators see arrivals, holds and yard moves live, so nothing slips through.', 'Monitoring', 'Control room', '0', '3'] },
  { src: '/video/s7.mp4', poster: '/video/s7.jpg', stage: 4, s: ['Paid, and', 'out the gate.', 'Clients track, book a slot and pay online, then GMT-0042 leaves with the customer.', 'Released', 'Gate-out', '0', '5'] },
  { src: '/video/s8.mp4', poster: '/video/s8.jpg', stage: 4, clean: true, s: ['SmartPort', 'Smarter moves, stronger connections.', '', 'Released', 'Gate-out', '0', '5'] },
]

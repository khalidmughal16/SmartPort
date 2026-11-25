/**
 * Story videos (public/video). Order follows the container's journey:
 * vessel -> inland -> gate -> (customs: photo) -> (yard: photo) -> placement -> lane -> ... -> release.
 * Chapters without a clip keep their photo.
 */
export const CLIPS: Record<number, string> = {
  0: '/video/ch0.mp4', // Born at sea       - cargo vessel moving towards the port
  1: '/video/ch1.mp4', // Crossing land     - rail and trucks around the dry port
  2: '/video/ch2.mp4', // At the gate       - truck arriving at the gate
  5: '/video/ch5.mp4', // Placed by logic   - aerial yard, slot highlighted
  6: '/video/ch6.mp4', // A clear lane      - port from above
  9: '/video/ch9.mp4', // Out the gate      - truck loaded at the dock
}
export const clipPoster = (i: number) => `/video/ch${i}.jpg`

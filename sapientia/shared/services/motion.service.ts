/** True when the device asks for less motion; every animation and timed effect checks this (plan rule 4). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

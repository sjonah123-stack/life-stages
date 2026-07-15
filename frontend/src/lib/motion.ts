// Reduced-motion helpers. Svelte transitions don't respect the OS
// preference on their own, so every transition duration in the app is
// routed through motionDuration() — 0ms under reduce = instant swap.
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function motionDuration(ms: number): number {
  return prefersReducedMotion() ? 0 : ms;
}

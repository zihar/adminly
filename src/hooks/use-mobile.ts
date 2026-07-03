import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Berlangganan matchMedia lewat useSyncExternalStore — pola yang benar untuk
// membaca store eksternal, tanpa setState di dalam effect (double-render).
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  // Di server lebar tak diketahui — anggap desktop, konsisten dgn render awal.
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

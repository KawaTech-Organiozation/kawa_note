import React from "react"

const MOBILE_BREAKPOINT = 768

// Breakpoint `lg` do Tailwind. Abaixo dele o rail de pastas do Cofre
// (`hidden lg:flex`) não é renderizado.
const DESKTOP_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}

/**
 * True enquanto a viewport for menor que o breakpoint `lg` (1024px).
 *
 * Existe separado de `useIsMobile` porque nem todo alvo de soltura segue o
 * breakpoint mobile: o rail de pastas do Cofre some em `< lg`, e amarrar a
 * barra de destinos a `useIsMobile` (< 768px) deixava a faixa 768–1023px sem
 * nenhum alvo de arraste.
 *
 * @returns {boolean}
 */
export function useIsBelowDesktop() {
  const [isBelow, setIsBelow] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${DESKTOP_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsBelow(window.innerWidth < DESKTOP_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsBelow(window.innerWidth < DESKTOP_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isBelow
}

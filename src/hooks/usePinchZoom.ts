import { useCallback, useRef, useState, type PointerEvent } from 'react'

export interface ZoomState {
  scale: number
  x: number
  y: number
}

const MAX = 4
const DOUBLE_TAP = 2.5
const IDENTITY: ZoomState = { scale: 1, x: 0, y: 0 }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Photos-style zoom: pinch with two fingers, double-tap to zoom in/out,
 * drag to pan while zoomed. A single tap (that isn't the start of a double tap
 * and didn't move) calls `onSingleTap`. Pure pointer events, no dependencies.
 */
export function usePinchZoom(onZoomChange?: (zoomed: boolean) => void, onSingleTap?: () => void) {
  const [zoom, setZoomState] = useState<ZoomState>(IDENTITY)
  const [animating, setAnimating] = useState(false)
  const zoomRef = useRef(zoom)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<
    | { kind: 'pinch'; dist: number; mid: { x: number; y: number }; from: ZoomState }
    | { kind: 'pan'; start: { x: number; y: number }; from: ZoomState }
    | null
  >(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const singleTapTimer = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)

  const setZoom = useCallback(
    (next: ZoomState, animate = false) => {
      const box = boxRef.current?.getBoundingClientRect()
      // Keep the photo covering the frame: panning stops at its edges.
      const limitX = box ? (box.width * (next.scale - 1)) / 2 : Infinity
      const limitY = box ? (box.height * (next.scale - 1)) / 2 : Infinity
      const clamped = next.scale <= 1.01 ? IDENTITY : { scale: next.scale, x: clamp(next.x, -limitX, limitX), y: clamp(next.y, -limitY, limitY) }
      const wasZoomed = zoomRef.current.scale > 1
      zoomRef.current = clamped
      setAnimating(animate)
      setZoomState(clamped)
      if (wasZoomed !== clamped.scale > 1) onZoomChange?.(clamped.scale > 1)
    },
    [onZoomChange],
  )

  /** Offset of a screen point from the frame's centre. */
  const fromCenter = (p: { x: number; y: number }) => {
    const box = boxRef.current!.getBoundingClientRect()
    return { x: p.x - (box.left + box.width / 2), y: p.y - (box.top + box.height / 2) }
  }

  const onPointerDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    downAt.current = pts.length === 1 ? { x: e.clientX, y: e.clientY } : null
    if (pts.length === 2) {
      onZoomChange?.(true) // stop paging as soon as a second finger lands
      gesture.current = {
        kind: 'pinch',
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
        from: zoomRef.current,
      }
    } else if (pts.length === 1 && zoomRef.current.scale > 1) {
      gesture.current = { kind: 'pan', start: pts[0], from: zoomRef.current }
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const pts = [...pointers.current.values()]
    if (g?.kind === 'pinch' && pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const scale = clamp((g.from.scale * dist) / g.dist, 1, MAX)
      // Zoom around the point between the fingers.
      const m = fromCenter(g.mid)
      const ratio = scale / g.from.scale
      setZoom({ scale, x: m.x - (m.x - g.from.x) * ratio, y: m.y - (m.y - g.from.y) * ratio })
    } else if (g?.kind === 'pan') {
      setZoom({ scale: g.from.scale, x: g.from.x + e.clientX - g.start.x, y: g.from.y + e.clientY - g.start.y })
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    const wasPinch = gesture.current?.kind === 'pinch'
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) {
      gesture.current = null
      if (wasPinch && zoomRef.current.scale <= 1.01) onZoomChange?.(false)
    } else if (wasPinch) {
      const [p] = [...pointers.current.values()]
      gesture.current = zoomRef.current.scale > 1 ? { kind: 'pan', start: p, from: zoomRef.current } : null
    }

    // Double tap (or double click): zoom into that point, or back out.
    // Handled only here: browsers also synthesize a dblclick, which must not toggle it again.
    const start = downAt.current
    downAt.current = null
    if (wasPinch || !start || Math.hypot(start.x - e.clientX, start.y - e.clientY) > 10) return
    const now = Date.now()
    const prev = lastTap.current
    if (prev && now - prev.t < 300 && Math.hypot(prev.x - e.clientX, prev.y - e.clientY) < 30) {
      lastTap.current = null
      window.clearTimeout(singleTapTimer.current)
      if (zoomRef.current.scale > 1) setZoom(IDENTITY, true)
      else {
        const p = fromCenter({ x: e.clientX, y: e.clientY })
        setZoom({ scale: DOUBLE_TAP, x: -p.x * (DOUBLE_TAP - 1), y: -p.y * (DOUBLE_TAP - 1) }, true)
      }
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY }
      window.clearTimeout(singleTapTimer.current)
      singleTapTimer.current = window.setTimeout(() => onSingleTap?.(), 300)
    }
  }

  return {
    zoom,
    boxRef,
    style: {
      transform: `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.scale})`,
      transition: animating ? 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
    },
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}

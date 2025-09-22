import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store'
import { applyBetResult, updateBalance } from '../store/gameSlice'

type Props = {
  playing: boolean,
  onWin: (amount: number) => void
  onLose: (loss: number) => void
  onCashout?: (amount: number) => void
}

// Simple canvas-based prototype implementing lanes, chicken, cars, and coins
export default function GameCanvas({ playing, onWin, onLose, onCashout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dispatch = useDispatch()
  const { userId, betAmount, betLevel, betSteps, extra } = useSelector((s: RootState) => s.game)
  // Persist chicken location/state across re-renders/effect restarts
  const chickenPosRef = useRef({ x: 70, y: 200 })
  const chickenTargetRef = useRef<{ x: number; y: number } | null>(null)
  const isMovingRef = useRef(false)
  const chickenLaneRef = useRef<number | null>(null)
  const coinsRef = useRef<Array<any> | null>(null)
  const currentIndexRef = useRef(-1)
  const viewportStartRef = useRef(0)
  const TOTAL_ROADS = 49
  const VISIBLE = 7
  const laneTimersRef = useRef<number[] | null>(null)
  const hidePanelsUntilRef = useRef<number>(0)
  const hidePanelsUntilEndRef = useRef<boolean>(false)
  const forceShowEndPanelRef = useRef<boolean>(false)
  const endOverlayXRef = useRef<number | null>(null)
  const chickenFailedRef = useRef<boolean>(false)
  // set when backend returns a lose; we wait to show failed image until arrival at target coin
  const pendingLoseRef = useRef<boolean>(false)
  const viewportOffsetRef = useRef<number>(0)
  const sidewalkFixedRef = useRef<boolean>(false)
  const policyImgRef = useRef<HTMLImageElement | null>(null)
  const policyImgLoadedRef = useRef<boolean>(false)
  const policyAnimationsRef = useRef<Map<number, { startTime: number, startY: number, targetY: number }>>(new Map())
  const gameStartedRef = useRef<boolean>(false)
  const currentEarningsRef = useRef<number>(0)
  const carsRef = useRef<Array<any>>([])

  // Exact odd values for each level (same as backend) - 49 coins total
  const lowLevelOdds = [
    1.02, 1.08, 1.13, 1.19, 1.25, 1.32, 1.38, 1.45, 1.53, 1.61,
    1.69, 1.78, 1.87, 1.96, 2.06, 2.17, 2.28, 2.4, 2.52, 2.65,
    2.78, 2.92, 3.07, 3.23, 3.4, 3.57, 3.75, 3.94, 4.14, 4.36,
    4.58, 4.81, 5.06, 5.32, 5.59, 5.87, 6.17, 6.49, 6.82, 7.17,
    7.53, 7.92, 8.32, 8.75, 9.19, 9.66, 10.16, 10.67, 11.22
  ];

  const mediumLevelOdds = [
    1.12, 1.28, 1.46, 1.67, 1.91, 2.18, 2.49, 2.85, 3.25, 3.72,
    4.25, 4.86, 5.56, 6.35, 7.26, 8.3, 9.48, 10.84, 12.39, 14.16,
    16.18, 18.49, 21.13, 24.15, 27.6, 31.55, 36.05, 41.2, 47.09, 53.82,
    61.51, 70.3, 80.34, 91.82, 104.94, 119.93, 137.06, 156.64, 179.02, 204.59,
    233.82, 267.23, 305.4, 349.03, 398.89, 455.88, 521.01, 595.44, 680.5
  ];

  const highLevelOdds = [
    1.22, 1.54, 1.93, 2.43, 3.05, 3.83, 4.8, 6.03, 7.57, 9.5,
    11.93, 14.97, 18.79, 23.59, 29.6, 37.16, 46.64, 58.53, 73.47, 92.21,
    115.74, 145.26, 182.32, 228.83, 287.21, 360.47, 452.43, 567.85, 712.71, 894.53,
    1122.73, 1409.14, 1768.61, 2219.79, 2786.07, 3496.8, 4388.84, 5508.45, 6913.66, 8677.35,
    10669.27, 17156.33, 21532.95, 27026.05, 33920.45, 42573.63, 53434.25, 67065.44
  ];

  // Function to get multiplier based on level and step
  const getMultiplier = (level: string, step: number) => {
    let oddsArray: number[];
    switch (level) {
      case 'low':
        oddsArray = lowLevelOdds;
        break;
      case 'medium':
        oddsArray = mediumLevelOdds;
        break;
      case 'high':
        oddsArray = highLevelOdds;
        break;
      default:
        oddsArray = lowLevelOdds;
    }
    
    if (step > oddsArray.length) return oddsArray[oddsArray.length - 1];
    return oddsArray[step - 1]; // step-1 because array is 0-indexed and step starts from 1
  };

  useEffect(() => {
  const MOVE_ENABLE_INDEX = 3 // background scroll allowed when chicken reaches/moves to this index or beyond (0-based)
  // show the end (right) sidewalk when the player has clicked this index or beyond
  // final design should complete at coin 46, so start forcing the end panel from 46 (index 45)
  const SHOW_END_AT_INDEX = 46
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0

  // match the visual layout: wider and taller canvas
  canvas.width = 820
  canvas.height = 720

  // Game state (columns = lanes)
  const lanes = 5
  const laneHeight = 150 // vertical spacing between lane centers
  const laneYStart = 0

  // road layout (compute early so we can position coins left-to-right)
  // Align the road X with the left sidewalk width so visible road slots
  // correspond exactly to the area between the left and right panels.
  const sidewalkW = 140
  const rightPanelW = 140
  const roadX = sidewalkW
  // width available for the visible road area (between left and right panels)
  const roadW = canvas.width - roadX
  // slot width is the width of a single visible road slot (use full canvas width minus left sidewalk)
  const slotWidth = roadW / VISIBLE
  const fullRoadWidth = slotWidth * TOTAL_ROADS
  const levelWidth = roadX + fullRoadWidth + rightPanelW
  // a good vertical position for coins (center of road area)
  const coinY = laneYStart + (lanes * laneHeight) * 11 / 17

    // coins positions for ALL roads (persisted). We'll compute global X positions once and draw them relative to viewport.
    if (!coinsRef.current) {
      coinsRef.current = new Array(TOTAL_ROADS).fill(0).map((_, i) => ({
        x: roadX + (i + 0.5) * slotWidth,
        y: coinY,
        multiplier: getMultiplier(betLevel, i + 1), // Use exact odds based on current bet level
        index: i
      }))
    } else {
      // if already present (effect re-run), ensure x updated to any size change and multiplier updated for current bet level
      for (let i = 0; i < coinsRef.current.length; i++) {
        coinsRef.current[i].x = roadX + (i + 0.5) * slotWidth
        coinsRef.current[i].y = coinY
        coinsRef.current[i].multiplier = getMultiplier(betLevel, i + 1) // Update multiplier for current bet level
      }
    }
    // (no auto-return behavior)
    if (!laneTimersRef.current) {
      laneTimersRef.current = new Array(TOTAL_ROADS).fill(0).map(() => 1000 + Math.random() * 7000)
    }

    // cars: each has lane, x, y, speed - use persistent ref
    const cars = carsRef.current

    // (level canvas will be created after images are declared)

    // load car sprite (use ASSETS/car2.svg if present)
    const carImg = new Image()
    let carImgLoaded = false
    carImg.onload = () => { carImgLoaded = true }
    carImg.onerror = () => { carImgLoaded = false }
    carImg.src = '/ASSETS/car2.svg'

  // (lane timers are stored in laneTimersRef for all roads)

  // chicken state
  // useRef-backed values (persist across effect restarts)
  // initialize chickenPosRef to align with the coin row only on first run
  if (chickenPosRef.current.y === 200) {
    chickenPosRef.current.x = 70
    chickenPosRef.current.y = coinY - 48
  }

  let isAlive = true
  // index of last clicked coin (start -1 means none clicked yet)
  // persisted in ref so effect restarts don't reset progress
  // currentIndexRef.current holds the same value

    // load chicken image (use ASSETS/chicken.png if present)
    const chickenImg = new Image()
    let chickenImgLoaded = false
    chickenImg.onload = () => { chickenImgLoaded = true }
    chickenImg.onerror = () => { chickenImgLoaded = false }
    chickenImg.src = '/ASSETS/chicken.png'

  // load left sidewalk background images (start and end). Fallback to color if missing.
  const startedImg = new Image()
  let startedLoaded = false
  startedImg.onload = () => { startedLoaded = true }
  startedImg.onerror = () => { startedLoaded = false }
  startedImg.src = '/ASSETS/started.webp'

  const endImg = new Image()
  let endLoaded = false
  endImg.onload = () => { endLoaded = true }
  endImg.onerror = () => { endLoaded = false }
  endImg.src = '/ASSETS/end.webp'

  // load failed chicken image (shown when chicken loses)
  const failedImg = new Image()
  let failedImgLoaded = false
  failedImg.onload = () => { failedImgLoaded = true }
  failedImg.onerror = () => { failedImgLoaded = false }
  failedImg.src = '/ASSETS/failed.png'

  // load policy image (shown above passed coins)
  const policyImg = new Image()
  let policyImgLoaded = false
  policyImg.onload = () => { 
    policyImgLoaded = true
    policyImgLoadedRef.current = true
    policyImgRef.current = policyImg
  }
  policyImg.onerror = () => { 
    policyImgLoaded = false
    policyImgLoadedRef.current = false
  }
  policyImg.src = '/ASSETS/policy.svg'

    // create static offscreen level canvas that contains the continuous road and sidewalks
    const levelCanvas = document.createElement('canvas')
    levelCanvas.width = Math.max(levelWidth, canvas.width)
    levelCanvas.height = canvas.height
    const lctx = levelCanvas.getContext('2d')!

    // draw full-level base as road color
    lctx.fillStyle = '#2f2f2f'
    lctx.fillRect(0, 0, levelCanvas.width, levelCanvas.height)

    // draw left static sidewalk (start area)
    if (startedLoaded) {
      lctx.drawImage(startedImg, 0, 0, sidewalkW, levelCanvas.height)
    } else {
      lctx.fillStyle = '#2f2f2f'
      lctx.fillRect(0, 0, sidewalkW, levelCanvas.height)
      lctx.fillStyle = '#2f2f2f'
      lctx.fillRect(12, 80, 116, 520)
    }

    // draw separators for all columns across fullRoadWidth
    lctx.strokeStyle = '#e9e9e9'
    lctx.lineWidth = 3
    lctx.setLineDash([18, 18])
    for (let i = 0; i <= TOTAL_ROADS; i++) {
      const x = roadX + i * slotWidth
      lctx.beginPath()
      lctx.moveTo(x, 0)
      lctx.lineTo(x, levelCanvas.height)
      lctx.stroke()
    }
    lctx.setLineDash([])
    
    // draw end sidewalk at far right
    const endX = roadX + fullRoadWidth
    if (endLoaded) {
      lctx.drawImage(endImg, endX, 0, rightPanelW, levelCanvas.height)
    } else {
      lctx.fillStyle = '#2f2f2f'
      lctx.fillRect(endX, 0, rightPanelW, levelCanvas.height)
      lctx.fillStyle = '#2f2f2f'
      lctx.fillRect(endX + 12, 80, 116, 520)
    }

    // update with delta milliseconds
    let lastTime = performance.now()
      function handleArrival(laneIndex: number | null) {
        if (laneIndex === null) return
        const coin = coinsRef.current![laneIndex]
        const danger = cars.some(car => {
          if (car.lane !== laneIndex) return false
          const carHalf = 32
          const distY = Math.abs(car.y - coin.y)
          return distY < (carHalf + 30)
        })
        if (danger) {
          isAlive = false
                  // no scheduled return to cancel (auto-return removed)
        }

        // After arrival, maybe advance viewport if chicken is at/after dynamic middle slot
        const vpStart = viewportStartRef.current
        const localIndex = laneIndex - vpStart
        // When an extra right road is visible (eight roads total), keep more coins to the left
        // by using a wider middle threshold.
        const nowArrival = performance.now()
        const forceShowEndAtArrival = forceShowEndPanelRef.current
        const atFinalViewportArrival = vpStart >= Math.max(0, TOTAL_ROADS - VISIBLE)
        const panelsHiddenAtArrival = (!forceShowEndAtArrival) && ((hidePanelsUntilRef.current > nowArrival) || hidePanelsUntilEndRef.current)
        const extraRightRoadVisibleAtArrival = panelsHiddenAtArrival || (forceShowEndAtArrival && endOverlayXRef.current !== null && !atFinalViewportArrival)
        const visibleSlotsAtArrival = VISIBLE + (extraRightRoadVisibleAtArrival ? 1 : 0)
        const middleSlot = Math.floor(visibleSlotsAtArrival / 2)
        // allow advancing viewport while the chicken progresses; permit advancing up to TOTAL_ROADS
        // (not limited to TOTAL_ROADS - VISIBLE) so the background can continue moving right
        // until the last coin is clicked
        // Don't advance viewport if we're at the very beginning (first few coins)
        if (localIndex >= middleSlot && vpStart < TOTAL_ROADS && laneIndex >= MOVE_ENABLE_INDEX) {
          const allowScroll = (currentIndexRef.current >= MOVE_ENABLE_INDEX) || (chickenLaneRef.current !== null && chickenLaneRef.current >= MOVE_ENABLE_INDEX)
          if (allowScroll) {
            viewportStartRef.current = Math.min(TOTAL_ROADS, vpStart + 1)
          }
          // recompute chicken screen X so it stays over same visual slot
          const newLocal = laneIndex - viewportStartRef.current
          const newX = roadX + ((newLocal + 0.5) * roadW) / VISIBLE
          // newX is a screen X (relative to canvas). Convert to global level X by adding the viewport offset
          const newViewportOffset = viewportStartRef.current * slotWidth
          chickenPosRef.current.x = newX + newViewportOffset
          hidePanelsUntilRef.current = performance.now() + 600
        }
      }

      function update(delta: number) {
        // animate chicken movement toward target if set
        const chickenTarget = chickenTargetRef.current
        if (chickenTarget) {
          isMovingRef.current = true
          const dx = chickenTarget.x - chickenPosRef.current.x
          const dy = chickenTarget.y - chickenPosRef.current.y
          const dist = Math.hypot(dx, dy)
          const speed = 800 // pixels per second
          const move = Math.min(dist, (speed * delta) / 1000)
          if (dist > 0.5) {
            chickenPosRef.current.x += (dx / dist) * move
            chickenPosRef.current.y += (dy / dist) * move
          }
          // arrival
          if (dist <= 4) {
            // snap to target
            const arrivedX = chickenTarget.x
            chickenPosRef.current.x = arrivedX
            chickenPosRef.current.y = chickenTarget.y
            isMovingRef.current = false
            // clear the target first
            chickenTargetRef.current = null

            // compute level end X to detect sidewalk arrival
            const endX = roadX + fullRoadWidth

            if (arrivedX >= endX) {
              // Arrived at sidewalk area. Do not auto-return — keep the chicken where it landed.
              // No auto-return; do not change chickenLane here.
            } else {
              // Arrived at a coin slot — if a lose was returned, show failed image now and stop game
              if (pendingLoseRef.current) {
                // Spawn a fast car from top in the current lane, then switch to failed image
                pendingLoseRef.current = false
                const lane = chickenLaneRef.current ?? 0
                const laneToHit = Math.max(0, Math.min(TOTAL_ROADS - 1, lane))
                const cars = carsRef.current
                const hasActive = cars.some(c => c.lane === laneToHit && c.y < (canvasRef.current?.height || 720) + 100)
                if (!hasActive) {
                  const speed = 80
                  cars.push({ lane: laneToHit, x: 0, y: -120, speed })
                }
                // Delay failed image to let the car run down over the chicken
                setTimeout(() => {
                  chickenFailedRef.current = true
                  isMovingRef.current = false
                  chickenTargetRef.current = null
                  // Dispatch game-lost event to change button to START
                  window.dispatchEvent(new CustomEvent('game-lost'))
                }, 700)
              } else {
                // normal arrival logic for wins/continues
                handleArrival(chickenLaneRef.current)
              }
            }
          }
        }
      // decrement per-lane timers and spawn when timer elapses (only for visible roads)
      // DO NOT spawn cars for roads the chicken has already passed (indices <= currentIndex)
      const vpStart = viewportStartRef.current
      // when panels are hidden we briefly show an extra right road; allow spawning there too
      const nowForSpawn = performance.now()
      const forceShowEndForSpawn = forceShowEndPanelRef.current
      const panelsHiddenForSpawn = (!forceShowEndForSpawn) && ((hidePanelsUntilRef.current > nowForSpawn) || hidePanelsUntilEndRef.current)
      const extraRightVisibleForSpawn = panelsHiddenForSpawn || (forceShowEndForSpawn && endOverlayXRef.current !== null && !(vpStart >= Math.max(0, TOTAL_ROADS - VISIBLE)))
      const visibleSlotsForSpawn = VISIBLE + (extraRightVisibleForSpawn ? 1 : 0)
      const vpEnd = Math.min(TOTAL_ROADS, vpStart + visibleSlotsForSpawn)
      const passedIndex = currentIndexRef.current
      // remove any active cars in lanes the chicken already passed
      for (let i = cars.length - 1; i >= 0; i--) {
        if (cars[i].lane <= passedIndex) cars.splice(i, 1)
      }
      for (let lane = vpStart; lane < vpEnd; lane++) {
        // skip spawning for passed lanes
        if (lane <= passedIndex) continue
        laneTimersRef.current![lane] -= delta
        if (laneTimersRef.current![lane] <= 0) {
          // only spawn if there is no active car in this lane currently on screen
          const hasActive = cars.some(c => c.lane === lane && c.y < canvas.height + 100)
          if (!hasActive) {
            const speed = 2 + Math.random() * 50
            cars.push({ lane, x: 0, y: -80 - Math.random() * 60, speed })
          }
          // reset timer to random 1s..8s
          laneTimersRef.current![lane] = 1000 + Math.random() * 7000
        }
      }

      // move cars downwards (scale speed by delta/frame time)
      for (const c of cars) {
        c.y += c.speed * (delta / 16.666)
      }

      // remove offscreen (below canvas)
      for (let i = cars.length - 1; i >= 0; i--) {
        if (cars[i].y > canvas.height + 200) cars.splice(i, 1)
      }
    }

    function draw() {
        
  // always draw background as road color so the screen is roads by default
  ctx.fillStyle = '#2f2f2f'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // determine if the chicken is currently moving to the right
        const movingRight = !!(isMovingRef.current && chickenTargetRef.current && (chickenTargetRef.current.x > chickenPosRef.current.x))

        // base road rectangle values (used when not moving right)
  const baseRoadX = roadX
        const baseRoadW = canvas.width - baseRoadX
        // when movingRight, draw the road across the full canvas width
        const drawRoadX = movingRight ? 0 : baseRoadX
        const drawRoadW = movingRight ? canvas.width : baseRoadW

        // draw the static level background slice from the offscreen levelCanvas
        const vpStart = viewportStartRef.current
        const srcX = Math.round(roadX + vpStart * slotWidth - roadX) + roadX - roadX // simplified to roadX + vpStart*slotWidth
        // compute correct srcX: portion starting at roadX + vpStart*slotWidth minus roadX to align with canvas 0
        const trueSrcX = Math.round(roadX + vpStart * slotWidth)
        // ensure srcX within bounds
        const maxSrcX = Math.max(0, levelCanvas.width - canvas.width)
        // decide whether scrolling is allowed (same rule as in update)
        const allowScroll = (currentIndexRef.current >= MOVE_ENABLE_INDEX) || (chickenLaneRef.current !== null && chickenLaneRef.current >= MOVE_ENABLE_INDEX)
        let clampedSrcX = 0
        if (allowScroll) {
          clampedSrcX = Math.min(maxSrcX, Math.max(0, trueSrcX - roadX))
        } else {
          // prevent any movement: show the leftmost portion so left sidewalk remains visible
          clampedSrcX = 0
        }
  // draw slice
  ctx.drawImage(levelCanvas, clampedSrcX, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  // store viewport offset for input mapping
  viewportOffsetRef.current = clampedSrcX

        // Ensure the left sidewalk is drawn (overlay) until scrolling is allowed.
        // This prevents the underlying road (from the level slice) from briefly showing
        // while panels are hidden during the short transition from coin 3 -> 4.
        const leftOverlayNeeded = (viewportStartRef.current === 0) || (!allowScroll)
        if (leftOverlayNeeded) {
          const leftW = 140
          if (startedLoaded) {
            ctx.drawImage(startedImg, 0, 0, leftW, canvas.height)
          } else {
            ctx.fillStyle = '#d9e6d6'
            ctx.fillRect(0, 0, leftW, canvas.height)
            ctx.fillStyle = '#b8d0b0'
            ctx.fillRect(12, 80, 116, 520)
          }
          // redraw any dashed separators that cross the left overlay to preserve road lines
          ctx.strokeStyle = '#e9e9e9'
          ctx.lineWidth = 3
          ctx.setLineDash([18, 18])
          // separators were drawn at global X = roadX + i * slotWidth
          for (let i = 0; i <= TOTAL_ROADS; i++) {
            const sepGlobalX = roadX + i * slotWidth
            const sepScreenX = Math.round(sepGlobalX - clampedSrcX)
            if (sepScreenX >= 0 && sepScreenX <= leftW) {
              ctx.beginPath()
              ctx.moveTo(sepScreenX, 0)
              ctx.lineTo(sepScreenX, canvas.height)
              ctx.stroke()
            }
          }
          ctx.setLineDash([])
        }

        // If a forced end overlay position was computed (player clicked late-stage coin),
        // draw the end image at that global X position (converted to screen X) so it appears
        // immediately to the right of the last visible road.
        const endOverlayGlobal = endOverlayXRef.current
        const vpNow = viewportStartRef.current
        const atFinalViewport = vpNow >= Math.max(0, TOTAL_ROADS - VISIBLE)
        if (forceShowEndPanelRef.current && endOverlayGlobal !== null && !atFinalViewport) {
          const endW = 140
          const extraRoadW = slotWidth
          const endXGlobal = roadX + fullRoadWidth
          // if the overlay would sit at/after the level end, draw the end sidewalk at the level end
          if (endOverlayGlobal >= endXGlobal) {
            const screenEndX = Math.round(endXGlobal - clampedSrcX)
            if (endLoaded) {
              ctx.drawImage(endImg, screenEndX, 0, endW, canvas.height)
            } else {
              ctx.fillStyle = '#f2f2f2'
              ctx.fillRect(screenEndX, 0, endW, canvas.height)
              ctx.fillStyle = '#e0e0e0'
              ctx.fillRect(screenEndX + 12, 80, 116, 520)
            }
          } else {
            // screen X for the extra road (one slot) that should appear before the sidewalk
            const screenRoadX = Math.round(endOverlayGlobal - clampedSrcX)
            // draw the extra road area
            ctx.fillStyle = '#2f2f2f'
            ctx.fillRect(screenRoadX, 0, extraRoadW, canvas.height)
            // draw separators for the extra road edges to match the level style
            ctx.strokeStyle = '#e9e9e9'
            ctx.lineWidth = 3
            ctx.setLineDash([18, 18])
            // left edge
            ctx.beginPath()
            ctx.moveTo(screenRoadX, 0)
            ctx.lineTo(screenRoadX, canvas.height)
            ctx.stroke()
            // right edge
            ctx.beginPath()
            ctx.moveTo(screenRoadX + extraRoadW, 0)
            ctx.lineTo(screenRoadX + extraRoadW, canvas.height)
            ctx.stroke()
            ctx.setLineDash([])

            // now draw the end sidewalk immediately to the right of that extra road
            const endScreenX = screenRoadX + extraRoadW
            if (endLoaded) {
              ctx.drawImage(endImg, endScreenX, 0, endW, canvas.height)
            } else {
              ctx.fillStyle = '#f2f2f2'
              ctx.fillRect(endScreenX, 0, endW, canvas.height)
              ctx.fillStyle = '#e0e0e0'
              ctx.fillRect(endScreenX + 12, 80, 116, 520)
            }
          }
        }

        // coins: draw dynamic coins on top using global coin.x minus clampedSrcX to compute screen X
        // When panels are hidden during movement, an extra road slot becomes visible on the right.
        // Draw one additional coin in that case so the rightmost road shows its coin.
        // Draw ALL coins across ALL roads
        for (let i = 0; i < TOTAL_ROADS; i++) {
          const coin = coinsRef.current![i]
          const cx = coin.x - clampedSrcX
          // Only draw coins that fall within the canvas area.
          // This ensures visible coins (including the 5th) are drawn at game start.
          if (cx < 0 || cx > canvas.width) continue
          // All coins remain visible
          ctx.globalAlpha = 1
          // coin rim
          ctx.beginPath()
          ctx.fillStyle = '#3b4b55'
          ctx.arc(cx, coin.y, 36, 0, Math.PI * 2)
          ctx.fill()
          // inner coin
          ctx.beginPath()
          ctx.fillStyle = '#2b3a43'
          ctx.arc(cx, coin.y, 30, 0, Math.PI * 2)
          ctx.fill()
          // index removed - no coin numbers displayed
          // multiplier
          ctx.fillStyle = '#d6e6f0'
          ctx.font = '16px bold sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(coin.multiplier.toFixed(2) + 'x', cx, coin.y + 6)
          ctx.globalAlpha = 1
        }

      // (cars are drawn below for visible lanes)
      // draw cars (top -> bottom) in each visible column; set x based on lane
      const vpStartDraw = viewportStartRef.current
      const nowForDrawCars = performance.now()
      const forceShowEndForDrawCars = forceShowEndPanelRef.current
      const panelsHiddenForDrawCars = (!forceShowEndForDrawCars) && (movingRight || (hidePanelsUntilRef.current > nowForDrawCars) || hidePanelsUntilEndRef.current)
      const extraRightVisibleForDrawCars = panelsHiddenForDrawCars || (forceShowEndForDrawCars && endOverlayXRef.current !== null && !(vpStartDraw >= Math.max(0, TOTAL_ROADS - VISIBLE)))
      const visibleSlotsForDrawCars = VISIBLE + (extraRightVisibleForDrawCars ? 1 : 0)
      for (const c of cars) {
        const laneIndex = c.lane
        // only draw cars for lanes currently visible
        if (laneIndex < vpStartDraw || laneIndex >= vpStartDraw + visibleSlotsForDrawCars) continue
        // compute car X from global coin slot center
        const coinForLane = coinsRef.current![laneIndex]
        const cx = coinForLane.x - viewportOffsetRef.current
        c.x = cx
        const y = c.y
        if (carImgLoaded) {
          const w = 64
          const h = 64
          ctx.drawImage(carImg, c.x - w / 2, y - h / 2, w, h)
        } else {
          ctx.fillStyle = 'red'
          ctx.fillRect(c.x - 32, y - 18, 64, 36)
        }
      }


        // draw left sidewalk background: show start image only at initial viewport;
        // draw end image on the right-side panel when viewport reaches the final window;
        // otherwise draw default sidewalk panels.
        const sidewalkX = 0
        const sidewalkW = 140
        const rightPanelW = 140
        const rightX = canvas.width - rightPanelW
  const vpStartNow = viewportStartRef.current
  const isAtStart = vpStartNow === 0
  const finalWindowStart = Math.max(0, TOTAL_ROADS - VISIBLE - 3) // Show final design at 46th coin (index 45)
  const isAtEnd = vpStartNow >= finalWindowStart

    // if we've reached the final viewport, stop forcing panels hidden-until-end
    if (isAtEnd) {
      hidePanelsUntilEndRef.current = false
      // DO NOT clear forceShowEndPanelRef here — keep the end panel forced once revealed
    }

  // decide whether panels should be hidden: moving right OR short timeout OR hide-until-end flag
  // but if we have a forced-show for the end panel, override hides so the right panel is visible
  const nowTime = performance.now()
  const forceShowEnd = forceShowEndPanelRef.current
  const panelsHidden = (!forceShowEnd) && (movingRight || (hidePanelsUntilRef.current > nowTime) || hidePanelsUntilEndRef.current)

  // left and right panels: only draw when NOT panelsHidden; when panelsHidden, hide sidewalk panels
  if (!panelsHidden) {
          // Panels are mutually exclusive: when start panel is visible hide right panel (fill with road),
          // when end panel is visible hide left panel (fill with road). Otherwise draw both panels normally.
          if (isAtStart && startedLoaded) {
            // show left start image; keep right side as-is so the 5th coin remains visible
            ctx.drawImage(startedImg, sidewalkX, 0, sidewalkW, canvas.height)
          } else if (isAtEnd && endLoaded) {
            // show right end image, hide left by filling with road color
            // Don't draw right panel background to keep coins visible
            ctx.drawImage(endImg, rightX, 0, rightPanelW, canvas.height)
            ctx.fillStyle = '#2f2f2f'
            ctx.fillRect(sidewalkX, 0, sidewalkW, canvas.height)
            // Skip right panel background drawing to keep 43rd and 44th coins visible
          } else {
            // default: draw both panels
            // left panel
            ctx.fillStyle = '#2f2f2f'
            ctx.fillRect(sidewalkX, 0, sidewalkW, canvas.height)
            // left sidewalk decorations
            ctx.fillStyle = '#2f2f2f'
            ctx.fillRect(12, 80, 116, 520)
            // right panel (only if not at end)
            if (!isAtEnd) {
              ctx.fillStyle = '#2f2f2f'
              ctx.fillRect(rightX, 0, rightPanelW, canvas.height)
              // right panel decoration (subtle)
              ctx.fillStyle = '#2f2f2f'
              ctx.fillRect(rightX + 12, 80, 116, 520)
            }
          }
        }
        // After panels are drawn, redraw any vertical separators that intersect the left or right panels
        // so the dashed road lines remain visible even when panels overlay the level.
        ctx.strokeStyle = '#e9e9e9'
        ctx.lineWidth = 3
        ctx.setLineDash([18, 18])
        const leftW = sidewalkW
        const rightStart = rightX
        const rightEnd = rightX + rightPanelW
        for (let i = 0; i <= TOTAL_ROADS; i++) {
          const sepGlobalX = roadX + i * slotWidth
          const sepScreenX = Math.round(sepGlobalX - viewportOffsetRef.current)
          // draw if intersects left panel
          if (sepScreenX >= 0 && sepScreenX <= leftW) {
            ctx.beginPath()
            ctx.moveTo(sepScreenX, 0)
            ctx.lineTo(sepScreenX, canvas.height)
            ctx.stroke()
          }
          // draw if intersects right panel
          // avoid drawing dashed lines over the right sidewalk in the final window so
          // late coins (e.g., 43-46) remain fully visible and uncluttered
          if (!isAtEnd && sepScreenX >= rightStart && sepScreenX <= rightEnd) {
            ctx.beginPath()
            ctx.moveTo(sepScreenX, 0)
            ctx.lineTo(sepScreenX, canvas.height)
            ctx.stroke()
          }
        }
        ctx.setLineDash([])
    // draw left sidewalk / chicken area
    const chickX = 80
  const chickY = chickenPosRef.current.y

        // draw the chicken at its current animated position (on top of coins and cars)
        // Only draw the chicken if it's within the current visible viewport (or has no lane assigned yet)
        const vpStartCheck = viewportStartRef.current
        const vpEndCheck = vpStartCheck + VISIBLE
        const chickenLane = chickenLaneRef.current
        const chickenInView = chickenLane === null || (chickenLane >= vpStartCheck && chickenLane < vpEndCheck)

        if (chickenInView) {
          const screenChickenX = chickenPosRef.current.x - viewportOffsetRef.current
          if (chickenFailedRef.current && failedImgLoaded) {
            const fw = 100
            const fh = 100
            ctx.drawImage(failedImg, screenChickenX - fw / 2, chickenPosRef.current.y - fh / 2, fw, fh)
          } else if (chickenImgLoaded) {
            const w = 100
            const h = 100
            // draw the chicken centered on (screenChickenX, chickenPos.y)
            ctx.drawImage(
              chickenImg,
              screenChickenX - w / 2,
              chickenPosRef.current.y - h / 2,
              w,
              h
            )
          } else {
            ctx.beginPath()
            ctx.fillStyle = isAlive ? 'white' : 'gray'
            ctx.arc(screenChickenX, chickenPosRef.current.y, 22, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Draw policy images above passed coins
        {
          for (let i = 0; i < TOTAL_ROADS; i++) {
            const coin = coinsRef.current![i]
            const cx = coin.x - viewportOffsetRef.current
            if (cx < 0 || cx > canvas.width) continue
            
            // Only draw policy image for coins that have been passed (currentIndex > 1)
            if (currentIndexRef.current > i && policyImgLoadedRef.current && policyImgRef.current) {
              const targetY = coin.y - 80 // Final position above the coin
              const policyWidth = 60
              const policyHeight = 60
              
              // Check if this coin needs a new animation
              if (!policyAnimationsRef.current.has(i)) {
                const startY = coin.y - 120 // Start 40 pixels higher
                policyAnimationsRef.current.set(i, {
                  startTime: performance.now(),
                  startY: startY,
                  targetY: targetY
                })
              }
              
              // Get animation data
              const anim = policyAnimationsRef.current.get(i)!
              const now = performance.now()
              const elapsed = now - anim.startTime
              const duration = 800 // Animation duration in milliseconds
              
              let currentY = anim.targetY
              if (elapsed < duration) {
                // Ease out animation
                const progress = elapsed / duration
                const easeOut = 1 - Math.pow(1 - progress, 3)
                currentY = anim.startY + (anim.targetY - anim.startY) * easeOut
              }
              
              ctx.drawImage(
                policyImgRef.current,
                cx - policyWidth / 2,
                currentY - policyHeight / 2,
                policyWidth,
                policyHeight
              )
            }
          }
        }

        // After drawing the chicken, redraw coin labels (and current coin outline) on top so
        // numbers and odds are always visible even when the chicken overlaps a coin.
        {
          const nowTimeForLabels = performance.now()
          const forceShowEndForLabels = forceShowEndPanelRef.current
          const panelsHiddenForLabels = (!forceShowEndForLabels) && ((hidePanelsUntilRef.current > nowTimeForLabels) || hidePanelsUntilEndRef.current)
          const extraRightRoadVisibleForLabels = panelsHiddenForLabels || (forceShowEndForLabels && endOverlayXRef.current !== null && !atFinalViewport)
          const slotsToLabel = VISIBLE + (extraRightRoadVisibleForLabels ? 1 : 0)
          for (let i = 0; i < slotsToLabel; i++) {
            const globalIndex = viewportStartRef.current + i
            if (globalIndex >= TOTAL_ROADS) break
            const coin = coinsRef.current![globalIndex]
            const cx = coin.x - viewportOffsetRef.current
            if (cx < 0 || cx > canvas.width) continue
            // draw a subtle outline for the current coin to indicate its position
            if (chickenLaneRef.current === globalIndex) {
              ctx.beginPath()
              ctx.strokeStyle = 'rgba(255, 255, 255, 0)'
              ctx.lineWidth = 2
              ctx.arc(cx, coin.y, 34, 0, Math.PI * 2)
              ctx.stroke()
            }
            // draw labels on top (coin numbers removed)
            ctx.fillStyle = '#d6e6f0'
            ctx.font = '16px bold sans-serif'
            ctx.fillText(coin.multiplier.toFixed(2) + 'x', cx, coin.y + 6)
          }
        }
    }

    function loop(ts?: number) {
      const now = ts ?? performance.now()
      const delta = Math.max(0, now - lastTime)
      lastTime = now
      update(delta)
      draw()
      raf = requestAnimationFrame(loop)
    }

    // clicking coins: check collision and decide win/lose depending on cars
    async function onClick(e: MouseEvent) {
      if (!isAlive) return
      
      // If game is not playing and user clicks first coin, start the game
      if (!playing) {
        // Check if click is on first coin
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const canvasX = (e.clientX - rect.left) * scaleX
        const canvasY = (e.clientY - rect.top) * scaleY
        
        if (coinsRef.current && coinsRef.current.length > 0) {
          const firstCoin = coinsRef.current[0]
          const coinX = firstCoin.x - viewportOffsetRef.current
          const coinY = firstCoin.y
          const distance = Math.sqrt((canvasX - coinX) ** 2 + (canvasY - coinY) ** 2)
          
          if (distance <= 36) { // Coin radius
            // Start the game by dispatching event
            window.dispatchEvent(new CustomEvent('start-game'))
            return
          }
        }
        return
      }
  const rect = canvas.getBoundingClientRect()
  // map mouse coordinates to canvas coordinate space (handles CSS scaling)
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const canvasX = (e.clientX - rect.left) * scaleX
  const x = canvasX + viewportOffsetRef.current
  const y = (e.clientY - rect.top) * scaleY

      // find coin clicked
  if (!isMovingRef.current) {
        // only allow clicking the next coin index (currentIndex + 1)
        const nextIndex = currentIndexRef.current + 1
        const vpStart = viewportStartRef.current
        const vpEnd = vpStart + VISIBLE
        // require the nextIndex to be inside the visible window
        if (nextIndex >= vpStart && nextIndex < vpEnd && nextIndex < coinsRef.current!.length) {
          const c = coinsRef.current![nextIndex]
          const dx = x - c.x
          const dy = y - c.y
          const distSq = dx * dx + dy * dy
          const clickRadius = 36 // coin radius used in drawing

          // Only allow click if within click radius and coin is to the right of chicken
          if (distSq <= clickRadius * clickRadius && c.x >= chickenPosRef.current.x) {
            // Notify backend to resolve this bet step
            try {
              const API_BASE = (window as any).env?.VITE_API_KEY || 'http://localhost:4000'
              const state = (window as any).reduxStateGetter?.() || { userId, totalAmount: undefined }
              const body = {
                userId: state.userId || userId,
                betAmount,
                betLevel,
                betSteps: nextIndex + 1,
                totalAmount: state.totalAmount,
                extra: extra || 'coin_click' // Add extra field as requested
              }
              console.log('[CLIENT] /api/bet request', body)
              const resp = await fetch(`${API_BASE}/api/bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
              })
              const data = await resp.json()
              console.log('[CLIENT] /api/bet response', data)
              // Lose → mark pending; we'll show failed image after arrival at the coin
              if (!resp.ok || data.betResult === 'lose') {
                pendingLoseRef.current = true
              }
              // Win → proceed with movement to the clicked coin
            } catch (e) {
              try { console.log('[CLIENT] bet error', e) } catch {}
            }

            // Update local state and animate movement
            currentIndexRef.current = nextIndex
            chickenLaneRef.current = nextIndex
            chickenTargetRef.current = { x: c.x, y: c.y - 48 }
            // transiently hide panels to reveal extra road when moving right
            hidePanelsUntilRef.current = performance.now() + 800
            const middleSlot = Math.floor(VISIBLE / 2)
            if (nextIndex >= viewportStartRef.current + middleSlot) {
              hidePanelsUntilEndRef.current = true
            }
            if (nextIndex >= SHOW_END_AT_INDEX) {
              forceShowEndPanelRef.current = true
              hidePanelsUntilEndRef.current = false
              const lastVisibleIndex = viewportStartRef.current + VISIBLE - 1
              let overlayGlobalX = roadX + (lastVisibleIndex + 1) * slotWidth
              const endX = roadX + fullRoadWidth
              if (overlayGlobalX > endX) overlayGlobalX = endX
              endOverlayXRef.current = overlayGlobalX
            }

            // Update earnings preview
            const coinMultiplier = coinsRef.current![nextIndex].multiplier
            currentEarningsRef.current = betAmount * coinMultiplier
          }
        }
      }
    }

    canvas.addEventListener('click', onClick)
    loop()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('click', onClick)
    }
    // end of main effect
  }, [playing, onWin, onLose, userId, betAmount, betLevel])

  // respond to external Go button signals passed as prop (optional)
  // We use an effect that checks the prop value and, when it increments,
  // triggers a horizontal-only move of the chicken by one slot width when
  // the chicken has already reached the last coin (index TOTAL_ROADS - 1).
  // The component accepts the prop but we store the previous value in a ref
  // so that external increments cause a single response.
  // Note: import the prop if provided via destructuring to read it here.
  // (We can't reference props not declared in the function signature; so to
  // keep TypeScript happy we'll read from (window as any).__goSignal if the
  // user forgot to pass it. However, App passes `goSignal` so we simply read
  // it from arguments by accessing (arguments as any)[0]?.goSignal — but
  // that's fragile. Instead, destructure props at top-level. To avoid a
  // large rewrite here, we'll attach a small click handler on the document
  // to listen for a custom event `chicken-go` — App will dispatch it when
  // its Go button is clicked. This avoids changing many signatures.

  useEffect(() => {
    function onGoEvent() {
      // Only proceed if chicken is alive and not currently moving
      if (chickenFailedRef.current) return
      if (isMovingRef.current) return
      if (!gameStartedRef.current) return // Only allow GO when game is started

      const canvas = canvasRef.current!
      const sidewalkW = 140
      const rightPanelW = 140
      const roadX_local = sidewalkW
      const roadW_local = canvas.width - roadX_local
      const slotWidth_local = roadW_local / VISIBLE
      const fullRoadWidth_local = slotWidth_local * TOTAL_ROADS
      const endX = roadX_local + fullRoadWidth_local

      // Check if chicken is at the final coin (index TOTAL_ROADS - 1)
      if (currentIndexRef.current === TOTAL_ROADS - 1) {
        // If chicken already at or beyond endX (on sidewalk)
        if (chickenPosRef.current.x >= endX - 1) {
          // Chicken is on sidewalk - restart the game
          window.dispatchEvent(new CustomEvent('restart-game'))
          return
        }

        // Move to sidewalk center (X = endX), keep same Y
        sidewalkFixedRef.current = true
        chickenTargetRef.current = { x: endX, y: chickenPosRef.current.y }
        return
      }

      // If not at final coin, request server decision and then move to next coin (or fail)
      const nextIndex = currentIndexRef.current + 1
      if (nextIndex < TOTAL_ROADS && coinsRef.current) {
        (async () => {
          try {
            const API_BASE = (window as any).env?.VITE_API_KEY || 'http://localhost:4000'
            const state = (window as any).reduxStateGetter?.() || { userId }
            const body = {
              userId: state.userId || userId,
              betAmount,
              betLevel,
              betSteps: nextIndex + 1,
              totalAmount: state.totalAmount,
              extra: extra || 'go_button' // Add extra field as requested
            }
            console.log('[CLIENT] GO /api/bet request', body)
            const resp = await fetch(`${API_BASE}/api/bet`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            })
            const data = await resp.json()
            console.log('[CLIENT] GO /api/bet response', data)
            if (!resp.ok || data.betResult === 'lose') {
              // set to lose on arrival
              pendingLoseRef.current = true
            }
          } catch (e) { try { console.log('[CLIENT] GO bet error', e) } catch {} }

          const nextCoin = coinsRef.current![nextIndex]
          if (nextCoin) {
            currentIndexRef.current = nextIndex
            chickenLaneRef.current = nextIndex
            chickenTargetRef.current = { x: nextCoin.x, y: nextCoin.y - 48 }
            isMovingRef.current = true
            const coinMultiplier = nextCoin.multiplier
            currentEarningsRef.current = betAmount * coinMultiplier
          }
        })()
      }
    }

    window.addEventListener('chicken-go', onGoEvent as EventListener)
    return () => window.removeEventListener('chicken-go', onGoEvent as EventListener)
  }, [betAmount, betLevel, extra])

  // When Play is toggled on, start the game and deduct bet amount
  useEffect(() => {
    if (playing && !gameStartedRef.current) {
      // Deduct bet amount immediately when game starts
      dispatch(updateBalance(-betAmount))
      gameStartedRef.current = true
      currentEarningsRef.current = 0
      
      // Reset game state to original starting status so the game restarts
      // Coins remain visible at all times
      // Don't reset lane timers - let cars continue running
      // laneTimersRef.current = new Array(TOTAL_ROADS).fill(0).map(() => 1000 + Math.random() * 7000)
      // Reset chicken and movement state
      sidewalkFixedRef.current = false
      chickenFailedRef.current = false
      isMovingRef.current = false
      chickenTargetRef.current = null
      pendingLoseRef.current = false
      // set chicken to left sidewalk starting position
      const startX = 70
      const startY = coinsRef.current ? (coinsRef.current[0].y - 48) : 200
      chickenPosRef.current.x = startX
      chickenPosRef.current.y = startY
      chickenLaneRef.current = null
      currentIndexRef.current = -1
      // reset viewport and panels to initial state
      viewportStartRef.current = 0
      forceShowEndPanelRef.current = false
      endOverlayXRef.current = null
      hidePanelsUntilRef.current = 0
      hidePanelsUntilEndRef.current = false
      // reset policy animations
      policyAnimationsRef.current.clear()
      
      // Check server for first coin result and move chicken accordingly
      setTimeout(async () => {
        if (coinsRef.current && coinsRef.current.length > 0) {
          const firstCoin = coinsRef.current[0]
          const targetX = firstCoin.x
          const targetY = firstCoin.y - 48
          
          // Check with server for first coin result
          try {
            const API_BASE = (window as any).env?.VITE_API_KEY || 'http://localhost:4000'
            const state = (window as any).reduxStateGetter?.() || { userId, totalAmount: undefined }
            const body = {
              userId: state.userId || userId,
              betAmount,
              betLevel,
              betSteps: 1, // First coin
              totalAmount: state.totalAmount,
              extra: extra || 'game_start' // Add extra field as requested
            }
            console.log('[CLIENT] First coin /api/bet request', body)
            const resp = await fetch(`${API_BASE}/api/bet`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body)
            })
            const data = await resp.json()
            console.log('[CLIENT] First coin /api/bet response', data)
            
            // Set pending lose if server says lose
            if (!resp.ok || data.betResult === 'lose') {
              pendingLoseRef.current = true
            }
            
            // Move chicken to first coin
            chickenTargetRef.current = { x: targetX, y: targetY }
            isMovingRef.current = true
            chickenLaneRef.current = 0
            currentIndexRef.current = 0
            
            // Calculate earnings for first coin
            const coinMultiplier = firstCoin.multiplier
            const earnings = betAmount * coinMultiplier
            currentEarningsRef.current = earnings
            
          } catch (e) {
            console.log('[CLIENT] First coin bet error', e)
            // On error, just move to first coin normally
            chickenTargetRef.current = { x: targetX, y: targetY }
            isMovingRef.current = true
            chickenLaneRef.current = 0
            currentIndexRef.current = 0
            
            const coinMultiplier = firstCoin.multiplier
            const earnings = betAmount * coinMultiplier
            currentEarningsRef.current = earnings
          }
        }
      }, 500) // 500ms delay to show the game starting
      
    } else if (!playing) {
      // Reset game started flag when stopping
      gameStartedRef.current = false
      currentEarningsRef.current = 0
    }
  }, [playing, betAmount, dispatch, userId, betLevel, extra])

  // Cashout function - can be called from parent component
  const handleCashout = () => {
    if (gameStartedRef.current && currentEarningsRef.current > 0) {
      const earnings = currentEarningsRef.current
      // Add earnings to balance (bet amount was already deducted when game started)
      dispatch(updateBalance(earnings))
      if (onCashout) onCashout(earnings)
      
      // Reset game state completely to start from scratch
      gameStartedRef.current = false
      currentEarningsRef.current = 0
      
      // Reset all game elements to initial state
      // Coins remain visible at all times
      
      // Reset chicken to starting position
      const startX = 70
      const startY = coinsRef.current ? (coinsRef.current[0].y - 48) : 200
      chickenPosRef.current.x = startX
      chickenPosRef.current.y = startY
      chickenLaneRef.current = null
      currentIndexRef.current = -1
      
      // Reset movement state
      isMovingRef.current = false
      chickenTargetRef.current = null
      chickenFailedRef.current = false
      sidewalkFixedRef.current = false
      
      // Reset viewport to start
      viewportStartRef.current = 0
      viewportOffsetRef.current = 0
      
      // Reset panels
      forceShowEndPanelRef.current = false
      endOverlayXRef.current = null
      hidePanelsUntilRef.current = 0
      hidePanelsUntilEndRef.current = false
      
      // Don't reset lane timers - let cars continue running
      // laneTimersRef.current = new Array(TOTAL_ROADS).fill(0).map(() => 1000 + Math.random() * 7000)
      
      // Clear policy animations
      policyAnimationsRef.current.clear()
    }
  }

  // Expose cashout function and earnings to parent via window
  useEffect(() => {
    (window as any).cashoutGame = handleCashout
    ;(window as any).getCurrentEarnings = function() { return currentEarningsRef.current }
    return () => {
      delete (window as any).cashoutGame
      delete (window as any).getCurrentEarnings
    }
  }, [])

  return <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 1440, height: '100%', maxHeight: 800 }} />
}

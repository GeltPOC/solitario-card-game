'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

interface Card {
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

interface GameState {
  stock: Card[]
  waste: Card[]
  foundations: [Card[], Card[], Card[], Card[]]
  tableau: Card[][]  // 7 columns
}

interface DragInfo {
  source: 'waste' | 'foundation' | 'tableau'
  sourceIndex: number   // foundation index or tableau column index
  cards: Card[]         // cards being dragged (1+ from tableau, 1 from waste/foundation)
  cardIndex: number     // index within source pile
}

// ── Constants ──────────────────────────────────────────────────────────────
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = [1,2,3,4,5,6,7,8,9,10,11,12,13]

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
}
const RANK_LABEL: Record<Rank, string> = {
  1:'A',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K'
}

const RED_SUITS: Suit[] = ['hearts','diamonds']

function isRed(suit: Suit) { return RED_SUITS.includes(suit) }

// ── Deck utils ─────────────────────────────────────────────────────────────
function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false })
    }
  }
  return deck
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

function dealGame(): GameState {
  const deck = shuffle(createDeck())
  const tableau: Card[][] = Array.from({ length: 7 }, () => [])
  let idx = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx++], faceUp: row === col }
      tableau[col].push(card)
    }
  }
  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }))
  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
  }
}

// ── Move validation ─────────────────────────────────────────────────────────
function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) return card.rank === 13  // King on empty
  const top = column[column.length - 1]
  if (!top.faceUp) return false
  return top.rank === card.rank + 1 && isRed(top.suit) !== isRed(card.suit)
}

function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1  // Ace starts
  const top = foundation[foundation.length - 1]
  return top.suit === card.suit && top.rank === card.rank - 1
}

// ── Card Visual Component ───────────────────────────────────────────────────
function CardView({
  card, style, onMouseDown, ghost, mini
}: {
  card: Card
  style?: React.CSSProperties
  onMouseDown?: (e: React.MouseEvent) => void
  ghost?: boolean
  mini?: boolean
}) {
  const red = isRed(card.suit)
  const label = RANK_LABEL[card.rank]
  const sym = SUIT_SYMBOL[card.suit]

  if (!card.faceUp) {
    return (
      <div
        className="card-shadow"
        style={{
          width: mini ? 56 : 72,
          height: mini ? 80 : 100,
          borderRadius: 6,
          background: 'repeating-linear-gradient(45deg,#1a3a5c,#1a3a5c 4px,#1e4a7a 4px,#1e4a7a 8px)',
          border: '2px solid #2a5a9c',
          flexShrink: 0,
          opacity: ghost ? 0.4 : 1,
          ...style
        }}
        onMouseDown={onMouseDown}
      />
    )
  }

  return (
    <div
      className="card-shadow card-hover"
      style={{
        width: mini ? 56 : 72,
        height: mini ? 80 : 100,
        borderRadius: 6,
        background: '#fff',
        border: '1.5px solid #bbb',
        padding: '3px 4px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onMouseDown ? 'grab' : 'default',
        opacity: ghost ? 0.45 : 1,
        flexShrink: 0,
        position: style?.position ?? 'relative',
        ...style
      }}
      onMouseDown={onMouseDown}
    >
      <div style={{ fontSize: mini ? 11 : 13, fontWeight: 700, color: red ? '#c0392b' : '#1a1a2e', lineHeight: 1 }}>
        {label}<br/><span style={{ fontSize: mini ? 10 : 12 }}>{sym}</span>
      </div>
      <div style={{ fontSize: mini ? 20 : 28, textAlign: 'center', color: red ? '#c0392b' : '#1a1a2e', lineHeight: 1 }}>
        {sym}
      </div>
      <div style={{ fontSize: mini ? 11 : 13, fontWeight: 700, color: red ? '#c0392b' : '#1a1a2e', lineHeight: 1, transform: 'rotate(180deg)', alignSelf: 'flex-end' }}>
        {label}<br/><span style={{ fontSize: mini ? 10 : 12 }}>{sym}</span>
      </div>
    </div>
  )
}

// ── Empty Pile Placeholder ──────────────────────────────────────────────────
function EmptyPile({ label, onDrop, width = 72, height = 100 }: {
  label?: string
  onDrop?: () => void
  width?: number
  height?: number
}) {
  return (
    <div
      style={{
        width, height,
        borderRadius: 6,
        border: '2px dashed rgba(255,255,255,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 24,
        flexShrink: 0,
      }}
      onMouseUp={onDrop}
    >
      {label}
    </div>
  )
}

// ── Main Game ───────────────────────────────────────────────────────────────
export default function SolitaireGame() {
  const [game, setGame] = useState<GameState>(() => dealGame())
  const [won, setWon] = useState(false)
  const [moves, setMoves] = useState(0)

  // Drag state (refs for perf, no re-render during drag)
  const dragInfo = useRef<DragInfo | null>(null)
  const dragEl = useRef<HTMLDivElement | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  // Win check
  useEffect(() => {
    const total = game.foundations.reduce((s, f) => s + f.length, 0)
    if (total === 52) setWon(true)
  }, [game.foundations])

  // ── Drag helpers ────────────────────────────────────────────────────────
  const startDrag = useCallback((e: React.MouseEvent, info: DragInfo) => {
    e.preventDefault()
    dragInfo.current = info

    // Create ghost element
    const ghost = document.createElement('div')
    ghost.style.position = 'fixed'
    ghost.style.pointerEvents = 'none'
    ghost.style.zIndex = '9999'
    ghost.style.left = e.clientX - 36 + 'px'
    ghost.style.top = e.clientY - 20 + 'px'
    ghost.style.display = 'flex'
    ghost.style.flexDirection = 'column'

    info.cards.forEach((card, i) => {
      const c = document.createElement('div')
      c.style.position = i === 0 ? 'relative' : 'absolute'
      c.style.top = i === 0 ? '0' : `${i * 22}px`
      c.style.left = '0'
      c.style.width = '72px'
      c.style.height = '100px'
      c.style.borderRadius = '6px'
      c.style.background = '#fff'
      c.style.border = '1.5px solid #bbb'
      c.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)'
      c.style.display = 'flex'
      c.style.alignItems = 'center'
      c.style.justifyContent = 'center'
      c.style.fontSize = '22px'
      c.style.fontWeight = '700'
      c.style.color = isRed(card.suit) ? '#c0392b' : '#1a1a2e'
      c.style.userSelect = 'none'
      c.innerText = `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`
      if (i > 0) ghost.style.height = `${100 + i * 22}px`
      ghost.appendChild(c)
    })
    ghost.style.height = `${100 + Math.max(0, info.cards.length - 1) * 22}px`
    ghost.style.width = '72px'
    document.body.appendChild(ghost)
    dragEl.current = ghost
    dragOffset.current = { x: 36, y: 20 }
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      if (dragEl.current) {
        dragEl.current.style.left = e.clientX - dragOffset.current.x + 'px'
        dragEl.current.style.top = e.clientY - dragOffset.current.y + 'px'
      }
    }
    const onUp = (e: MouseEvent) => {
      if (dragEl.current) {
        document.body.removeChild(dragEl.current)
        dragEl.current = null
      }
      // Find drop target
      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (target) {
        const dropEl = (target as HTMLElement).closest('[data-drop]') as HTMLElement | null
        if (dropEl && dragInfo.current) {
          const dropType = dropEl.getAttribute('data-drop')!
          const dropIndex = parseInt(dropEl.getAttribute('data-index') ?? '0')
          handleDrop(dropType, dropIndex)
        }
      }
      dragInfo.current = null
      setDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging])

  // ── Drop handler ────────────────────────────────────────────────────────
  const handleDrop = useCallback((dropType: string, dropIndex: number) => {
    const info = dragInfo.current
    if (!info) return

    setGame(prev => {
      const g = deepClone(prev)
      const { source, sourceIndex, cards, cardIndex } = info

      if (dropType === 'foundation') {
        // Only single card allowed on foundation
        if (cards.length !== 1) return prev
        const card = cards[0]
        if (!canPlaceOnFoundation(card, g.foundations[dropIndex])) return prev
        removeFromSource(g, source, sourceIndex, cardIndex)
        g.foundations[dropIndex].push({ ...card, faceUp: true })
        flipTopTableau(g, source, sourceIndex)
        setMoves(m => m + 1)
        return g
      }

      if (dropType === 'tableau') {
        const col = g.tableau[dropIndex]
        if (!canPlaceOnTableau(cards[0], col)) return prev
        removeFromSource(g, source, sourceIndex, cardIndex)
        cards.forEach(c => col.push({ ...c, faceUp: true }))
        flipTopTableau(g, source, sourceIndex)
        setMoves(m => m + 1)
        return g
      }

      return prev
    })
  }, [])

  // ── Stock click ─────────────────────────────────────────────────────────
  const handleStockClick = useCallback(() => {
    setGame(prev => {
      const g = deepClone(prev)
      if (g.stock.length === 0) {
        // Recycle waste
        g.stock = g.waste.reverse().map(c => ({ ...c, faceUp: false }))
        g.waste = []
      } else {
        const card = g.stock.pop()!
        card.faceUp = true
        g.waste.push(card)
      }
      return g
    })
    setMoves(m => m + 1)
  }, [])

  // ── Auto-move to foundation (double-click) ────────────────────────────
  const autoMoveToFoundation = useCallback((card: Card, source: 'waste' | 'tableau', sourceIndex: number, cardIndex: number) => {
    setGame(prev => {
      const g = deepClone(prev)
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceOnFoundation(card, g.foundations[fi])) {
          removeFromSource(g, source, sourceIndex, cardIndex)
          g.foundations[fi].push({ ...card, faceUp: true })
          flipTopTableau(g, source, sourceIndex)
          setMoves(m => m + 1)
          return g
        }
      }
      return prev
    })
  }, [])

  // ── Restart ─────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    setGame(dealGame())
    setWon(false)
    setMoves(0)
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────
  const CARD_W = 72
  const CARD_H = 100

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a5c2a 0%, #0f3d1a 100%)',
      padding: '16px',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, maxWidth: 600, margin: '0 auto 16px' }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: 1 }}>♠ Solitario</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Movimientos: <b style={{ color: '#fff' }}>{moves}</b></span>
          <button
            onClick={restart}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              padding: '6px 16px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Nueva Partida
          </button>
        </div>
      </div>

      {/* Game Board */}
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Top row: stock, waste, gap, 4 foundations */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-start' }}>
          {/* Stock */}
          <div
            onClick={handleStockClick}
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            {game.stock.length > 0 ? (
              <div className="card-shadow" style={{
                width: CARD_W, height: CARD_H, borderRadius: 6,
                background: 'repeating-linear-gradient(45deg,#1a3a5c,#1a3a5c 4px,#1e4a7a 4px,#1e4a7a 8px)',
                border: '2px solid #2a5a9c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 28 }}>↺</span>
              </div>
            ) : (
              <EmptyPile label="↺" width={CARD_W} height={CARD_H} />
            )}
          </div>

          {/* Waste */}
          <div style={{ flexShrink: 0, position: 'relative', width: CARD_W, height: CARD_H }}>
            {game.waste.length === 0 ? (
              <EmptyPile width={CARD_W} height={CARD_H} />
            ) : (() => {
              const top = game.waste[game.waste.length - 1]
              const prev2 = game.waste.length >= 3 ? game.waste[game.waste.length - 3] : null
              const prev1 = game.waste.length >= 2 ? game.waste[game.waste.length - 2] : null
              return (
                <div style={{ position: 'relative', width: CARD_W, height: CARD_H }}>
                  {prev2 && <div style={{ position: 'absolute', left: 0, top: 0, opacity: 0.5 }}><CardView card={{ ...prev2, faceUp: true }} /></div>}
                  {prev1 && <div style={{ position: 'absolute', left: 8, top: 0, opacity: 0.7 }}><CardView card={{ ...prev1, faceUp: true }} /></div>}
                  <div style={{ position: 'absolute', left: prev1 ? 16 : 0, top: 0 }}>
                    <CardView
                      card={top}
                      onMouseDown={e => {
                        startDrag(e, { source: 'waste', sourceIndex: 0, cards: [top], cardIndex: game.waste.length - 1 })
                      }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Foundations */}
          {game.foundations.map((foundation, fi) => (
            <div
              key={fi}
              data-drop="foundation"
              data-index={fi}
              style={{ flexShrink: 0, position: 'relative', width: CARD_W, height: CARD_H }}
              onMouseUp={() => {
                if (dragInfo.current) handleDrop('foundation', fi)
              }}
            >
              {foundation.length === 0 ? (
                <EmptyPile label={SUIT_SYMBOL[SUITS[fi]]} width={CARD_W} height={CARD_H} />
              ) : (
                <CardView
                  card={foundation[foundation.length - 1]}
                  onMouseDown={e => {
                    const card = foundation[foundation.length - 1]
                    startDrag(e, { source: 'foundation', sourceIndex: fi, cards: [card], cardIndex: foundation.length - 1 })
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {game.tableau.map((column, ci) => (
            <div
              key={ci}
              data-drop="tableau"
              data-index={ci}
              style={{
                flex: 1,
                minWidth: CARD_W,
                maxWidth: CARD_W,
                position: 'relative',
                minHeight: CARD_H,
              }}
              onMouseUp={() => {
                if (dragInfo.current) handleDrop('tableau', ci)
              }}
            >
              {column.length === 0 ? (
                <EmptyPile width={CARD_W} height={CARD_H} />
              ) : (
                <div style={{ position: 'relative', height: CARD_H + Math.max(0, column.length - 1) * 24 }}>
                  {column.map((card, idx) => {
                    const offset = idx * 24
                    const isTop = idx === column.length - 1
                    const draggable = card.faceUp
                    return (
                      <div
                        key={card.id}
                        data-drop="tableau"
                        data-index={ci}
                        style={{ position: 'absolute', top: offset, left: 0, zIndex: idx }}
                      >
                        <CardView
                          card={card}
                          onMouseDown={draggable ? (e) => {
                            const dragCards = column.slice(idx)
                            startDrag(e, { source: 'tableau', sourceIndex: ci, cards: dragCards, cardIndex: idx })
                          } : undefined}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Win overlay */}
      {won && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'linear-gradient(135deg,#2ecc71,#27ae60)',
            borderRadius: 20,
            padding: '48px 56px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🎉</div>
            <h2 style={{ color: '#fff', fontSize: 36, fontWeight: 900, margin: '0 0 8px' }}>¡Ganaste!</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, margin: '0 0 28px' }}>
              Completaste el solitario en <b>{moves}</b> movimientos
            </p>
            <button
              onClick={restart}
              style={{
                background: '#fff',
                color: '#27ae60',
                border: 'none',
                borderRadius: 12,
                padding: '14px 36px',
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Jugar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Utility functions ───────────────────────────────────────────────────────
function deepClone(g: GameState): GameState {
  return {
    stock: g.stock.map(c => ({ ...c })),
    waste: g.waste.map(c => ({ ...c })),
    foundations: g.foundations.map(f => f.map(c => ({ ...c }))) as [Card[], Card[], Card[], Card[]],
    tableau: g.tableau.map(col => col.map(c => ({ ...c }))),
  }
}

function removeFromSource(
  g: GameState,
  source: 'waste' | 'foundation' | 'tableau',
  sourceIndex: number,
  cardIndex: number
) {
  if (source === 'waste') {
    g.waste.splice(cardIndex, 1)
  } else if (source === 'foundation') {
    g.foundations[sourceIndex].splice(cardIndex, 1)
  } else {
    g.tableau[sourceIndex].splice(cardIndex)
  }
}

function flipTopTableau(g: GameState, source: string, sourceIndex: number) {
  if (source === 'tableau') {
    const col = g.tableau[sourceIndex]
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true
    }
  }
}

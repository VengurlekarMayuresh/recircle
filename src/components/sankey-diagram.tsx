"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface SankeyNode {
  id: string
  label: string
  color: string
  column: number
  value: number
}

interface SankeyLink {
  source: string
  target: string
  value: number
  color: string
}

interface SankeyProps {
  data?: {
    sources: { name: string; count: number; role: string }[]
    categories: { name: string; count: number }[]
    destinations: { name: string; count: number }[]
  }
}

const NODE_COLORS = {
  // Sources
  individuals: '#10b981',
  businesses: '#3b82f6',
  ngos: '#8b5cf6',
  // Categories
  construction: '#f59e0b',
  furniture: '#06b6d4',
  packaging: '#84cc16',
  electronics: '#f97316',
  industrial: '#6366f1',
  textiles: '#ec4899',
  metals: '#64748b',
  wood: '#a16207',
  // Destinations
  reuse: '#059669',
  repair: '#0284c7',
  recycle: '#7c3aed',
  dispose: '#dc2626',
}

const DEFAULT_DATA = {
  sources: [
    { name: 'Businesses', count: 28, role: 'business' },
    { name: 'Individuals', count: 10, role: 'individual' },
    { name: 'NGOs', count: 6, role: 'ngo' },
  ],
  categories: [
    { name: 'Construction', count: 12 },
    { name: 'Furniture', count: 8 },
    { name: 'Packaging', count: 6 },
    { name: 'Electronics', count: 7 },
    { name: 'Textiles', count: 7 },
    { name: 'Metals', count: 4 },
  ],
  destinations: [
    { name: 'Reuse', count: 29 },
    { name: 'Repair', count: 8 },
    { name: 'Recycle', count: 5 },
    { name: 'Dispose', count: 2 },
  ]
}

function buildSankeyLayout(data: typeof DEFAULT_DATA, width: number, height: number) {
  const PADDING = 20
  const NODE_WIDTH = 140
  const NODE_GAP = 16
  const COL_POSITIONS = [PADDING, (width - NODE_WIDTH) / 2, width - NODE_WIDTH - PADDING]

  const totalSource = data.sources.reduce((s, n) => s + n.count, 0)
  const totalDest = data.destinations.reduce((s, n) => s + n.count, 0)

  function layoutColumn(items: { name: string; count: number }[], col: number, total: number) {
    const availH = height - PADDING * 2 - NODE_GAP * (items.length - 1)
    let y = PADDING
    return items.map((item) => {
      const h = Math.max(28, (item.count / total) * availH)
      const node = { ...item, x: COL_POSITIONS[col], y, h, col }
      y += h + NODE_GAP
      return node
    })
  }

  const srcNodes = layoutColumn(data.sources, 0, totalSource)
  const catNodes = layoutColumn(data.categories, 1, totalSource)
  const dstNodes = layoutColumn(data.destinations, 2, totalDest)

  return { srcNodes, catNodes, dstNodes, NODE_WIDTH, COL_POSITIONS }
}

function FlowPath({ x1, y1, h1, x2, y2, h2, color, value, nodeWidth }: any) {
  const [hovered, setHovered] = useState(false)

  const x1r = x1 + nodeWidth
  const x2l = x2
  const cx = (x1r + x2l) / 2
  const topPath = `M${x1r},${y1} C${cx},${y1} ${cx},${y2} ${x2l},${y2}`
  const botPath = `L${x2l},${y2 + h2} C${cx},${y2 + h2} ${cx},${y1 + h1} ${x1r},${y1 + h1} Z`
  const d = topPath + ' ' + botPath

  return (
    <motion.path
      d={d}
      fill={color}
      fillOpacity={hovered ? 0.5 : 0.25}
      stroke={color}
      strokeOpacity={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ fillOpacity: 0 }}
      animate={{ fillOpacity: hovered ? 0.5 : 0.25 }}
      transition={{ duration: 0.3 }}
      style={{ cursor: 'pointer' }}
    >
      {hovered && <title>{value} items</title>}
    </motion.path>
  )
}

export function SankeyDiagram({ data = DEFAULT_DATA }: SankeyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 360 })

  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth || 800,
          height: Math.max(300, (containerRef.current.clientWidth || 800) * 0.4)
        })
      }
    }
    updateDims()
    window.addEventListener('resize', updateDims)
    return () => window.removeEventListener('resize', updateDims)
  }, [])

  const { srcNodes, catNodes, dstNodes, NODE_WIDTH, COL_POSITIONS } = buildSankeyLayout(
    data, dims.width, dims.height
  )

  const DEST_COLORS = ['#059669', '#0284c7', '#7c3aed', '#dc2626']
  const SRC_COLORS = ['#3b82f6', '#10b981', '#8b5cf6']
  const CAT_COLORS = ['#f59e0b', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#64748b', '#a16207', '#6366f1']

  const totalCat = data.categories.reduce((s, c) => s + c.count, 0)
  const totalDest = data.destinations.reduce((s, d) => s + d.count, 0)

  return (
    <div ref={containerRef} className="w-full">
      {/* Column Headers */}
      <div className="flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
        <span style={{ width: NODE_WIDTH, textAlign: 'center' }}>Sources</span>
        <span style={{ width: NODE_WIDTH, textAlign: 'center' }}>Categories</span>
        <span style={{ width: NODE_WIDTH, textAlign: 'center' }}>Destinations</span>
      </div>

      <svg width={dims.width} height={dims.height} className="overflow-visible">
        {/* Flow paths: source → category */}
        {srcNodes.map((src, si) => {
          const srcColor = SRC_COLORS[si % SRC_COLORS.length]
          // Distribute to categories proportionally
          let catY = 0
          return catNodes.map((cat, ci) => {
            const catColor = CAT_COLORS[ci % CAT_COLORS.length]
            const ratio = cat.count / totalCat
            const h1 = (src.h * ratio)
            const h2 = (cat.h * (src.count / (data.sources.reduce((s,n)=>s+n.count,0))))
            const y1 = src.y + si * (src.h / srcNodes.length)
            const y2 = cat.y + si * (cat.h / srcNodes.length)
            return (
              <FlowPath
                key={`${si}-${ci}`}
                x1={src.x} y1={y1} h1={Math.max(3, h1 * 0.9)}
                x2={cat.x} y2={y2} h2={Math.max(3, h2)}
                color={catColor}
                value={Math.round(ratio * src.count)}
                nodeWidth={NODE_WIDTH}
              />
            )
          })
        })}

        {/* Flow paths: category → destination */}
        {catNodes.map((cat, ci) => {
          const catColor = CAT_COLORS[ci % CAT_COLORS.length]
          return dstNodes.map((dst, di) => {
            const dstColor = DEST_COLORS[di % DEST_COLORS.length]
            const ratio = dst.count / totalDest
            const h1 = cat.h * ratio
            const h2 = dst.h * (cat.count / totalCat)
            const y1 = cat.y + di * (cat.h / dstNodes.length)
            const y2 = dst.y + ci * (dst.h / catNodes.length)
            return (
              <FlowPath
                key={`c${ci}-d${di}`}
                x1={cat.x} y1={y1} h1={Math.max(3, h1 * 0.8)}
                x2={dst.x} y2={y2} h2={Math.max(3, h2)}
                color={dstColor}
                value={Math.round(ratio * cat.count)}
                nodeWidth={NODE_WIDTH}
              />
            )
          })
        })}

        {/* Source nodes */}
        {srcNodes.map((node, i) => (
          <motion.g key={`src-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}>
            <rect x={node.x} y={node.y} width={NODE_WIDTH} height={node.h}
              rx={8} fill={SRC_COLORS[i % SRC_COLORS.length]} />
            <text x={node.x + NODE_WIDTH / 2} y={node.y + node.h / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={12} fontWeight="bold" className="select-none">
              {node.name}
            </text>
            <text x={node.x + NODE_WIDTH / 2} y={node.y + node.h / 2 + 15}
              textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.8)" fontSize={10} className="select-none">
              {node.count}
            </text>
          </motion.g>
        ))}

        {/* Category nodes */}
        {catNodes.map((node, i) => (
          <motion.g key={`cat-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}>
            <rect x={node.x} y={node.y} width={NODE_WIDTH} height={node.h}
              rx={8} fill={CAT_COLORS[i % CAT_COLORS.length]} />
            {node.h > 24 && (
              <>
                <text x={node.x + NODE_WIDTH / 2} y={node.y + node.h / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={11} fontWeight="bold" className="select-none">
                  {node.name}
                </text>
                {node.h > 40 && (
                  <text x={node.x + NODE_WIDTH / 2} y={node.y + node.h / 2 + 14}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.8)" fontSize={10} className="select-none">
                    {node.count}
                  </text>
                )}
              </>
            )}
          </motion.g>
        ))}

        {/* Destination nodes */}
        {dstNodes.map((node, i) => (
          <motion.g key={`dst-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}>
            <rect x={node.x} y={node.y} width={NODE_WIDTH} height={node.h}
              rx={8} fill={DEST_COLORS[i % DEST_COLORS.length]} />
            <text x={node.x + NODE_WIDTH / 2} y={node.y + node.h / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill="white" fontSize={12} fontWeight="bold" className="select-none">
              {node.name}
            </text>
            {node.h > 35 && (
              <text x={node.x + NODE_WIDTH / 2} y={node.y + node.h / 2 + 15}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.8)" fontSize={10} className="select-none">
                {node.count}
              </text>
            )}
          </motion.g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 px-2">
        {[
          { color: '#059669', label: 'Reuse' },
          { color: '#0284c7', label: 'Repair' },
          { color: '#7c3aed', label: 'Recycle' },
          { color: '#dc2626', label: 'Dispose' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-auto">Hover flows for details</span>
      </div>
    </div>
  )
}

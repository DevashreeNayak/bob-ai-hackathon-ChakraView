import { useEffect, useRef, useState } from 'react';
import type { Entity, Relationship } from '@/lib/supabase';
import { buildGraph, getEdgeColor, getNodeTypeStyle, simulate, type GraphNode } from '@/lib/graph';
import { ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';

interface Props {
  entities: Entity[];
  relationships: Relationship[];
  kingpinId?: string;
}

const TYPE_LABELS: Record<Entity['type'], string> = {
  person: 'Person',
  phone: 'Phone',
  account: 'Account',
  device: 'Device',
  upi: 'UPI ID',
  location: 'Location',
};

const EDGE_LABELS: Record<Relationship['kind'], string> = {
  owns: 'owns',
  calls: 'calls',
  transacts: 'transacts',
  uses_device: 'uses device',
  located_at: 'located at',
  controls: 'controls',
};

const ALL_TYPES: Entity['type'][] = ['person', 'phone', 'account', 'device', 'upi', 'location'];
const ALL_ROLES = ['kingpin', 'mule', 'victim', 'suspect'];

export function NetworkGraph({ entities, relationships, kingpinId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<{ source: string; target: string; kind: Relationship['kind']; weight: number }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dims, setDims] = useState({ w: 800, h: 560 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState<Set<Entity['type']>>(new Set());
  const [hiddenRoles, setHiddenRoles] = useState<Set<string>>(new Set());
  const dragOffset = useRef({ x: 0, y: 0 });

  function toggleType(t: Entity['type']) {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function toggleRole(r: string) {
    setHiddenRoles((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  function isNodeVisible(n: GraphNode) {
    if (hiddenTypes.has(n.type)) return false;
    if (n.role && hiddenRoles.has(n.role)) return false;
    return true;
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = buildGraph(entities, relationships);
    setNodes(g.nodes);
    setEdges(g.edges);
  }, [entities, relationships]);

  // simulation loop
  useEffect(() => {
    if (nodes.length === 0) return;
    let raf = 0;
    let stable = 0;
    const tick = () => {
      setNodes((prev) => {
        const copy = prev.map((n) => ({ ...n }));
        simulate(copy, edges, dims.w, dims.h);
        // detect stability
        let moved = 0;
        for (let i = 0; i < copy.length; i++) {
          const dx = copy[i].x - prev[i].x;
          const dy = copy[i].y - prev[i].y;
          if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) moved++;
        }
        if (moved === 0) stable++;
        else stable = 0;
        return copy;
      });
      if (stable < 8) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [edges, dims]);

  // dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / zoom;
      const y = (ev.clientY - rect.top) / zoom;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === dragging ? { ...n, x: x - dragOffset.current.x, y: y - dragOffset.current.y, vx: 0, vy: 0 } : n,
        ),
      );
    };
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, zoom]);

  const visibleNodeIds = new Set(nodes.filter(isNodeVisible).map((n) => n.id));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const maxDegree = edges.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] ?? 0) + 1;
    acc[e.target] = (acc[e.target] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeFilters = hiddenTypes.size + hiddenRoles.size;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl">
      {/* Controls */}
      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        <button
          onClick={() => setShowFilter((v) => !v)}
          className={`grid h-9 w-9 place-items-center rounded-lg border backdrop-blur transition ${
            showFilter || activeFilters > 0
              ? 'border-sky-400 bg-sky-500 text-white'
              : 'border-slate-300/40 bg-white/80 text-slate-700 hover:bg-white dark:border-slate-600/40 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700'
          }`}
          title="Filter nodes"
        >
          <Filter className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300/40 bg-white/80 text-slate-700 backdrop-blur transition hover:bg-white dark:border-slate-600/40 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300/40 bg-white/80 text-slate-700 backdrop-blur transition hover:bg-white dark:border-slate-600/40 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-300/40 bg-white/80 text-slate-700 backdrop-blur transition hover:bg-white dark:border-slate-600/40 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="absolute right-3 top-14 z-20 w-52 rounded-xl border border-slate-300/40 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-600/40 dark:bg-slate-900/95">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Entity Types</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ALL_TYPES.map((t) => {
              const s = getNodeTypeStyle(t);
              const hidden = hiddenTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                    hidden
                      ? 'border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: hidden ? '#94a3b8' : s.bg }} />
                  {TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Person Roles</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ALL_ROLES.map((r) => {
              const hidden = hiddenRoles.has(r);
              const color = r === 'kingpin' ? '#fbbf24' : r === 'mule' ? '#f87171' : r === 'victim' ? '#4ade80' : '#94a3b8';
              return (
                <button
                  key={r}
                  onClick={() => toggleRole(r)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                    hidden
                      ? 'border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: hidden ? '#94a3b8' : color }} />
                  {r}
                </button>
              );
            })}
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => { setHiddenTypes(new Set()); setHiddenRoles(new Set()); }}
              className="mt-1 w-full rounded-lg bg-slate-100 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Clear filters ({activeFilters})
            </button>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="block"
      >
        <defs>
          {Object.entries(EDGE_LABELS).map(([kind, label]) => (
            <marker
              key={kind}
              id={`arrow-${kind}`}
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={getEdgeColor(kind as Relationship['kind'])} />
            </marker>
          ))}
        </defs>

        <g transform={`scale(${zoom})`}>
          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodeMap.get(e.source);
            const b = nodeMap.get(e.target);
            if (!a || !b) return null;
            const srcVisible = visibleNodeIds.has(e.source);
            const tgtVisible = visibleNodeIds.has(e.target);
            if (!srcVisible || !tgtVisible) return null;
            const isHovered = hovered === e.source || hovered === e.target;
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={getEdgeColor(e.kind)}
                  strokeWidth={isHovered ? 3 : 1.8}
                  strokeOpacity={isHovered ? 1 : 0.55}
                  markerEnd={`url(#arrow-${e.kind})`}
                />
                {isHovered && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 6}
                    textAnchor="middle"
                    className="fill-slate-700 text-[10px] font-medium dark:fill-slate-200"
                  >
                    {EDGE_LABELS[e.kind]}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            if (!visibleNodeIds.has(n.id)) return null;
            const style = getNodeTypeStyle(n.type);
            const degree = maxDegree[n.id] ?? 0;
            const radius = n.type === 'person' ? 18 + Math.min(degree * 2, 10) : 14;
            const isKingpin = n.id === kingpinId;
            const isHovered = hovered === n.id;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                style={{ cursor: 'grab' }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  if (!svgRef.current) return;
                  const rect = svgRef.current.getBoundingClientRect();
                  const x = (ev.clientX - rect.left) / zoom;
                  const y = (ev.clientY - rect.top) / zoom;
                  dragOffset.current = { x: x - n.x, y: y - n.y };
                  setDragging(n.id);
                }}
              >
                {isKingpin && (
                  <circle r={radius + 8} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 3" className="animate-spin" style={{ transformOrigin: 'center', animationDuration: '8s' }} />
                )}
                <circle
                  r={radius}
                  fill={style.bg}
                  fillOpacity={0.9}
                  stroke={isKingpin ? '#fbbf24' : style.ring}
                  strokeWidth={isKingpin ? 3 : isHovered ? 2.5 : 1.5}
                  className="transition-all"
                />
                {isHovered && (
                  <circle r={radius + 4} fill="none" stroke={style.ring} strokeWidth="1.5" strokeOpacity="0.5" />
                )}
                <text
                  y={radius + 14}
                  textAnchor="middle"
                  className="pointer-events-none text-[11px] font-semibold"
                  fill="currentColor"
                  style={{ color: 'inherit' }}
                >
                  <tspan className="fill-slate-700 dark:fill-slate-200">{n.label.length > 16 ? n.label.slice(0, 14) + '…' : n.label}</tspan>
                </text>
                {n.role && (
                  <text y={-radius - 6} textAnchor="middle" className="pointer-events-none text-[9px] font-bold uppercase tracking-wider">
                    <tspan fill={n.role === 'kingpin' ? '#fbbf24' : n.role === 'mule' ? '#f87171' : n.role === 'victim' ? '#4ade80' : '#94a3b8'}>
                      {n.role}
                    </tspan>
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-xl border border-slate-300/40 bg-white/85 p-3 text-[11px] backdrop-blur dark:border-slate-600/40 dark:bg-slate-900/85">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(TYPE_LABELS).map(([t, label]) => {
            const s = getNodeTypeStyle(t as Entity['type']);
            return (
              <div key={t} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.bg }} />
                <span className="text-slate-600 dark:text-slate-300">{label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-300/30 pt-1.5 dark:border-slate-600/30">
          {Object.entries(EDGE_LABELS).map(([k, label]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: getEdgeColor(k as Relationship['kind']) }} />
              <span className="text-slate-500 dark:text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

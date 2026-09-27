import type { Entity, Relationship } from './supabase';

export interface GraphNode {
  id: string;
  label: string;
  type: Entity['type'];
  role?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  kind: Relationship['kind'];
  weight: number;
}

const TYPE_COLORS: Record<Entity['type'], { bg: string; ring: string; text: string }> = {
  person: { bg: '#0ea5e9', ring: '#38bdf8', text: '#0c4a6e' },
  phone: { bg: '#22c55e', ring: '#4ade80', text: '#14532d' },
  account: { bg: '#f59e0b', ring: '#fbbf24', text: '#78350f' },
  device: { bg: '#ef4444', ring: '#f87171', text: '#7f1d1d' },
  upi: { bg: '#8b5cf6', ring: '#a78bfa', text: '#4c1d95' },
  location: { bg: '#64748b', ring: '#94a3b8', text: '#1e293b' },
};

const EDGE_COLORS: Record<Relationship['kind'], string> = {
  owns: '#38bdf8',
  calls: '#4ade80',
  transacts: '#fbbf24',
  uses_device: '#f87171',
  located_at: '#94a3b8',
  controls: '#a78bfa',
};

export function getNodeTypeStyle(type: Entity['type']) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.person;
}

export function getEdgeColor(kind: Relationship['kind']) {
  return EDGE_COLORS[kind] ?? '#94a3b8';
}

export function buildGraph(entities: Entity[], relationships: Relationship[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const cx = 400;
  const cy = 300;
  const n = entities.length;
  const radius = Math.min(220, 60 + n * 14);

  const nodes: GraphNode[] = entities.map((e, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2;
    return {
      id: e.id,
      label: e.label,
      type: e.type,
      role: e.meta?.role,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const edges: GraphEdge[] = relationships.map((r) => ({
    source: r.source,
    target: r.target,
    kind: r.kind,
    weight: r.weight ?? 1,
  }));

  return { nodes, edges };
}

// Simple force-directed layout simulation step.
export function simulate(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const k = 120; // ideal distance
  const repulsion = 6000;

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Attraction along edges
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const a = nodeMap.get(e.source);
    const b = nodeMap.get(e.target);
    if (!a || !b) continue;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const force = (dist - k) * 0.04 * e.weight;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Gravity toward center
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.01;
    n.vy += (cy - n.y) * 0.01;
  }

  // Apply velocity with damping
  const damping = 0.82;
  for (const n of nodes) {
    if (n.fixed) continue;
    n.vx *= damping;
    n.vy *= damping;
    n.x += Math.max(-12, Math.min(12, n.vx));
    n.y += Math.max(-12, Math.min(12, n.vy));
    // keep in bounds
    n.x = Math.max(40, Math.min(width - 40, n.x));
    n.y = Math.max(40, Math.min(height - 40, n.y));
  }
}

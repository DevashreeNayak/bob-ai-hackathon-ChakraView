import { Users, Phone, CreditCard, Smartphone, MapPin, AtSign, Network } from 'lucide-react';
import type { Entity } from '@/lib/supabase';
import { getNodeTypeStyle } from '@/lib/graph';

interface Props {
  entities: Entity[];
  relationships: { source: string; target: string; kind: string }[];
  kingpinId?: string;
}

const TYPE_ICONS: Record<Entity['type'], typeof Users> = {
  person: Users,
  phone: Phone,
  account: CreditCard,
  device: Smartphone,
  upi: AtSign,
  location: MapPin,
};

const ROLE_STYLES: Record<string, string> = {
  kingpin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  mule: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  victim: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  suspect: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export function EntityPanel({ entities, relationships, kingpinId }: Props) {
  const grouped = entities.reduce((acc, e) => {
    (acc[e.type] ??= []).push(e);
    return acc;
  }, {} as Record<string, Entity[]>);

  return (
    <div className="flex h-full flex-col">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
        <Network className="h-5 w-5 text-sky-500" />
        Entity Map
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
          {entities.length} entities · {relationships.length} links
        </span>
      </h2>

      <div className="scrollbar-thin mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {Object.entries(grouped).map(([type, items]) => {
          const Icon = TYPE_ICONS[type as Entity['type']] ?? Users;
          const style = getNodeTypeStyle(type as Entity['type']);
          return (
            <div key={type}>
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Icon className="h-3.5 w-3.5" style={{ color: style.bg }} />
                {type} ({items.length})
              </div>
              <div className="space-y-1.5">
                {items.map((e) => (
                  <div
                    key={e.id}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 transition ${
                      kingpinId === e.id
                        ? 'border-amber-400 bg-amber-50/60 dark:border-amber-500 dark:bg-amber-900/20'
                        : 'border-slate-200/70 bg-white dark:border-slate-700/70 dark:bg-slate-800/50'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: style.bg }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-sm font-medium text-slate-700 dark:text-slate-200">{e.label}</p>
                      {e.meta && Object.entries(e.meta).length > 0 && (
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {Object.entries(e.meta).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    {e.meta?.role && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_STYLES[e.meta.role] ?? ''}`}>
                        {e.meta.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {entities.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No entities extracted yet.</p>
        )}
      </div>
    </div>
  );
}

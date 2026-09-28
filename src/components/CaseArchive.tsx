import { useState } from 'react';
import { Search, Loader2, FileText, AlertTriangle, ShieldCheck, Clock, Trash2, X, StickyNote, ChevronDown, Save } from 'lucide-react';
import type { CaseRecord, CaseStatus } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface Props {
  cases: CaseRecord[];
  loading: boolean;
  onSelect: (c: CaseRecord) => void;
  onDeleted: () => void;
  onUpdated: () => void;
  currentId?: string;
}

const RISK_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  closed: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const STATUS_OPTIONS: CaseStatus[] = ['active', 'review', 'closed'];

// Extended CaseRecord with optional investigator notes field
interface CaseRecordExtended extends CaseRecord {
  notes?: string;
}

export function CaseArchive({ cases, loading, onSelect, onDeleted, onUpdated, currentId }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = cases.filter((c) => {
    const q = query.toLowerCase();
    const matches =
      c.case_number.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.pattern.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q);
    const statusMatch = statusFilter === 'all' || c.status === statusFilter;
    return matches && statusMatch;
  });

  async function handleDelete(id: string) {
    const { error } = await supabase.from('chakraview_cases').delete().eq('id', id);
    if (!error) {
      setConfirmDelete(null);
      onDeleted();
    }
  }

  async function handleStatusChange(id: string, newStatus: CaseStatus) {
    await supabase.from('chakraview_cases').update({ status: newStatus }).eq('id', id);
    onUpdated();
  }

  async function handleSaveNotes(id: string) {
    setSaving(id);
    const notes = editNotes[id] ?? '';
    await supabase.from('chakraview_cases').update({ notes } as any).eq('id', id);
    setSaving(null);
    onUpdated();
  }

  function toggleExpand(id: string, existingNotes?: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!(id in editNotes)) {
        setEditNotes((prev) => ({ ...prev, [id]: existingNotes ?? '' }));
      }
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
          <FileText className="h-5 w-5 text-sky-500" />
          Case Archive
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {cases.length} case{cases.length !== 1 ? 's' : ''} stored. Search, filter, and reopen any investigation.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search case number, title, pattern..."
            className="w-full rounded-xl border border-slate-300/60 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300/60 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="review">Review</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400 dark:text-slate-500">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-sm">No cases match your search.</p>
          </div>
        )}
        {filtered.map((c) => {
          const ext = c as CaseRecordExtended;
          const isExpanded = expandedId === c.id;
          return (
            <div key={c.id} className={`rounded-xl border transition animate-slide-up ${
              currentId === c.id
                ? 'border-sky-400 bg-sky-50/60 dark:border-sky-500 dark:bg-sky-900/20'
                : 'border-slate-200/70 bg-white dark:border-slate-700/70 dark:bg-slate-800/50'
            }`}>
              {/* Main row */}
              <div
                onClick={() => onSelect(c)}
                className="group cursor-pointer p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">{c.case_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${RISK_STYLES[c.risk_level] ?? ''}`}>
                        {c.risk_level}
                      </span>
                      {/* Inline status selector */}
                      <div
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={c.status}
                          onChange={(e) => handleStatusChange(c.id, e.target.value as CaseStatus)}
                          className={`cursor-pointer appearance-none rounded-full py-0.5 pl-2 pr-5 text-[10px] font-bold uppercase outline-none transition ${STATUS_STYLES[c.status] ?? ''}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-60" />
                      </div>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{c.title}</h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{c.pattern}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Notes toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExpand(c.id, ext.notes); }}
                      className={`grid h-8 w-8 place-items-center rounded-lg transition hover:bg-violet-50 hover:text-violet-500 dark:hover:bg-violet-900/30 ${isExpanded ? 'bg-violet-50 text-violet-500 dark:bg-violet-900/30' : 'text-slate-400'}`}
                      title="Investigator notes"
                    >
                      <StickyNote className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(c.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {c.entities?.length ?? 0} entities
                  </span>
                  {c.brief?.kingpin && (
                    <span className="truncate text-amber-500">Kingpin: {c.brief.kingpin}</span>
                  )}
                  {ext.notes && (
                    <span className="flex items-center gap-1 text-violet-500">
                      <StickyNote className="h-3 w-3" />
                      Has notes
                    </span>
                  )}
                </div>
              </div>

              {/* Expandable notes panel */}
              {isExpanded && (
                <div
                  className="border-t border-slate-200/70 p-3.5 dark:border-slate-700/70"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400">Investigator Notes</p>
                  <textarea
                    value={editNotes[c.id] ?? ''}
                    onChange={(e) => setEditNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Add investigator notes, follow-up actions, or case updates..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200/70 bg-slate-50 p-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 dark:border-slate-600/60 dark:bg-slate-800 dark:text-slate-200"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleSaveNotes(c.id)}
                      disabled={saving === c.id}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
                    >
                      {saving === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save notes
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Delete this case?</h3>
              <button onClick={() => setConfirmDelete(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This permanently removes the case and its analysis. This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-slate-300/60 px-4 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

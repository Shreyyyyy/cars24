'use client';

import React, { useEffect, useState } from 'react';
import { Database, Loader2 } from 'lucide-react';

interface SourceDataset {
  id: string;
  name: string;
  format: string;
  sizeBytes?: number;
}

interface DatasetPickerProps {
  /** Id of the dataset currently loaded from the client source, if any */
  activeId?: string | null;
  /** Called with the ingest result after a dataset loads */
  onLoaded: (data: any) => void;
  compact?: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

/** Chooses which dataset from the client's store is active (one at a time). */
export const DatasetPicker: React.FC<DatasetPickerProps> = ({ activeId, onLoaded, compact }) => {
  const [datasets, setDatasets] = useState<SourceDataset[]>([]);
  const [location, setLocation] = useState('');
  const [selected, setSelected] = useState<string>(activeId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/db/sources')
      .then(res => res.json())
      .then(data => {
        setDatasets(data.datasets || []);
        setLocation(data.connector?.location || '');
        if (data.activeId) setSelected(data.activeId);
        if (data.error) setError(data.error);
      })
      .catch(() => setError('Could not reach the client data source'));
  }, []);

  useEffect(() => {
    if (activeId !== undefined) setSelected(activeId || '');
  }, [activeId]);

  const load = async (id: string) => {
    if (!id || id === activeId) return;
    setSelected(id);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/db/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load dataset');
      onLoaded(data);
    } catch (err: any) {
      setError(err.message);
      setSelected(activeId || '');
    } finally {
      setLoading(false);
    }
  };

  if (datasets.length === 0) {
    return error && !compact ? <p className="text-[11px] text-red-600">{error}</p> : null;
  }

  return (
    <div className="space-y-1">
      {!compact && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1" title={location}>
          <Database className="w-3 h-3 text-blue-600" />
          Client datasets ({datasets.length})
        </label>
      )}
      <div className="relative">
        <select
          value={selected}
          disabled={loading}
          onChange={e => load(e.target.value)}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 pr-7 text-xs font-semibold text-gray-800 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-60"
          title={location ? `Source: ${location}` : undefined}
        >
          <option value="" disabled>
            {compact ? 'Choose client dataset…' : 'Choose a dataset to analyse…'}
          </option>
          {datasets.map(d => (
            <option key={d.id} value={d.id}>
              {d.id}{d.sizeBytes ? ` · ${formatSize(d.sizeBytes)}` : ''}
            </option>
          ))}
        </select>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600 absolute right-2 top-1/2 -translate-y-1/2" />}
      </div>
      {loading && <p className="text-[10px] text-gray-500">Reading every row and mapping how the tables connect…</p>}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
};

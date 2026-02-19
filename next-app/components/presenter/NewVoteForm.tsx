'use client';

import { useState } from 'react';
import type { VoteType } from '@/lib/types';

interface NewVoteFormProps {
  onStartVote: (
    topic: string,
    desc: string,
    vtype: VoteType,
    options: string[],
    timerEnabled: boolean,
    timerMin: number,
  ) => void;
}

export default function NewVoteForm({ onStartVote }: NewVoteFormProps) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [voteType, setVoteType] = useState<VoteType>('yes-no');
  const [customOptions, setCustomOptions] = useState('');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    let options: string[];
    if (voteType === 'yes-no') {
      options = ['Ja', 'Nein', 'Enthaltung'];
    } else {
      options = customOptions
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (options.length < 2) return;
      // Validate: max 200 chars per option, no HTML tags
      if (options.some(o => o.length > 200 || /<[^>]*>/g.test(o))) return;
    }

    onStartVote(
      topic.trim(),
      description.trim(),
      voteType,
      options,
      timerEnabled,
      timerMinutes,
    );

    // Reset form
    setTopic('');
    setDescription('');
    setVoteType('yes-no');
    setCustomOptions('');
    setTimerEnabled(false);
    setTimerMinutes(5);
  }

  const canStart =
    topic.trim().length > 0 &&
    (voteType === 'yes-no' ||
      customOptions
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o.length > 0).length >= 2);

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-[10px] p-6 mb-4 shadow-sm">
        <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text)' }}>
          Neue Abstimmung
        </h3>

        {/* Topic */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Thema / Frage
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="z.B. Genehmigung des Jahresberichts"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Beschreibung <span style={{ color: 'var(--text-light)' }}>(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Zusaetzliche Informationen zur Abstimmung..."
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-y"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text)',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* Vote type */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Art der Abstimmung
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="voteType"
                checked={voteType === 'yes-no'}
                onChange={() => setVoteType('yes-no')}
                className="accent-[#e30613]"
              />
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                Ja / Nein / Enthaltung
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="voteType"
                checked={voteType === 'custom'}
                onChange={() => setVoteType('custom')}
                className="accent-[#e30613]"
              />
              <span className="text-sm" style={{ color: 'var(--text)' }}>
                Eigene Optionen
              </span>
            </label>
          </div>
        </div>

        {/* Custom options */}
        {voteType === 'custom' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Optionen <span style={{ color: 'var(--text-light)' }}>(eine pro Zeile, mind. 2)</span>
            </label>
            <textarea
              value={customOptions}
              onChange={(e) => setCustomOptions(e.target.value)}
              rows={4}
              placeholder={"Option A\nOption B\nOption C"}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors resize-y font-mono"
              style={{
                border: '1px solid var(--border)',
                color: 'var(--text)',
                backgroundColor: '#fff',
              }}
            />
          </div>
        )}

        {/* Timer */}
        <div className="mb-5">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={timerEnabled}
              onChange={(e) => setTimerEnabled(e.target.checked)}
              className="accent-[#e30613]"
            />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Zeitlimit aktivieren
            </span>
          </label>
          {timerEnabled && (
            <div className="flex items-center gap-2 ml-6">
              <input
                type="number"
                min={1}
                max={60}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  backgroundColor: '#fff',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-light)' }}>
                Minuten
              </span>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canStart}
          className="w-full py-3 rounded-lg text-base font-semibold text-white transition-colors"
          style={{
            backgroundColor: canStart ? 'var(--drk)' : '#ccc',
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
        >
          Abstimmung starten
        </button>
      </div>
    </form>
  );
}

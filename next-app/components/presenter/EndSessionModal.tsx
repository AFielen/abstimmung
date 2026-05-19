'use client';

import { useEffect, useCallback } from 'react';

interface EndSessionModalProps {
  isOpen: boolean;
  hasHistory: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onExportPdf: () => void;
}

export default function EndSessionModal({
  isOpen,
  hasHistory,
  onConfirm,
  onCancel,
  onExportPdf,
}: EndSessionModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-session-title"
        className="drk-panel p-8 shadow-lg max-w-md w-full mx-4"
        style={{ animation: 'pulse-in 0.25s ease-out' }}
      >
        <h2 id="end-session-title" className="text-xl font-bold mb-3" style={{ color: 'var(--text)' }}>
          Versammlung beenden?
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-light)' }}>
          Alle Verbindungen werden getrennt und die Sitzung wird unwiderruflich beendet.
          Stellen Sie sicher, dass Sie alle Ergebnisse gesichert haben.
        </p>

        {hasHistory && (
          <div
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: '#fff8e1', border: '1px solid #ffe082' }}
          >
            <p className="text-sm mb-2" style={{ color: '#f57f17' }}>
              Sie haben Abstimmungsergebnisse. Moechten Sie diese vorher als PDF exportieren?
            </p>
            <button
              onClick={onExportPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--drk)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              PDF exportieren
            </button>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#f5f5f5',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            Sitzung beenden
          </button>
        </div>
      </div>
    </div>
  );
}

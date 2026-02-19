'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PresenterApp from '@/components/presenter/PresenterApp';
import VoterApp from '@/components/voter/VoterApp';

function AppContent() {
  const searchParams = useSearchParams();
  const votePeerId = searchParams.get('vote');
  const mode = searchParams.get('mode');

  if (votePeerId) {
    return (
      <VoterApp
        presenterPeerId={votePeerId}
        transportMode={mode === 'server' ? 'server' : 'p2p'}
      />
    );
  }
  return <PresenterApp />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--drk)] rounded-full animate-spin" /></div>}>
      <AppContent />
    </Suspense>
  );
}

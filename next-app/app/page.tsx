'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VoterApp from '@/components/voter/VoterApp';
import Portal from '@/components/portal/Portal';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  return <Portal />;
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AppContent />
    </Suspense>
  );
}

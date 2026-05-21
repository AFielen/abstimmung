'use client';
import { Suspense } from 'react';
import PresenterApp from '@/components/presenter/PresenterApp';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VersammlungPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PresenterApp />
    </Suspense>
  );
}

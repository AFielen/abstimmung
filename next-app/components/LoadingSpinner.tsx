export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--drk)] rounded-full animate-spin" />
    </div>
  );
}

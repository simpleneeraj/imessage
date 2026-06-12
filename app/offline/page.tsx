export default function OfflinePage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-[22px] font-bold">You&apos;re offline</p>
      <p className="text-[15px] text-imsg-text-gray">
        This page isn&apos;t cached yet. Conversations you&apos;ve opened before
        are still available from the home screen.
      </p>
    </div>
  );
}

export default function OfflinePage() {
  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.92); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.15; }
          100% { transform: scale(0.92); opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .offline-icon-wrap { animation: float 3.2s ease-in-out infinite; }
        .offline-pulse { animation: pulse-ring 3.2s ease-in-out infinite; }
        .offline-fade-1 { animation: fade-in 0.5s ease forwards; }
        .offline-fade-2 { animation: fade-in 0.5s 0.12s ease forwards; opacity: 0; }
        .offline-fade-3 { animation: fade-in 0.5s 0.24s ease forwards; opacity: 0; }
        .offline-fade-4 { animation: fade-in 0.5s 0.36s ease forwards; opacity: 0; }
      `}</style>

      <div className="flex h-dvh flex-col items-center justify-center gap-0 px-8 text-center">
        {/* Icon */}
        <div className="offline-fade-1 relative mb-7">
          <div className="offline-pulse absolute -inset-4.5 rounded-full bg-muted/60" />
          <div className="offline-icon-wrap relative z-10 flex h-18 w-18 items-center justify-center rounded-full border border-border bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M8.5 16.5a5 5 0 0 1 7 0" />
              <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
              <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
              <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
              <path d="M5 12.5a10 10 0 0 1 5.24-2.72" />
              <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <p className="offline-fade-2 mb-2.5 text-[20px] font-medium text-foreground">
          You&apos;re offline
        </p>

        {/* Body */}
        <p className="offline-fade-3 mb-7 max-w-70 text-[14px] leading-relaxed text-muted-foreground">
          This page isn&apos;t cached yet. Conversations you&apos;ve opened
          before are still available from the home screen.
        </p>

        {/* Chips */}
        <div className="offline-fade-4 flex flex-wrap justify-center gap-2">
          {[
            {
              label: 'Past chats available',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              ),
            },
            {
              label: 'Auto-reconnecting',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              ),
            },
          ].map(({ label, icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1.5 text-[13px] text-muted-foreground"
            >
              {icon}
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// On mobile the AppShell hides this pane (the conversation list IS the home
// screen); on desktop it fills the detail pane until a chat is selected.
export default function Home() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-2 text-center md:flex">
      <p className="text-[22px] font-bold">No Conversation Selected</p>
      <p className="text-[15px] text-imsg-text-gray">
        Choose a conversation from the list, or start a new one.
      </p>
    </div>
  );
}

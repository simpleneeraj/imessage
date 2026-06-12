import { AuthProvider } from "@/components/AuthProvider";
import { ConversationList } from "@/components/ConversationList";

export default function Home() {
  return (
    <AuthProvider>
      <ConversationList />
    </AuthProvider>
  );
}

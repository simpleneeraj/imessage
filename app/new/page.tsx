import { AuthProvider } from "@/components/AuthProvider";
import { NewChat } from "@/components/NewChat";

export default function NewChatPage() {
  return (
    <AuthProvider>
      <NewChat />
    </AuthProvider>
  );
}

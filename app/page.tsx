import { redirect } from 'next/navigation';

// Single private space — the root just enters the app. AuthProvider (in the
// (app) layout) shows the PIN gate when there's no session.
export default function HomePage() {
  redirect('/chats');
}

import { redirect } from 'next/navigation';

export default function Home() {
  // The main app layout at /dashboard will handle authentication.
  // If the user is not logged in, they will be redirected to /login from there.
  return redirect('/dashboard');
}

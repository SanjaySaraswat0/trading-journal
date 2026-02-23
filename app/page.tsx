import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // If not authenticated, redirect to login
  redirect('/login');
}

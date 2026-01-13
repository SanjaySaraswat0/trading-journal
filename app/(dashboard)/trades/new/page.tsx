import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import TradeForm from '@/components/trades/trade-form';

export default async function NewTradePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  return <TradeForm />;
}

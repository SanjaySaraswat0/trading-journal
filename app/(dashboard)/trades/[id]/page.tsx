import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Next.js 15+ - params is now a Promise
export default async function TradeDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Await params before using
  const { id } = await params;

  const supabase = createServiceClient();
  
  const { data: trade, error } = await supabase
    .from('trades')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (error || !trade) {
    notFound();
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold">Trading Journal</Link>
          <Link href="/trades" className="text-gray-600 hover:text-gray-900">
            ← Back to Trades
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{trade.symbol}</h1>
              <p className="text-gray-600 mt-1 capitalize">{trade.asset_type} · {trade.trade_type}</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-medium capitalize ${
              trade.status === 'win' ? 'bg-green-100 text-green-800' :
              trade.status === 'loss' ? 'bg-red-100 text-red-800' :
              trade.status === 'open' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {trade.status}
            </span>
          </div>

          {/* P&L Display */}
          {trade.pnl !== null && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Profit/Loss</p>
                  <p className={`text-3xl font-bold ${
                    trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(trade.pnl)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Return %</p>
                  <p className={`text-3xl font-bold ${
                    trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trade.pnl_percentage?.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trade Details Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm text-gray-600 mb-1">Entry Price</p>
              <p className="text-lg font-semibold text-gray-900">
                ${Number(trade.entry_price).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Exit Price</p>
              <p className="text-lg font-semibold text-gray-900">
                {trade.exit_price ? `$${Number(trade.exit_price).toFixed(2)}` : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Stop Loss</p>
              <p className="text-lg font-semibold text-gray-900">
                {trade.stop_loss ? `$${Number(trade.stop_loss).toFixed(2)}` : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Target Price</p>
              <p className="text-lg font-semibold text-gray-900">
                {trade.target_price ? `$${Number(trade.target_price).toFixed(2)}` : '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Quantity</p>
              <p className="text-lg font-semibold text-gray-900">{trade.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Position Size</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(Number(trade.position_size))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Timeframe</p>
              <p className="text-lg font-semibold text-gray-900 uppercase">
                {trade.timeframe || '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Setup Type</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {trade.setup_type || '--'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Entry Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(trade.entry_time)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Exit Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(trade.exit_time)}
              </p>
            </div>
          </div>

          {/* Trade Reason */}
          {trade.reason && (
            <div className="mb-8">
              <p className="text-sm text-gray-600 mb-2">Trade Reason</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{trade.reason}</p>
              </div>
            </div>
          )}

          {/* Screenshot */}
          {trade.screenshot_url && (
            <div className="mb-8">
              <p className="text-sm text-gray-600 mb-2">Screenshot</p>
              <img
                src={trade.screenshot_url}
                alt="Trade screenshot"
                className="w-full rounded-lg border border-gray-200"
              />
            </div>
          )}

          {/* Emotions & Tags */}
          <div className="grid grid-cols-2 gap-6">
            {trade.emotions && trade.emotions.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Emotions</p>
                <div className="flex flex-wrap gap-2">
                  {trade.emotions.map((emotion, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      {emotion}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {trade.tags && trade.tags.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {trade.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex gap-4">
            <Link href="/trades" className="flex-1">
              <button className="w-full bg-gray-200 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium">
                Back to All Trades
              </button>
            </Link>
            <Link href="/trades/new" className="flex-1">
              <button className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium">
                Add New Trade
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
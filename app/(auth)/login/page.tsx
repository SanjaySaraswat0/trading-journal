'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { redirect: false, email, password });
      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4"><div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div><div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div></div><div className="relative w-full max-w-md"><div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"><div className="text-center mb-8"><h1 className="text-3xl font-bold text-white mb-2">Welcome Back!</h1><p className="text-white/80">Sign in to Trading Journal</p></div>{error && <div className="mb-6 p-4 bg-red-500/20 rounded-lg"><p className="text-white text-sm text-center">{error}</p></div>}<form onSubmit={handleSubmit} className="space-y-6"><div><label className="block text-white/90 text-sm font-medium mb-2">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="you@example.com" /></div><div><label className="block text-white/90 text-sm font-medium mb-2">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="" /></div><button type="submit" disabled={loading} className="w-full py-3 px-4 bg-white text-purple-600 rounded-lg font-semibold shadow-lg hover:bg-white/90 focus:ring-2 focus:ring-white/50 transition-all transform hover:scale-105 disabled:opacity-50">{loading ? 'Signing in...' : 'Sign In'}</button></form><p className="text-center text-white/80 mt-6">Don't have an account? <Link href="/signup" className="font-semibold text-white hover:underline">Sign up</Link></p></div></div></div>);
}

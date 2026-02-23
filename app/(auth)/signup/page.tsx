'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password }) });
      if (!res.ok) throw new Error('Signup failed');
      await signIn('credentials', { redirect: false, email: formData.email, password: formData.password });
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-red-500 p-4"><div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 w-full max-w-md"><div className="text-center mb-8"><h1 className="text-3xl font-bold text-white mb-2">Create Account</h1><p className="text-white/80">Join Trading Journal</p></div>{error && <div className="mb-6 p-4 bg-red-500/20 rounded-lg"><p className="text-white text-sm text-center">{error}</p></div>}<form onSubmit={handleSubmit} className="space-y-5"><div><label className="block text-white/90 text-sm font-medium mb-2">Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="John Doe" /></div><div><label className="block text-white/90 text-sm font-medium mb-2">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="you@example.com" /></div><div><label className="block text-white/90 text-sm font-medium mb-2">Password</label><input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="" /></div><div><label className="block text-white/90 text-sm font-medium mb-2">Confirm Password</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="" /></div><button type="submit" disabled={loading} className="w-full py-3 px-4 bg-white text-pink-600 rounded-lg font-semibold shadow-lg hover:bg-white/90 transition-all transform hover:scale-105 disabled:opacity-50">{loading ? 'Creating...' : 'Create Account'}</button></form><p className="text-center text-white/80 mt-6">Already have an account? <Link href="/login" className="font-semibold text-white hover:underline">Sign in</Link></p></div></div>);
}

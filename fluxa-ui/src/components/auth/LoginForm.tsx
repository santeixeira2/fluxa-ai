import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../Logo';
import GoogleButton from './GoogleButton';

const inputCls = "w-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30";
const labelCls = "text-xs font-mono uppercase tracking-widest text-black/40 dark:text-white/40 mb-1.5 block";

export default function LoginForm() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasGoogle = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (password !== confirmPassword) return setError('Passwords do not match');
      if (!terms) return setError('You must accept the terms to continue');
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name, phone);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-10">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="text-xl font-bold tracking-tight">Fluxa</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] p-8">
          <h1 className="text-lg font-bold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-black/40 dark:text-white/40 mb-8">
            {mode === 'login' ? 'Sign in to your account' : 'Start simulating smarter'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className={labelCls}>Full name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="John Doe" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className={inputCls} placeholder="+55 11 99999-9999" />
                </div>
              </>
            )}

            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} placeholder="you@email.com" />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Min. 8 characters" />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className={labelCls}>Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={inputCls} placeholder="Repeat your password" />
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} className="sr-only" />
                    <div className={`w-4 h-4 rounded border transition-colors ${terms ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-transparent border-black/20 dark:border-white/20'}`}>
                      {terms && (
                        <svg className="w-4 h-4 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-black/40 dark:text-white/40 leading-relaxed">
                    I agree to the <a href="#" className="text-black dark:text-white hover:underline">Terms of Service</a> and <a href="#" className="text-black dark:text-white hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
            )}

            <button type="submit" disabled={loading} className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {hasGoogle && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                <span className="text-xs text-black/20 dark:text-white/20 font-mono">OR</span>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              </div>
              <GoogleButton onError={setError} onLoading={setLoading} />
            </>
          )}

          <p className="text-xs text-black/30 dark:text-white/30 text-center mt-6">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={switchMode} className="text-black dark:text-white hover:underline">{mode === 'login' ? 'Sign up' : 'Sign in'}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

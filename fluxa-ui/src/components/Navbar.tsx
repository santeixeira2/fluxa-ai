import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import PriceTicker from './PriceTicker';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeContext();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [cfgCurrency, setCfgCurrency] = useState('BRL');
  const [cfgLang, setCfgLang] = useState('PT-BR');
  const { notifications, markRead } = useNotifications();
  const notifRef = useRef<HTMLDivElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0].toUpperCase() ?? '?';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <nav className="bg-white/60 dark:bg-[#000000]/60 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] relative z-[2]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Logo className="transition-transform group-hover:scale-105" size={26} />
            <span className="font-bold text-lg tracking-tight text-black dark:text-white">Fluxa</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-[13px] font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/calculadoras" className="text-[13px] font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
              Calculadoras
            </Link>
            {user && (
              <Link to="/portfolio" className="text-[13px] font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
                Portfolio
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">

          {/* Bell */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotif(v => !v); if (!showNotif) markRead(); }}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-black/50 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-black dark:hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <p className="text-xs font-bold text-black dark:text-white">Notificações</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-center text-black/30 dark:text-white/30">Nenhuma notificação.</p>
                  ) : (
                    <ul className="max-h-72 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                      {notifications.map(n => {
                        const isBuy = n.alerts?.type === 'PRICE_BELOW';
                        return (
                          <li key={n.id} className="px-4 py-3">
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isBuy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>
                                {isBuy ? '↘' : '↗'}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm text-black dark:text-white leading-snug">{n.message}</p>
                                <p className="text-xs text-black/30 dark:text-white/30 font-mono mt-0.5">
                                  {new Date(n.triggered_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <span className="text-xs font-mono text-black/40 dark:text-white/40 flex-shrink-0">{fmtBRL(Number(n.price_brl))}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <button onClick={() => { navigate('/portfolio?tab=alerts'); setShowNotif(false); }} className="text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors">
                      Ver alertas →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`flex items-center gap-2.5 bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.1] pl-1.5 pr-4 py-1.5 hover:bg-black/[0.1] dark:hover:bg-white/[0.1] transition-all w-[200px] ${showMenu ? 'rounded-t-2xl rounded-b-none border-b-transparent' : 'rounded-full'}`}
            >
              <div className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[11px] font-bold text-black dark:text-white">
                {initials}
              </div>
              <span className="text-[13px] font-medium text-black/80 dark:text-white/80 hidden sm:block flex-1 truncate">
                {user ? (user.name ?? user.email) : 'Sign up'}
              </span>
              <svg className={`w-3 h-3 text-black/40 dark:text-white/40 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMenu && (
            <div className="absolute top-full right-0 w-full bg-white dark:bg-[#0a0a0a] border border-black/[0.1] dark:border-white/[0.1] border-t-0 rounded-b-2xl p-2 shadow-2xl z-[10] animate-fade-down">

                {!user && (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity"
                    >
                      Sign in / Sign up
                    </Link>
                    <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05] my-1" />
                  </>
                )}

                {user && (
                  <>
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-sm font-bold">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-black dark:text-white">{user.name ?? user.email}</p>
                        <p className="text-[11px] text-black/40 dark:text-white/40 truncate">{user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => { navigate('/portfolio'); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                      Portfolio
                    </button>

                    <button
                      onClick={() => { navigate('/profile'); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-black/70 dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      Edit profile
                    </button>

                    <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05] my-1" />
                  </>
                )}

                {/* Theme */}
                <div className="p-3">
                  <div className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-3">Theme</div>
                  <div className="flex gap-2">
                    <button onClick={() => setTheme('dark')} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${theme === 'dark' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>Dark</button>
                    <button onClick={() => setTheme('light')} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${theme === 'light' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>Light</button>
                  </div>
                </div>

                <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05]" />

                {/* Currency */}
                <div className="p-3">
                  <div className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-3">Currency</div>
                  <div className="flex gap-2">
                    <button onClick={() => setCfgCurrency('BRL')} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${cfgCurrency === 'BRL' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>BRL (R$)</button>
                    <button onClick={() => setCfgCurrency('USD')} className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${cfgCurrency === 'USD' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>USD ($)</button>
                  </div>
                </div>

                <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05]" />

                {/* Language */}
                <div className="p-3">
                  <div className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase mb-3">Language</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setCfgLang('PT-BR')} className={`py-2 rounded-xl text-xs font-medium transition-all ${cfgLang === 'PT-BR' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>PT-BR</button>
                    <button onClick={() => setCfgLang('EN-US')} className={`py-2 rounded-xl text-xs font-medium transition-all ${cfgLang === 'EN-US' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'}`}>EN-US</button>
                  </div>
                </div>

                {user && (
                  <>
                    <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05] my-1" />
                    <button
                      onClick={() => logout().then(() => { navigate('/'); setShowMenu(false); })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/15 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Sign out
                    </button>
                  </>
                )}
            </div>
            )}
          </div>
          </div>
        </div>
      </nav>
      <div className="bg-white/40 dark:bg-black/40 backdrop-blur-md relative z-[1]">
        <PriceTicker />
      </div>
    </div>
  );
}

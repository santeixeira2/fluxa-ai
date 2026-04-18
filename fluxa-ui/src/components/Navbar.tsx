import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import PriceTicker from './PriceTicker';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeContext();
  const [showMenu, setShowMenu] = useState(false);
  const [cfgCurrency, setCfgCurrency] = useState('BRL');
  const [cfgLang, setCfgLang] = useState('PT-BR');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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

          <div className="hidden md:flex items-center gap-10">
            <button
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
              onClick={() => document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How it works
            </button>
            <button
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors"
              onClick={() => document.getElementById('historico')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Pricing
            </button>
            <button className="text-[13px] font-medium text-white/50 hover:text-white transition-colors">
              Support
            </button>
          </div>

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
      </nav>
      <div className="bg-white/40 dark:bg-black/40 backdrop-blur-md relative z-[1]">
        <PriceTicker />
      </div>
    </div>
  );
}

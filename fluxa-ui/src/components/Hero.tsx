import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimFormData } from './containers/SimulatorContainer';
import { parseUserInput, explainSimulation, getPrice, chatAiStream } from '../api/client';
import Reveal from './Reveal';
import Logo from './Logo';
import ChatMarkdown from './ChatMarkdown';

interface HeroProps {
  onParsed: (data: SimFormData) => void;
}

// Shared ring style — quantum ripple effect
const ringBase: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '420px',
  height: '420px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.12)',
  animation: 'quantum-ring 4s ease-out infinite',
  pointerEvents: 'none',
};

export default function Hero({ onParsed }: HeroProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);
  const [isAdvising, setIsAdvising] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function looksLikeSimulation(text: string): boolean {
    return /\d/.test(text) && /\b(invest|investi|aplicar|aplicando|colocar|simul|comprar|buy|put)\b/i.test(text);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setIsAdvising(true);
    setAdvice(null);
    setErrorMsg(null);
    try {
      if (looksLikeSimulation(message)) {
        const parsed = await parseUserInput(message);
        if (parsed?.asset && parsed?.investment) {
          onParsed({
            asset: parsed.asset,
            investment: parsed.investment.toString(),
            futurePrice: parsed.futurePrice ? parsed.futurePrice.toString() : '',
          });
          const priceRes = await getPrice(parsed.asset.toLowerCase(), 'brl').catch(() => null);
          if (priceRes && parsed.futurePrice) {
            const cp = priceRes.price;
            const inv = parsed.investment;
            const fp = parsed.futurePrice;
            const explanation = await explainSimulation({
              currentPrice: cp,
              finalValue: (inv / cp) * fp,
              profit: (inv / cp) * fp - inv,
              roi: (((inv / cp) * fp - inv) / inv) * 100,
              investment: inv,
              futurePrice: fp,
            });
            setAdvice(explanation.explanation);
          } else {
            setAdvice(`Simulação configurada para ${parsed.asset.toUpperCase()}! Role para baixo para ver o resultado.`);
          }
          setMessage('');
          return;
        }
      }
      setAdvice('');
      setMessage('');
      await chatAiStream(message, (token) => {
        setAdvice(prev => (prev ?? '') + token);
      });
    } catch (err: unknown) {
      setErrorMsg((err instanceof Error ? err.message : null) || 'Houve um erro de comunicação com a IA.');
    } finally {
      setIsAdvising(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-black text-white" style={{ minHeight: '100vh' }}>

      {/* ── Subtle grid lines ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.022) 79px, rgba(255,255,255,0.022) 80px)',
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* ── Grand atmospheric glow — behind the orb ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1200px',
          height: '700px',
          background: 'radial-gradient(ellipse 55% 60% at 50% 5%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, transparent 70%)',
          zIndex: 2,
        }}
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <div className="relative flex flex-col items-center text-center px-6 pt-28 pb-24" style={{ zIndex: 10 }}>

        {/* ── Orb + quantum rings ── */}
        <Reveal delay={0}>
          <div
            className="relative flex items-center justify-center mb-16"
            style={{ width: '420px', height: '300px' }}
          >
            {/* Quantum rings — staggered delays */}
            <div style={{ ...ringBase, animationDelay: '0s' }} />
            <div style={{ ...ringBase, animationDelay: '1.3s' }} />
            <div style={{ ...ringBase, animationDelay: '2.6s' }} />

            {/* The main orb */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                // Spherical shading — top lighter, bottom darker
                background: `
                  radial-gradient(circle at 50% 20%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 45%, transparent 70%),
                  radial-gradient(circle at 50% 80%, rgba(0,0,0,0.4) 0%, transparent 60%)
                `,
                border: '1px solid rgba(255,255,255,0.22)',
                animation: 'orb-breathe 5s ease-in-out infinite',
              }}
            />

            {/* Inner ring — tighter, brighter */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '260px',
                height: '260px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.08)',
                pointerEvents: 'none',
              }}
            />

            {/* Logo badge — sits at apex of orb */}
            <div
              style={{
                position: 'absolute',
                top: 'calc(50% - 160px)',   // top edge of the 320px orb
                left: '50%',
                transform: 'translateX(-50%) translateY(-50%)',
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 60%)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 0 24px rgba(255,255,255,0.25), 0 0 60px rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Logo size={34} className="rounded-full" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Headline ── */}
        <Reveal delay={150}>
          <h1
            className="font-bold text-white leading-[1.05] tracking-[-0.04em] mb-6"
            style={{ fontSize: 'clamp(2.8rem, 7.5vw, 5.5rem)' }}
          >
            {t('hero.headline')}<br />
            <span className="text-white/40">{t('hero.headlineMuted')}</span>
          </h1>
        </Reveal>

        {/* ── Subtitle ── */}
        <Reveal delay={280}>
          <p className="text-white/40 text-lg max-w-[480px] mx-auto mb-12 leading-relaxed">
            {t('hero.subheadline')}
          </p>
        </Reveal>

        {/* ── AI Input ── */}
        <Reveal delay={400}>
          <div className="w-full max-w-xl mb-16">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center p-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl focus-within:border-white/[0.28] transition-all duration-300 hover:bg-white/[0.06]"
            >
              <input
                type="text"
                placeholder={t('hero.placeholder')}
                className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 px-6 py-3 text-sm placeholder:text-white/25"
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={isAdvising}
              />
              <button
                type="submit"
                disabled={isAdvising || !message.trim()}
                className="bg-white text-black font-bold px-7 py-3 rounded-full text-xs uppercase tracking-widest transition-all hover:bg-white/90 active:scale-95 disabled:opacity-40"
              >
                {isAdvising ? t('hero.analyzing') : t('hero.askFluxa')}
              </button>
            </form>

            {errorMsg && (
              <p className="mt-4 text-white/30 text-xs font-mono">{errorMsg}</p>
            )}

            {(advice !== null || isAdvising) && (
              <div className="mt-5 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 text-left">
                {isAdvising && !advice ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-xs font-mono uppercase tracking-widest text-white/40">{t('hero.analyzingMarkets')}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isAdvising ? 'animate-pulse' : 'shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`} />
                      <span className="text-[10px] font-mono tracking-widest uppercase text-white/35">{t('hero.fluxaAI')}</span>
                    </div>
                    <div className="text-white/75 text-sm leading-relaxed">
                      <ChatMarkdown text={advice ?? ''} />
                      {isAdvising && <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/60 animate-pulse align-middle" />}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* ── Trust indicators ── */}
        <Reveal delay={520}>
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/20">
            {[t('hero.trust1'), t('hero.trust2'), t('hero.trust3')].map((item, i) => (
              <span key={i} className="text-[11px] font-mono tracking-widest uppercase flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/20" />
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

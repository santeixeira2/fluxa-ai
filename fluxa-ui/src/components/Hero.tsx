import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { SimFormData } from './containers/SimulatorContainer';
import { parseUserInput, explainSimulation, getPrice, chatAiStream } from '../api/client';
import Reveal from './Reveal';
import Logo from './Logo';
import ChatMarkdown from './ChatMarkdown';
import heroVideo from '../assets/hero.mp4';

interface HeroProps {
  onParsed: (data: SimFormData) => void;
}

// Orb diameter in px
const ORB_D = 340;

const ringBase: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: `${ORB_D + 100}px`,
  height: `${ORB_D + 100}px`,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.10)',
  animation: 'quantum-ring 4s ease-out infinite',
  pointerEvents: 'none',
};

export default function Hero({ onParsed }: HeroProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [advice, setAdvice] = useState<string | null>(null);
  const [isAdvising, setIsAdvising] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!videoWrapRef.current) return;
      videoWrapRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            const cp = priceRes.price, inv = parsed.investment, fp = parsed.futurePrice;
            const explanation = await explainSimulation({
              currentPrice: cp, finalValue: (inv / cp) * fp,
              profit: (inv / cp) * fp - inv,
              roi: (((inv / cp) * fp - inv) / inv) * 100,
              investment: inv, futurePrice: fp,
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
      await chatAiStream(message, token => setAdvice(prev => (prev ?? '') + token));
    } catch (err: unknown) {
      setErrorMsg((err instanceof Error ? err.message : null) || 'Houve um erro de comunicação com a IA.');
    } finally {
      setIsAdvising(false);
    }
  }

  // Logo badge height: 64px. Headline should sit at ~25% of orb = 85px from orb top.
  // Logo badge bottom ≈ 64px from orb top → gap to headline ≈ 21px
  const LOGO_H = 64;
  const HEADLINE_FROM_ORB_TOP = Math.round(ORB_D * 0.25); // 85px
  const LOGO_TO_HEADLINE_GAP = HEADLINE_FROM_ORB_TOP - LOGO_H; // ~21px

  return (
    <section className="relative overflow-hidden bg-black text-white" style={{ minHeight: '100vh' }}>

      {/* ── Video parallax ── */}
      <div
        ref={videoWrapRef}
        className="absolute inset-x-0 pointer-events-none will-change-transform"
        style={{ top: '-15%', height: '130%', zIndex: 0 }}
        aria-hidden="true"
      >
        <video src={heroVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" style={{ opacity: 0.5 }} />
      </div>

      {/* ── Gradient overlay ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.70) 100%)', zIndex: 1 }} aria-hidden="true" />

      {/* ── Grid lines ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.022) 79px, rgba(255,255,255,0.022) 80px)', zIndex: 2 }} aria-hidden="true" />

      {/* ── Content ── */}
      <div className="relative flex flex-col items-center text-center px-6 pb-24" style={{ zIndex: 10, paddingTop: '7rem' }}>

        {/* ── Orb + rings — absolutely behind the content column ── */}
        <div
          className="absolute left-1/2 pointer-events-none"
          style={{ top: '7rem', transform: 'translateX(-50%)', width: `${ORB_D + 260}px`, height: `${ORB_D + 260}px`, zIndex: 5 }}
          aria-hidden="true"
        >
          {/* Atmospheric glow */}
          <div style={{ position: 'absolute', inset: '-80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 65%)' }} />

          {/* Quantum rings */}
          <div style={{ ...ringBase, top: `${(ORB_D + 260) / 2}px`, left: `${(ORB_D + 260) / 2}px`, animationDelay: '0s' }} />
          <div style={{ ...ringBase, top: `${(ORB_D + 260) / 2}px`, left: `${(ORB_D + 260) / 2}px`, animationDelay: '1.3s' }} />
          <div style={{ ...ringBase, top: `${(ORB_D + 260) / 2}px`, left: `${(ORB_D + 260) / 2}px`, animationDelay: '2.6s' }} />

          {/* The orb sphere — centered */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${ORB_D}px`, height: `${ORB_D}px`,
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 50% 18%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 45%, transparent 68%),
              radial-gradient(circle at 50% 85%, rgba(0,0,0,0.45) 0%, transparent 55%)
            `,
            border: '1px solid rgba(255,255,255,0.18)',
            animation: 'orb-breathe 5s ease-in-out infinite',
          }} />

          {/* Inner ring */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `${ORB_D - 60}px`, height: `${ORB_D - 60}px`, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
        </div>

        {/* ── Logo badge — floating at orb apex ── */}
        <Reveal delay={0}>
          <div
            className="relative flex items-center justify-center"
            style={{
              width: `${LOGO_H}px`, height: `${LOGO_H}px`,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 60%)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 0 24px rgba(255,255,255,0.22), 0 0 64px rgba(255,255,255,0.10)',
              backdropFilter: 'blur(12px)',
              zIndex: 20,
            }}
          >
            <Logo size={34} className="rounded-full" />
          </div>
        </Reveal>

        {/* ── Headline — ~25% into orb, few px below logo ── */}
        <Reveal delay={120}>
          <h1
            className="font-bold text-white leading-[1.05] tracking-[-0.04em]"
            style={{
              fontSize: 'clamp(2.6rem, 7vw, 5rem)',
              marginTop: `${LOGO_TO_HEADLINE_GAP}px`,
              marginBottom: '1rem',
              position: 'relative', zIndex: 20,
            }}
          >
            {t('hero.headline')}<br />
            <span className="text-white/40">{t('hero.headlineMuted')}</span>
          </h1>
        </Reveal>

        {/* ── Subtitle ── */}
        <Reveal delay={240}>
          <p className="text-white/40 text-lg max-w-[460px] mx-auto leading-relaxed" style={{ marginBottom: '2.5rem', position: 'relative', zIndex: 20 }}>
            {t('hero.subheadline')}
          </p>
        </Reveal>

        {/* ── AI Input ── */}
        <Reveal delay={360}>
          <div className="w-full max-w-xl" style={{ position: 'relative', zIndex: 20, marginBottom: '4rem' }}>
            <form
              onSubmit={handleSubmit}
              className="flex items-center p-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl focus-within:border-white/[0.28] transition-all duration-300 hover:bg-white/[0.06]"
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

            {errorMsg && <p className="mt-4 text-white/30 text-xs font-mono">{errorMsg}</p>}

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
        <Reveal delay={480}>
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/20" style={{ position: 'relative', zIndex: 20 }}>
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

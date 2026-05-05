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
            const finalValue = (inv / cp) * fp;
            const profit = finalValue - inv;
            const roi = (profit / inv) * 100;

            const explanation = await explainSimulation({ currentPrice: cp, finalValue, profit, roi, investment: inv, futurePrice: fp });
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
    <section className="relative pt-36 pb-32 px-6 overflow-hidden bg-black text-white">

      {/* ── Grid lines ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.025) 79px, rgba(255,255,255,0.025) 80px)',
        }}
        aria-hidden="true"
      />

      {/* ── Atmospheric glow (radial from top center) ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* ── Content ── */}
      <div className="relative z-10 max-w-[860px] mx-auto text-center">

        {/* ── Orb ── */}
        <Reveal delay={0}>
          <div className="flex justify-center mb-14">
            <div className="relative">
              {/* Outer diffuse glow */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: '-56px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 68%)',
                }}
                aria-hidden="true"
              />
              {/* Mid ring */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: '-24px',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)',
                  boxShadow: '0 0 60px rgba(255,255,255,0.08)',
                }}
                aria-hidden="true"
              />
              {/* Orb */}
              <div
                className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.07) 55%, rgba(0,0,0,0.15) 100%)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow:
                    '0 0 32px rgba(255,255,255,0.18), 0 0 80px rgba(255,255,255,0.09), 0 0 160px rgba(255,255,255,0.04)',
                }}
              >
                <Logo size={38} className="rounded-full" />
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Headline ── */}
        <Reveal delay={120}>
          <h1 className="text-[clamp(3rem,8vw,6rem)] font-bold tracking-[-0.04em] leading-[1.05] mb-6 text-white">
            {t('hero.headline')}<br />
            <span className="text-white/45">{t('hero.headlineMuted')}</span>
          </h1>
        </Reveal>

        {/* ── Subheadline ── */}
        <Reveal delay={240}>
          <p className="text-white/40 text-lg md:text-xl max-w-[520px] mx-auto mb-12 leading-relaxed">
            {t('hero.subheadline')}
          </p>
        </Reveal>

        {/* ── AI Input ── */}
        <Reveal delay={360}>
          <div className="max-w-xl mx-auto mb-16">
            <form
              onSubmit={handleSubmit}
              className="relative flex items-center p-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl focus-within:border-white/30 transition-all duration-300 hover:bg-white/[0.06]"
            >
              <input
                type="text"
                placeholder={t('hero.placeholder')}
                className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 px-6 py-3 text-sm placeholder:text-white/25"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
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
              <p className="mt-4 text-white/30 text-xs font-mono tracking-tight">{errorMsg}</p>
            )}

            {/* ── AI Response ── */}
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

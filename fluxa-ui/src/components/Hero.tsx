import { useState } from 'react';
import type { SimFormData } from './containers/SimulatorContainer';
import { parseUserInput, explainSimulation, getPrice, chatAiStream } from '../api/client';
import Reveal from './Reveal';
import Logo from './Logo';

interface HeroProps {
  onParsed: (data: SimFormData) => void;
}

export default function Hero({ onParsed }: HeroProps) {
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

      // General question → conversational AI (streaming)
      setAdvice('');
      setMessage('');
      await chatAiStream(message, (token) => {
        setAdvice(prev => (prev ?? '') + token);
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Houve um erro de comunicação com a IA.');
    } finally {
      setIsAdvising(false);
    }
  }

  return (
    <section className="relative pt-40 pb-32 px-6 overflow-hidden">
      {/* ── Spotlight Background ── */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] spotlight-top opacity-60 pointer-events-none" />

      {/* ── Cinematic Video Background ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none flex flex-col items-center overflow-hidden [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)]">
        <video 
           autoPlay 
           loop 
           muted 
           playsInline
           className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen scale-105"
           src="https://cdn.pixabay.com/video/2023/10/22/185960-876722880_large.mp4"
        />
        {/* Floating Logo Overlay */}
        <Reveal delay={0} className="relative z-20 mt-16 flex items-center justify-center p-4 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_100px_rgba(255,255,255,0.15)]">
           <Logo size={48} />
        </Reveal>
      </div>
      
      <div className="max-w-[900px] mx-auto text-center relative z-10 pt-20">
        <Reveal delay={0}>
          <div className="inline-block px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono tracking-[0.2em] text-white/40 uppercase mb-8">
            [ Flux AI Simulation ]
          </div>
        </Reveal>

        <Reveal delay={150}>
          <h1 className="text-5xl md:text-7xl font-bold tracking-[-0.03em] mb-8 leading-[1.1]">
            Manage Money. <br />
            <span className="text-white/40">The Smart Way.</span>
          </h1>
        </Reveal>

        <Reveal delay={300}>
          <p className="text-white/40 text-lg md:text-xl max-w-[600px] mx-auto mb-12 leading-relaxed">
            Join the Safefound Futures evaluation to demonstrate your trading skills. Complete the goals and secure funding in as little as 4 days.
          </p>
        </Reveal>

        {/* ── Cinematic AI Input ── */}
        <Reveal delay={450}>
          <div className="max-w-xl mx-auto mb-16">
            <form 
              onSubmit={handleSubmit}
              className="group relative flex items-center p-1.5 bg-white/[0.03] border border-white/[0.1] rounded-full focus-within:border-white/30 transition-all duration-500 backdrop-blur-3xl shadow-glow hover:shadow-[0_0_100px_rgba(255,255,255,0.08)] hover:bg-white/[0.04]"
            >
              <input
              type="text"
              placeholder="Ex: Invest 5k in BTC target 500k"
              className="flex-1 bg-transparent border-none text-white focus:outline-none focus:ring-0 px-6 py-3 text-sm placeholder:text-white/20"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isAdvising}
            />
            <button
              type="submit"
              disabled={isAdvising || !message.trim()}
              className="bg-white text-black font-bold px-8 py-3 rounded-full text-xs uppercase tracking-widest transition-all hover:scale-[0.98] disabled:opacity-50"
            >
              {isAdvising ? 'Processing...' : 'Ask AI'}
            </button>
          </form>
          {errorMsg && (
            <div className="mt-4 text-white/30 text-xs font-mono tracking-tighter">
              Error: {errorMsg}
            </div>
          )}

          {/* ── AI Advice Dialog ── */}
          {(advice !== null || isAdvising) && (
            <div className="mt-6 bg-white/[0.03] border border-white/[0.08] backdrop-blur-3xl rounded-3xl p-6 text-left animate-fade relative overflow-hidden">
              {isAdvising && !advice ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-sm font-mono uppercase tracking-widest text-white/50">Flux AI is analyzing markets...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full bg-white ${isAdvising ? 'animate-pulse' : 'shadow-[0_0_10px_white]'}`} />
                    <span className="text-[10px] font-mono tracking-widest uppercase text-white/40">Advisor Response</span>
                  </div>
                  <p className="text-white/80 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                    {advice}
                    {isAdvising && <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/60 animate-pulse align-middle" />}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        </Reveal>

        {/* ── Partner Logos ── */}
        <Reveal delay={600}>
          <div className="pt-8 flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-20 hover:opacity-40 transition-opacity duration-700 grayscale">
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" alt="Amazon" className="h-4" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" alt="Google" className="h-5" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png" alt="Meta" className="h-4" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5a/X_logo_2023.svg" alt="X" className="h-4 h-invert" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

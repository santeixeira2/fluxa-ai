import { useState, useCallback } from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SimulatorContainer, { type SimFormData } from './components/containers/SimulatorContainer';
import HistoricalCalculator from './components/HistoricalCalculator';
import FloatingChat from './components/FloatingChat';
import Reveal from './components/Reveal';
import Logo from './components/Logo';
import LoginForm from './components/auth/LoginForm';

function Home() {
  const [prefill, setPrefill] = useState<SimFormData | null>(null);

  const handleAiParsed = useCallback((data: SimFormData) => {
    setPrefill(data);
    const el = document.getElementById('simulator');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePrefillConsumed = useCallback(() => {
    setPrefill(null);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col pt-[104px] selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <main className="flex-1">
        <Hero onParsed={handleAiParsed} />

        <SimulatorContainer prefill={prefill} onPrefillConsumed={handlePrefillConsumed} />

        <HistoricalCalculator />

        <FloatingChat onParsed={handleAiParsed} />

        {/* ── Minimal FAQ/Trust Section (SafeFound style) ── */}
        <section className="py-24 px-6 max-w-[800px] mx-auto text-center border-t border-white/[0.05]">
           <Reveal delay={0}>
             <span className="section-label">[ FAQ ]</span>
             <h2 className="text-3xl font-bold mb-12">Common Questions.</h2>
           </Reveal>

           <div className="space-y-4 text-left">
              {[
                { q: "How does the AI simulation work?", a: "We use advanced NLP to parse your natural language input and map it to real-time market data for high-precision projections." },
                { q: "Is the data real-time?", a: "Yes, we fetch live prices from major exchanges every 30 seconds to ensure your simulations are accurate." },
                { q: "Can I get funded through Fluxa?", a: "Currently, Fluxa is a simulation tool. We are working on partner integrations for real-world capital allocation." }
              ].map((item, i) => (
                <Reveal delay={150 + (i * 100)} key={i}>
                  <div className="glass-card p-6 hover:bg-white/[0.05]">
                    <h3 className="text-sm font-bold mb-2 flex items-center justify-between">
                      {item.q}
                      <span className="text-white/20">+</span>
                    </h3>
                    <p className="text-sm text-white/40 leading-relaxed">{item.a}</p>
                  </div>
                </Reveal>
              ))}
           </div>
        </section>
      </main>

      <footer className="py-12 border-t border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-black">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
            <Logo size={24} />
            <span className="font-bold text-sm tracking-tight text-white">Fluxa</span>
          </div>
          
          <div className="flex gap-8 text-[11px] font-mono uppercase tracking-[0.2em] text-black/20 dark:text-white/20">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
          </div>

          <p className="text-[11px] font-mono text-black/20 dark:text-white/20 uppercase tracking-widest">
            © {new Date().getFullYear()} Fluxa · Safefound Theme
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;

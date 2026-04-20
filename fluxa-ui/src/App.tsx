import './App.css';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FloatingChat from './components/FloatingChat';
import Reveal from './components/Reveal';
import Logo from './components/Logo';
import LoginForm from './components/auth/LoginForm';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PortfolioPage from './pages/PortfolioPage';
import ProfilePage from './pages/ProfilePage';
import CalculadorasPage from './pages/CalculadorasPage';

function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col pt-[104px] selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <main className="flex-1">
        <Hero onParsed={() => {}} />

        <section className="py-24 px-6 max-w-[800px] mx-auto text-center border-t border-white/[0.05]">
          <Reveal delay={0}>
            <span className="section-label">[ FAQ ]</span>
            <h2 className="text-3xl font-bold mb-12">Perguntas frequentes.</h2>
          </Reveal>
          <div className="space-y-4 text-left">
            {[
              { q: 'O que é o Fluxa?', a: 'O Fluxa é seu guru financeiro com AI. Você informa o que tem investido e recebe insights, simulações e análises personalizadas em tempo real.' },
              { q: 'Os dados são em tempo real?', a: 'Sim. Buscamos preços de criptomoedas, ações e câmbio a cada 30 segundos das principais exchanges e fontes de dados.' },
              { q: 'O Fluxa substitui uma corretora?', a: 'Não. O Fluxa é uma ferramenta de análise e simulação. Não executamos ordens reais nem nos conectamos com sua corretora.' },
            ].map((item, i) => (
              <Reveal delay={150 + i * 100} key={i}>
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
            © {new Date().getFullYear()} Fluxa
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const location = useLocation();
  const hideChat = location.pathname === '/login';

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/portfolio" element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/calculadoras" element={<CalculadorasPage />} />
        <Route path="/" element={<Home />} />
      </Routes>
      {!hideChat && <FloatingChat onParsed={() => {}} />}
    </>
  );
}

export default App;

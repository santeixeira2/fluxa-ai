import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Reveal from '../components/Reveal';
import Logo from '../components/Logo';
import MarketsSection from '../components/MarketsSection';

export default function HomePage() {
  const { t } = useTranslation();
  const faqItems: { q: string; a: string }[] = t('faq.items', { returnObjects: true }) as { q: string; a: string }[];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col pt-[104px] selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <main className="flex-1">
        <Hero onParsed={() => {}} />

        <MarketsSection />

        <section className="py-24 px-6 max-w-[800px] mx-auto text-center border-t border-black/[0.05] dark:border-white/[0.05]">
          <Reveal delay={0}>
            <span className="section-label">{t('faq.badge')}</span>
            <h2 className="text-3xl font-bold mb-12 text-black dark:text-white">{t('faq.headline')}</h2>
          </Reveal>
          <div className="space-y-4 text-left">
            {faqItems.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <Reveal delay={150 + i * 100} key={i}>
                  <div className="glass-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 p-6 text-left text-sm font-bold text-black dark:text-white"
                    >
                      <span>{item.q}</span>
                      <span
                        className={`text-black/40 dark:text-white/40 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
                      >
                        +
                      </span>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 pb-6 text-sm text-black/45 dark:text-white/40 leading-relaxed">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-black">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-500">
            <Logo size={24} />
            <span className="font-bold text-sm tracking-tight text-black dark:text-white">Fluxa</span>
          </div>
          <div className="flex gap-8 text-[11px] font-mono uppercase tracking-[0.2em] text-black/20 dark:text-white/20">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors duration-300">Twitter</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors duration-300">Discord</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors duration-300">Legal</a>
          </div>
          <p className="text-[11px] font-mono text-black/20 dark:text-white/20 uppercase tracking-widest">
            © {new Date().getFullYear()} Fluxa
          </p>
        </div>
      </footer>
    </div>
  );
}

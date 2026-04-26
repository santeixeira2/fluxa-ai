import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { parseUserInput, chatAiStream } from '../api/client';
import type { SimFormData } from './Simulator';
import ChatMarkdown from './ChatMarkdown';

interface Props {
  onParsed: (data: SimFormData) => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function FloatingChat({ onParsed }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const examples: string[] = t('chat.examples', { returnObjects: true }) as string[];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      parseUserInput(text).then(parsed => {
        if (parsed?.asset && parsed?.investment > 0) {
          onParsed({
            asset: parsed.asset,
            investment: parsed.investment.toString(),
            futurePrice: parsed.futurePrice ? parsed.futurePrice.toString() : '',
          });
        }
      }).catch(() => {});

      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);
      await chatAiStream(text, (token) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            text: updated[updated.length - 1].text + token,
          };
          return updated;
        });
      });
    } catch (err) {
      setMessages(prev => prev.slice(0, -1));
      setError(err instanceof Error ? err.message : t('common.unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3">

      {/* Chat window */}
      <div className={`transition-all duration-300 origin-bottom-right ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="w-[360px] max-h-[520px] flex flex-col bg-white dark:bg-[#0a0a0a] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-[#05130F]" style={{ background: 'linear-gradient(135deg, #00d4aa, #00a878)' }}>
                Fx
              </div>
              <div>
                <p className="text-sm font-semibold leading-none text-black dark:text-white">{t('chat.title')}</p>
                <p className="text-[11px] text-black/40 dark:text-white/40 mt-0.5">{t('chat.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[320px]">
            {messages.length === 0 && !loading && (
              <div className="space-y-2">
                <p className="text-xs text-black/30 dark:text-white/30 text-center mb-4">{t('chat.placeholder')}</p>
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(ex)}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-black/60 dark:text-white/60 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[9px] font-black text-[#05130F] mt-0.5" style={{ background: 'linear-gradient(135deg, #00d4aa, #00a878)' }}>
                    Fx
                  </div>
                )}
                <div className={`max-w-[80%] text-sm px-3 py-2 rounded-2xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-black dark:bg-white text-white dark:text-black rounded-tr-sm whitespace-pre-wrap'
                    : 'bg-black/[0.06] dark:bg-white/[0.06] text-black/90 dark:text-white/90 rounded-tl-sm'
                }`}>
                  {msg.text ? (
                    msg.role === 'assistant' ? <ChatMarkdown text={msg.text} /> : msg.text
                  ) : (loading && i === messages.length - 1 ? (
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/40 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/40 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-black/30 dark:bg-white/40 animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : '')}
                </div>
              </div>
            ))}

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-black/[0.06] dark:border-white/[0.06]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                placeholder={t('chat.placeholder')}
                className="flex-1 bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2 text-sm outline-none focus:border-black/20 dark:focus:border-white/20 transition-colors placeholder:text-black/30 dark:placeholder:text-white/30 text-black dark:text-white"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${open ? 'rotate-0' : 'hover:scale-105'}`}
        style={{ background: 'linear-gradient(135deg, #00d4aa, #00a878)' }}
      >
        {open ? (
          <svg className="w-5 h-5 text-[#05130F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-[#05130F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>
    </div>
  );
}

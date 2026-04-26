import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { parseUserInput, chatAiStream } from '../api/client';
import type { SimFormData } from './Simulator';
import ChatMarkdown from './ChatMarkdown';

interface AiChatProps {
  onParsed: (data: SimFormData) => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiChat({ onParsed }: AiChatProps) {
  const { t } = useTranslation();
  const examples = useMemo(
    () => t('aiChat.examples', { returnObjects: true }) as string[],
    [t]
  );
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      // Parse in background to silently fill simulator
      parseUserInput(text).then(parsed => {
        if (parsed?.asset && parsed?.investment > 0) {
          onParsed({
            asset: parsed.asset,
            investment: parsed.investment.toString(),
            futurePrice: parsed.futurePrice ? parsed.futurePrice.toString() : '',
          });
        }
      }).catch(() => {});

      // Add empty assistant message and stream tokens into it
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
      setMessages(prev => prev.slice(0, -1)); // remove empty assistant bubble on error
      setError(err instanceof Error ? err.message : t('common.unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-chat section" id="ai-chat">
      <div className="section-header">
        <div className="section-label">
          <span className="section-label-dot" />
          {t('aiChat.sectionLabel')}
        </div>
        <h2 className="section-title">
          {t('aiChat.titlePrefix')}
          <span className="gradient-text">{t('hero.fluxaAI')}</span>
        </h2>
        <p className="section-subtitle">
          {t('aiChat.subtitle')}
        </p>
      </div>

      <div className="ai-chat-card glass-card">
        {/* Header */}
        <div className="ai-chat-header">
          <div className="ai-chat-avatar" aria-hidden="true">Fx</div>
          <div>
            <div className="ai-chat-title">{t('hero.fluxaAI')}</div>
            <div className="ai-chat-subtitle">{t('aiChat.cardSubtitle')}</div>
          </div>
        </div>

        {/* Message history */}
        {messages.length > 0 && (
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-message ai-message--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ai-message-avatar">Fx</div>
                )}
                <div className="ai-message-bubble">
                  {msg.role === 'assistant' ? <ChatMarkdown text={msg.text} /> : msg.text}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.text === '' && (
              <div className="ai-message ai-message--assistant">
                <div className="ai-message-avatar">Fx</div>
                <div className="ai-message-bubble ai-message-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Example prompts */}
        {messages.length === 0 && !loading && (
          <div className="ai-examples">
            {examples.map((ex, i) => (
              <button key={i} className="ai-example-chip" onClick={() => setInput(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="ai-chat-form">
          <div className="ai-chat-input-wrapper">
            <input
              className="ai-chat-input"
              type="text"
              placeholder={t('aiChat.placeholder')}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-ai-send"
              disabled={loading || !input.trim()}
            >
              {loading ? <><span className="spinner small" /> {t('aiChat.thinking')}</> : t('aiChat.send')}
            </button>
          </div>
        </form>

        {error && <div className="error-message" role="alert">{error}</div>}
      </div>
    </section>
  );
}

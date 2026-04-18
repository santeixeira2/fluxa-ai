import { useState } from 'react';
import { parseUserInput, chatAiStream } from '../api/client';
import type { SimFormData } from './Simulator';

interface AiChatProps {
  onParsed: (data: SimFormData) => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function AiChat({ onParsed }: AiChatProps) {
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
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  const examples = [
    'Qual a previsão para a NVIDIA em abril?',
    'Quero investir R$5.000 em bitcoin se chegar a R$500.000',
    'Vale a pena comprar ETH agora?',
  ];

  return (
    <section className="ai-chat section" id="ai-chat">
      <div className="section-header">
        <div className="section-label">
          <span className="section-label-dot" />
          Flux AI
        </div>
        <h2 className="section-title">
          Converse com a <span className="gradient-text">Flux AI</span>
        </h2>
        <p className="section-subtitle">
          Faça perguntas sobre o mercado, peça análises ou descreva
          um cenário de investimento — a IA responde com dados reais.
        </p>
      </div>

      <div className="ai-chat-card glass-card">
        {/* Header */}
        <div className="ai-chat-header">
          <div className="ai-chat-avatar" aria-hidden="true">Fx</div>
          <div>
            <div className="ai-chat-title">Flux AI</div>
            <div className="ai-chat-subtitle">Assistente financeiro · Dados em tempo real</div>
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
                <div className="ai-message-bubble">{msg.text}</div>
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
              placeholder="Pergunte sobre o mercado..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-ai-send"
              disabled={loading || !input.trim()}
            >
              {loading ? <><span className="spinner small" /> Pensando</> : '✦ Enviar'}
            </button>
          </div>
        </form>

        {error && <div className="error-message" role="alert">{error}</div>}
      </div>
    </section>
  );
}

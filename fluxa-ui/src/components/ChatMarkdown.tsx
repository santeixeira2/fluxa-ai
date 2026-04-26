import ReactMarkdown from 'react-markdown';

interface ChatMarkdownProps {
  text: string;
  className?: string;
}

export default function ChatMarkdown({ text, className = '' }: ChatMarkdownProps) {
  return (
    <div className={`chat-md ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-black dark:text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08]">
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="underline hover:opacity-70">
              {children}
            </a>
          ),
          h1: ({ children }) => <p className="font-semibold mb-2">{children}</p>,
          h2: ({ children }) => <p className="font-semibold mb-2">{children}</p>,
          h3: ({ children }) => <p className="font-semibold mb-2">{children}</p>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

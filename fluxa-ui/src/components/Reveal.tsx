import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export default function Reveal({ children, delay = 0, className = '', direction = 'up' }: RevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: number;
    let observer: IntersectionObserver;

    // Fallback: Se o observador falhar (ex: problemas no StrictMode, altura inicial zero, etc), forçar revelação.
    timeoutId = window.setTimeout(() => setIsVisible(true), 800 + (delay || 0));

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
          clearTimeout(timeoutId);
        }
      },
      { threshold: 0, rootMargin: '0px 0px 50px 0px' } // Mais tolerante
    );
    
    if (ref.current) observer.observe(ref.current);
    
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [delay]);

  let transformClass = '';
  if (!isVisible) {
    switch (direction) {
      case 'up': transformClass = 'translate-y-8'; break;
      case 'down': transformClass = '-translate-y-8'; break;
      case 'left': transformClass = 'translate-x-8'; break;
      case 'right': transformClass = '-translate-x-8'; break;
      case 'none': transformClass = ''; break;
    }
  } else {
    transformClass = 'translate-y-0 translate-x-0';
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${transformClass} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

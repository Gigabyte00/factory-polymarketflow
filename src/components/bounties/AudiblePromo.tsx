'use client';

import { cn } from '@/lib/utils';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface AudiblePromoProps {
  placement?: 'article-inline' | 'sidebar' | 'footer' | 'homepage';
  className?: string;
  tag?: string;
}

const RECOMMENDED_BOOKS = [
  'Superforecasting',
  'Thinking, Fast and Slow',
  'The Signal and the Noise',
];

export function AudiblePromo({
  placement = 'article-inline',
  className,
  tag = 'polyflow-20',
}: AudiblePromoProps) {
  const url = `https://www.amazon.com/hz/audible/mlp?tag=${tag}`;

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'bounty_click', {
        event_category: 'amazon_bounty',
        bounty_type: 'audible',
        placement,
      });
    }
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border-2 border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',
      className,
    )}>
      {/* Badge */}
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          Free for 30 Days
        </span>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12" />
              <path d="M7 2v4" /><path d="M17 2v4" />
              <circle cx="12" cy="14" r="4" />
              <path d="M12 14v-2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-bold text-lg text-foreground leading-tight">
              Sharpen Your Prediction Skills
            </h3>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Try Audible free for 30 days. Learn from the best minds in forecasting, probability, and decision science.
        </p>

        {/* Recommended Books */}
        <div className="mb-4 space-y-1.5">
          <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            Recommended Listens:
          </p>
          {RECOMMENDED_BOOKS.map((book, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-foreground/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <span className="italic">{book}</span>
            </div>
          ))}
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="block w-full text-center bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          Start Free Trial
        </a>

        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          As an Amazon Associate we earn from qualifying purchases.
        </p>
      </div>
    </div>
  );
}

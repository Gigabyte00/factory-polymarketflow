'use client';

import { cn } from '@/lib/utils';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface KindleUnlimitedPromoProps {
  placement?: 'article-inline' | 'footer' | 'homepage';
  className?: string;
  tag?: string;
}

const SAMPLE_BOOKS = [
  'Fooled by Randomness',
  'The Black Swan',
  'Against the Gods',
  'Risk',
];

export function KindleUnlimitedPromo({
  placement = 'article-inline',
  className,
  tag = 'polyflow-20',
}: KindleUnlimitedPromoProps) {
  const url = `https://www.amazon.com/kindleunlimited?tag=${tag}`;

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'bounty_click', {
        event_category: 'amazon_bounty',
        bounty_type: 'kindle_unlimited',
        placement,
      });
    }
  };

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border-2 border-blue-200 dark:border-blue-900/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
      className,
    )}>
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-lg text-foreground leading-tight">
                Read More on Probability & Decision Science
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Free Trial
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Access thousands of books on probability, statistics, and decision-making with Kindle Unlimited. Try free for 30 days.
        </p>

        {/* Sample titles */}
        <div className="bg-white/60 dark:bg-white/5 rounded-md p-3 mb-4">
          <p className="text-xs font-semibold text-foreground/70 mb-2">Available titles include:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLE_BOOKS.map((book, i) => (
              <span key={i} className="text-xs text-foreground/70 italic truncate">
                {book}
              </span>
            ))}
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
        >
          Try Free for 30 Days
        </a>

        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          As an Amazon Associate we earn from qualifying purchases.
        </p>
      </div>
    </div>
  );
}

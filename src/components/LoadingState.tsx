import React, { useState, useEffect } from 'react';

export interface LoadingStateProps {
  /** Text to display. Default: "Fetching Data Please Wait..." */
  text?: string;
  /** Custom additional className for styling and layout positioning */
  className?: string;
  /** Sizing of text and animated bouncing dots */
  size?: 'sm' | 'md' | 'lg';
  /** Set to true to give it a centered full-height container */
  fullHeight?: boolean;
}

/**
 * Reusable LoadingState Component
 * - Displays centered text: "Fetching Data Please Wait..."
 * - 3 bouncing dots animation after the text
 * - Theme detection directly from document.documentElement.classList.contains('dark')
 * - Dark mode: text color white (#FFFFFF)
 * - Light mode: text color black (#000000)
 * - Subtle pulse animation on whole container
 * - 100% Tailwind CSS with responsive layout and smooth transitions
 */
export default function LoadingState({
  text = 'Fetching Data Please Wait...',
  className = '',
  size = 'md',
  fullHeight = false,
}: LoadingStateProps) {
  // Requirement 4: Detect theme from document.documentElement.classList.contains('dark')
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const checkTheme = () => {
      if (typeof document !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };

    checkTheme();

    // Observe classList changes on <html> to react instantaneously to theme toggles
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const textSize = {
    sm: 'text-xs font-semibold',
    md: 'text-sm sm:text-base font-bold',
    lg: 'text-base sm:text-lg md:text-xl font-bold',
  }[size];

  const dotSize = {
    sm: 'w-1 h-1 sm:w-1.5 sm:h-1.5',
    md: 'w-1.5 h-1.5 sm:w-2 sm:h-2',
    lg: 'w-2 h-2 sm:w-2.5 sm:h-2.5',
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-4 w-full select-none animate-pulse transition-opacity duration-500 ease-in-out ${
        fullHeight ? 'min-h-[280px] h-full' : ''
      } ${isDark ? 'text-white' : 'text-black'} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center flex-wrap gap-1.5 max-w-full">
        <span className={`${textSize} tracking-wide`}>
          {text}
        </span>
        {/* Requirement 3: 3 bouncing dots animation after the text */}
        <span className="inline-flex items-center gap-1 ml-0.5" aria-hidden="true">
          <span
            className={`${dotSize} rounded-full ${
              isDark ? 'bg-white' : 'bg-black'
            } animate-bounce`}
            style={{ animationDelay: '-0.32s' }}
          />
          <span
            className={`${dotSize} rounded-full ${
              isDark ? 'bg-white' : 'bg-black'
            } animate-bounce`}
            style={{ animationDelay: '-0.16s' }}
          />
          <span
            className={`${dotSize} rounded-full ${
              isDark ? 'bg-white' : 'bg-black'
            } animate-bounce`}
          />
        </span>
      </div>
    </div>
  );
}

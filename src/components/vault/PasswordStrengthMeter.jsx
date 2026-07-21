import { useMemo } from 'react';
import { estimatePasswordStrength } from '@/lib/passwordGenerator';
import { cn } from '@/lib/utils';

const BAR_COLORS = {
  0: 'bg-slate-200 dark:bg-slate-700',
  1: 'bg-rose-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-500',
  4: 'bg-emerald-600'
};

const TEXT_COLORS = {
  0: 'text-slate-400',
  1: 'text-rose-600 dark:text-rose-400',
  2: 'text-amber-600 dark:text-amber-400',
  3: 'text-emerald-600 dark:text-emerald-400',
  4: 'text-emerald-700 dark:text-emerald-400'
};

/**
 * Visual strength meter for a password.
 * @param {{ password: string }} props
 * @returns {JSX.Element}
 */
export default function PasswordStrengthMeter({ password = '' }) {
  const { score, label, entropyBits } = useMemo(
    () => estimatePasswordStrength(password),
    [password]
  );

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              segment <= score ? BAR_COLORS[score] : 'bg-slate-200 dark:bg-slate-700'
            )}
          />
        ))}
      </div>
      {password && (
        <p className={cn('text-xs', TEXT_COLORS[score])}>
          {label} · ~{entropyBits} bits
        </p>
      )}
    </div>
  );
}

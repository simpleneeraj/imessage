import { cn } from '@/lib/utils';
import { expressionById, paletteById } from '@/lib/expressions';
import type { ExpressionPalette } from '@/lib/expressions';
import { NoiseBackground } from './noise-background';

interface ExpressionBubbleProps {
  /** Expression payload id — resolves the icon and palette from the config. */
  id: string;
  /** Rendered text (prefer the decrypted message text, fallback to config). */
  text: string;
  /** Override the resolved palette (rarely needed; defaults to config). */
  palette?: ExpressionPalette;
  /** Dim the capsule while the message is sending/queued. */
  pending?: boolean;
}

/**
 * A glossy "candy capsule" for vibe expressions: an animated noise-gradient
 * ring, a soft ambient glow, and a frosted icon disc. All colour comes from the
 * per-expression palette in `lib/expressions.ts`.
 */
export function ExpressionBubble({
  id,
  text,
  palette = paletteById(id),
  pending = false,
}: ExpressionBubbleProps) {
  const Icon = expressionById(id)?.icon;

  return (
    <NoiseBackground
      animating
      gradientColors={palette.gradient}
      containerClassName={cn('rounded-full p-0.5', pending && 'opacity-60')}
    >
      <button
        type="button"
        className="relative flex select-none items-center gap-2 rounded-full pr-2"
      >
        {/* ambient glow */}
        <div
          aria-hidden
          className={cn('absolute inset-0 rounded-full blur-xl', palette.glow)}
        />

        {/* frosted icon disc */}
        {Icon && (
          <div
            className={cn(
              'relative flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br shadow-lg',
              palette.iconGradient,
            )}
          >
            <Icon className={cn('size-4')} />
          </div>
        )}

        <span className="text-sm relative wrap-anywhere font-bold">{text}</span>
      </button>
    </NoiseBackground>
  );
}

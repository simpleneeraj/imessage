import { tv } from 'tailwind-variants';

// Shared iOS context-menu styling (ChatHeader menu, Composer "+" menu,
// ReactionPicker action card): a frosted translucent card with edge-to-edge
// hairline-divided rows and a thick separator between groups.
const frost =
  'bg-white/75 dark:bg-[#2c2c2e]/80 backdrop-blur-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10';

export const iosMenu = tv({
  slots: {
    /** Strips the default coss popup chrome; the card renders inside. */
    popup: 'border-0 bg-transparent p-0 shadow-none ring-0 before:hidden',
    /** Bare frosted surface (e.g. the reaction pill). */
    surface: frost,
    /** Frosted rounded menu card. */
    card: `${frost} overflow-hidden rounded-[14px]`,
    /** Row group with hairline dividers. */
    group: 'divide-y divide-black/5 dark:divide-white/10',
    /** iOS thick separator between groups. */
    separator: 'h-2 bg-black/5 dark:bg-white/10',
  },
});

export const iosMenuItem = tv({
  base: 'cursor-pointer rounded-none px-4 py-2.75 text-[17px] justify-between gap-6 data-highlighted:bg-black/5 dark:data-highlighted:bg-white/10 data-highlighted:text-foreground',
  variants: {
    destructive: {
      true: 'text-destructive data-highlighted:text-destructive',
    },
  },
  defaultVariants: { destructive: false },
});

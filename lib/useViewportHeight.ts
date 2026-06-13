'use client';

import { useEffect } from 'react';

// Keeps an `--app-height` CSS var in sync with the *visual* viewport.
//
// iOS Safari resizes the visual viewport (not the layout viewport) when the
// on-screen keyboard opens, then scroll-shifts the page to reveal the focused
// input — which pushes the chat header off the top of the screen. `dvh` alone
// doesn't account for this. Pinning the app shell to `visualViewport.height`
// and forcing the page back to the top keeps the header in place while typing.
export function useViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;

    const sync = () => {
      const height = vv?.height ?? window.innerHeight;
      root.style.setProperty('--app-height', `${height}px`);
      // Undo the focus-scroll the keyboard triggers on iOS.
      if ((vv?.offsetTop ?? 0) !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    sync();
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('orientationchange', sync);
      root.style.removeProperty('--app-height');
    };
  }, []);
}

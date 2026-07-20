import { useEffect, useRef } from 'react';

import type { Message } from '@@api';

const DEFAULT_TITLE = 'Hork';

/** Flashes document title when new messages arrive while tab is in background. */
export const useChirpOnNewMessages = (
  messages: Message[] | undefined,
  groupId: string
) => {
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!messages) return;

    const count = messages.length;
    const prev = prevCountRef.current;

    if (
      prev !== null &&
      count > prev &&
      document.hidden &&
      messages[0]?.groupId === groupId
    ) {
      const author = messages[0]?.authorName ?? 'Someone';
      const original = document.title;
      let flash = true;

      const interval = window.setInterval(() => {
        document.title = flash
          ? `🦆 ${author} horked!`
          : original;
        flash = !flash;
      }, 800);

      const stop = () => {
        clearInterval(interval);
        document.title = original;
        document.removeEventListener('visibilitychange', onVisible);
      };

      const onVisible = () => {
        if (!document.hidden) stop();
      };

      document.addEventListener('visibilitychange', onVisible);
      window.setTimeout(stop, 8000);

      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.05;
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch {
        // Audio optional
      }
    }

    prevCountRef.current = count;
  }, [messages, groupId]);

  useEffect(() => {
    document.title = DEFAULT_TITLE;
  }, [groupId]);
};

import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'quacker-pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const isStandaloneDisplay = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIosSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isMacTouch = ua.includes('Mac') && navigator.maxTouchPoints > 1;
  return (isAppleDevice || isMacTouch) && !isStandaloneDisplay();
};

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      dismiss();
      return true;
    }

    return false;
  }, [deferredPrompt, dismiss]);

  const showInstallButton = deferredPrompt !== null && !dismissed;
  const showIosHint = !showInstallButton && isIosSafari() && !dismissed;

  return {
    dismiss,
    install,
    showBanner: (showInstallButton || showIosHint) && !isStandaloneDisplay(),
    showInstallButton,
    showIosHint,
  };
};

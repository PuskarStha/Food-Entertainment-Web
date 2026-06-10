import React, { useState, useEffect } from 'react';
import { Download, X, HelpCircle, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showiOSHelp, setShowiOSHelp] = useState(false);

  useEffect(() => {
    // Check if already in standalone display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser prompt
      e.preventDefault();
      // Store event to trigger later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt banner after a short delay for smooth arrival
      const timer = setTimeout(() => {
        // Only show if user hasn't explicitly dismissed it in this session
        const dismissed = sessionStorage.getItem('cozy-install-dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Dynamic checks for iOS device to display friendly instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => {
        const dismissed = sessionStorage.getItem('cozy-install-dismissed');
        if (!dismissed) {
          setShowiOSHelp(true);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the browser prompt
    await deferredPrompt.prompt();

    // Wait for the user's choices
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation decision: ${outcome}`);

    // Clear the prompt since it can only be used once
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    setShowiOSHelp(false);
    sessionStorage.setItem('cozy-install-dismissed', 'true');
  };

  if (isVisible && deferredPrompt) {
    return (
      <div 
        id="pwa-install-banner"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white border border-[#EFECE6] rounded-2xl shadow-xl p-4 flex items-center justify-between gap-4 animate-fade-in"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FAF9F6] rounded-xl text-[#1B4332]">
            <Download size={22} className="stroke-[2]" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm tracking-tight">Food & Entertainment</h4>
            <p className="text-xs text-gray-500 mt-0.5">Install on your home screen for full offline support.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="pwa-install-btn"
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-[#1B4332] text-white hover:bg-[#143225] transition-colors rounded-lg text-xs font-medium cursor-pointer"
          >
            Install
          </button>
          <button
            id="pwa-dismiss-btn"
            onClick={dismissPrompt}
            className="p-1 px-1.5 text-gray-400 hover:text-gray-600 hover:bg-[#FAF9F6] rounded-md transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (showiOSHelp) {
    return (
      <div 
        id="ios-install-banner"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-white border border-[#EFECE6] rounded-2xl shadow-xl p-4 animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0">
              <Smartphone size={22} className="stroke-[2]" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm tracking-tight">Add Food & Entertainment to iOS</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Tap the <code className="bg-[#FAF9F6] px-1 py-0.5 rounded text-gray-800">Share</code> button in Safari, then scroll down and select <strong className="text-gray-800 font-medium">Add to Home Screen</strong>.
              </p>
            </div>
          </div>
          <button
            id="ios-dismiss-btn"
            onClick={dismissPrompt}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-[#FAF9F6] rounded-md transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

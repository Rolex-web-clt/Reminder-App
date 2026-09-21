import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

export const PWAInstallButton: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    setIsIOS(isIosDevice && !isStandalone);
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      showToast('To install, use browser options: "Install Remindify" or "Add to Home Screen".', 'info');
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        id="pwa-install-header-btn"
        onClick={handleInstallClick}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
        title="Install as Progressive Web App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t('install_app')}</span>
      </button>

      {/* iOS instructions modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Install on iOS</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add Remindify to your home screen</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">1.</span>
                <p>Tap the <strong>Share</strong> button in the Safari toolbar below.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">2.</span>
                <p>Scroll down and select <strong>"Add to Home Screen"</strong>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">3.</span>
                <p>Tap <strong>"Add"</strong> at the top right to complete.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

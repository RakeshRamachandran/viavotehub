import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if user is on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isMobileViewport = window.innerWidth <= 768;
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
      
      setIsMobile(isMobileDevice || isMobileViewport);
      setIsIOS(isIOSDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt immediately for mobile users, with delay for desktop
      if (isMobile) {
        setShowPrompt(true);
      } else {
        // Delay for desktop users to avoid being too aggressive
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setHasShownPrompt(true);
      console.log('PWA was installed');
      
      // Show success message
      if (isMobile) {
        alert('🎉 VIA VoteHub has been installed! You can now access it from your home screen.');
      }
    };

    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
      setHasShownPrompt(true);
    }

    // Check if we've shown the prompt before (stored in localStorage)
    const hasShown = localStorage.getItem('pwa-prompt-shown');
    if (hasShown) {
      setHasShownPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isMobile]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        localStorage.setItem('pwa-prompt-shown', 'true');
      } else {
        console.log('User dismissed the install prompt');
        // Store that user dismissed, but show again later
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
    // Store dismissal timestamp
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Show again in 24 hours
    setTimeout(() => {
      if (!hasShownPrompt) {
        setShowPrompt(true);
      }
    }, 24 * 60 * 60 * 1000);
  };

  const handleShowInstallGuide = () => {
    setShowInstallGuide(true);
    setShowPrompt(false);
  };

  const handleCloseInstallGuide = () => {
    setShowInstallGuide(false);
  };

  // Don't show if already installed or if we've shown recently
  if (!showPrompt || hasShownPrompt) {
    return null;
  }

  // Check if user dismissed recently (within 24 hours)
  const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
  if (dismissedTime && (Date.now() - parseInt(dismissedTime)) < 24 * 60 * 60 * 1000) {
    return null;
  }

  // PWA Installation Guide Modal
  if (showInstallGuide) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">📱 Install VIA VoteHub</h3>
              <button
                onClick={handleCloseInstallGuide}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {isIOS ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">📱 iOS Installation Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Tap the <strong>Share</strong> button <span className="text-lg">📤</span> in Safari</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong> to confirm</li>
                    <li>Your app will now appear on your home screen!</li>
                  </ol>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">✨ Benefits:</h4>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• Quick access from home screen</li>
                    <li>• Works offline</li>
                    <li>• App-like experience</li>
                    <li>• No need to open browser</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">🤖 Android Installation Steps:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Tap the <strong>Install</strong> button below</li>
                    <li>Confirm the installation in the popup</li>
                    <li>Your app will be installed automatically!</li>
                  </ol>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">✨ Benefits:</h4>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• Quick access from home screen</li>
                    <li>• Works offline</li>
                    <li>• App-like experience</li>
                    <li>• Push notifications</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleInstall}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                >
                  📲 Install Now
                </button>
              </div>
            )}
            
            <button
              onClick={handleCloseInstallGuide}
              className="w-full mt-4 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-2xl z-50 transform transition-all duration-300 ease-in-out">
      <div className="max-w-7xl mx-auto">
        {/* Mobile-optimized layout */}
        {isMobile ? (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">📱 Install VIA VoteHub</h3>
                <p className="text-blue-100 text-sm">Add to your home screen for the best experience!</p>
                <p className="text-blue-200 text-xs mt-1">• Quick access • Works offline • App-like experience</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleRemindLater}
                className="flex-1 px-4 py-3 text-blue-100 hover:text-white transition-colors duration-200 text-sm font-medium border border-blue-400 rounded-lg"
              >
                Remind Later
              </button>
              {isIOS ? (
                <button
                  onClick={handleShowInstallGuide}
                  className="flex-1 bg-white text-blue-600 px-4 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors duration-200 text-sm shadow-lg"
                >
                  📱 How to Install
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-white text-blue-600 px-4 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors duration-200 text-sm shadow-lg"
                >
                  📲 Install Now
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Desktop layout */
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Install VIA VoteHub</h3>
                <p className="text-blue-100 text-xs sm:text-sm">Add to home screen for quick access</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-blue-100 hover:text-white transition-colors duration-200 text-sm"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors duration-200 text-sm shadow-lg"
              >
                Install
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

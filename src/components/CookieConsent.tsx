import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem("cookie-consent", "all");
    setIsVisible(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem("cookie-consent", "necessary");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 animate-fade-up sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm lg:max-w-md">
      <div className="glass rounded-2xl p-4 border border-border/50 shadow-xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Cookies</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Wij gebruiken cookies om de website goed te laten werken en te verbeteren. Lees meer in ons{" "}
              <a href="/privacy" className="text-primary hover:underline">
                privacybeleid
              </a>
              .
            </p>
          </div>
          <button
            onClick={acceptNecessary}
            className="p-1 hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button onClick={acceptNecessary} variant="outline" className="h-9 text-xs px-3">
            Alleen noodzakelijk
          </Button>
          <Button onClick={acceptAll} variant="hero" className="h-9 text-xs px-3">
            Alles accepteren
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

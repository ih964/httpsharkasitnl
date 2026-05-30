import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1400);
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
    <div className="fixed bottom-4 left-4 right-4 z-40 animate-fade-up sm:left-auto sm:right-6 sm:max-w-md">
      <div className="glass rounded-2xl p-4 border border-border/50 shadow-xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">Cookies</h3>
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
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={acceptNecessary} variant="outline" className="flex-1 h-10 text-sm">
            Alleen noodzakelijk
          </Button>
          <Button onClick={acceptAll} variant="hero" className="flex-1 h-10 text-sm">
            Alles accepteren
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

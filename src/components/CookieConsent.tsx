import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Delay showing the banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-fade-up">
      <div className="container max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-6 border border-border/50 shadow-xl">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">🍪 Cookies</h3>
              <p className="text-sm text-muted-foreground">
                Wij gebruiken cookies om je ervaring op onze website te verbeteren, 
                het websiteverkeer te analyseren en gepersonaliseerde content te tonen. 
                Door op "Accepteren" te klikken, ga je akkoord met ons{" "}
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={acceptNecessary}
              variant="outline"
              className="flex-1"
            >
              Alleen noodzakelijk
            </Button>
            <Button
              onClick={acceptAll}
              variant="hero"
              className="flex-1"
            >
              Alles accepteren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

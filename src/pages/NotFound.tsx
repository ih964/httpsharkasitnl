import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple header */}
      <header className="py-6 px-6">
        <Link to="/">
          <img src={logo} alt="HARKAS IT" className="h-10" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          {/* 404 number */}
          <div className="relative mb-8">
            <h1 className="text-[150px] md:text-[200px] font-bold text-gradient leading-none">
              404
            </h1>
            <div className="absolute inset-0 bg-primary/10 blur-[100px] pointer-events-none" />
          </div>

          {/* Message */}
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Oeps! Pagina niet gevonden
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            De pagina die je zoekt bestaat niet of is verplaatst. 
            Geen zorgen, we helpen je graag verder!
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/">
                <Home className="w-4 h-4" />
                Naar homepagina
              </Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4" />
              Ga terug
            </Button>
          </div>

          {/* Helpful links */}
          <div className="mt-12 p-6 rounded-2xl glass">
            <p className="text-sm text-muted-foreground mb-4">Misschien zoek je een van deze pagina's:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/#diensten" className="text-sm text-primary hover:underline">Diensten</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/#portfolio" className="text-sm text-primary hover:underline">Portfolio</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/#prijzen" className="text-sm text-primary hover:underline">Prijzen</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/#contact" className="text-sm text-primary hover:underline">Contact</Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/over-ons" className="text-sm text-primary hover:underline">Over Ons</Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Hulp nodig? <a href="tel:+31851249091" className="text-primary hover:underline">Bel ons: 085 124 9091</a>
        </p>
      </footer>
    </div>
  );
};

export default NotFound;

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "IT Beheer", href: "/#diensten" },
  { name: "Websites & Apps", href: "/diensten/websites" },
  { name: "Marketing", href: "/diensten/marketing" },
  { name: "Pakketten", href: "/#prijzen" },
  { name: "Contact", href: "/#contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-border/30 bg-background/70 backdrop-blur-xl">
        <div className="container px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            <a href="/" className="flex items-center gap-3 group">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/70 border border-border/50 p-2 shadow-sm group-hover:border-primary/40 transition-colors">
                <img src={logo} alt="HARKAS IT" className="h-full w-full object-contain" />
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-sm font-semibold tracking-wide">Harkas IT</span>
                <span className="block text-xs text-muted-foreground">IT-beheer & digitale groei</span>
              </span>
            </a>

            <div className="hidden lg:flex items-center gap-6 xl:gap-7">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            <div className="hidden lg:block">
              <Button variant="hero" asChild>
                <a href="/#contact">Plan gratis IT-check</a>
              </Button>
            </div>

            <button
              className="lg:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden glass border-b border-border/30 bg-background/90 backdrop-blur-xl">
          <div className="container px-6 py-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <Button variant="hero" className="w-full mt-4" asChild>
              <a href="/#contact">Plan gratis IT-check</a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Diensten", href: "/#diensten" },
  { name: "IT Beheer", href: "/diensten/it-beheer" },
  { name: "Microsoft 365", href: "/diensten/microsoft-365" },
  { name: "Websites", href: "/diensten/websites" },
  { name: "Support", href: "/support" },
  { name: "Over ons", href: "/over-ons" },
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
              <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow group-hover:scale-105 transition-transform duration-300">
                <span className="text-xl font-black tracking-tight text-primary-foreground">H</span>
                <span className="absolute inset-0 rounded-2xl border border-white/20" />
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-base font-bold tracking-tight">Harkas IT</span>
                <span className="block text-xs text-muted-foreground">IT-beheer en support</span>
              </span>
            </a>

            <div className="hidden xl:flex items-center gap-5">
              {navLinks.map((link) => (
                <a key={link.name} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              ))}
            </div>

            <div className="hidden xl:block">
              <Button variant="hero" asChild>
                <a href="/#contact">Plan gratis IT-check</a>
              </Button>
            </div>

            <button className="xl:hidden p-2 rounded-xl hover:bg-secondary transition-colors" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="xl:hidden glass border-b border-border/30 bg-background/90 backdrop-blur-xl">
          <div className="container px-6 py-6 space-y-4">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className="block text-lg font-medium text-muted-foreground hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>
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

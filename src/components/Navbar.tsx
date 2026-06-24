import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const serviceLinks = [
  { name: "IT Beheer", href: "/diensten/it-beheer" },
  { name: "Microsoft 365 beheer", href: "/diensten/microsoft-365-beheer" },
  { name: "Werkplekbeheer", href: "/diensten/werkplekbeheer" },
  { name: "Remote Support", href: "/diensten/remote-support" },
  { name: "IT Support MKB", href: "/diensten/it-support-mkb" },
  { name: "Websites & Webapps", href: "/diensten/websites" },
  { name: "Automatisering", href: "/diensten/marketing" },
];

const mainLinks = [
  { name: "Home", href: "/" },
  { name: "Praktijkvoorbeelden", href: "/#portfolio" },
  { name: "Pakketten", href: "/#prijzen" },
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
              <div className="relative group">
                <button className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-3">Diensten <ChevronDown className="w-4 h-4" /></button>
                <div className="invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 absolute left-0 top-full min-w-[260px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-3">
                  {serviceLinks.map((link) => <a key={link.name} href={link.href} className="block rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">{link.name}</a>)}
                </div>
              </div>
              {mainLinks.map((link) => <a key={link.name} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{link.name}</a>)}
            </div>

            <div className="hidden xl:block"><Button variant="hero" asChild><a href="/#contact">Plan gratis IT-check</a></Button></div>
            <button className="xl:hidden p-2 rounded-xl hover:bg-secondary transition-colors" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">{isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="xl:hidden glass border-b border-border/30 bg-background/95 backdrop-blur-xl max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="container px-6 py-6 space-y-6">
            <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Diensten</p>{serviceLinks.map((link) => <a key={link.name} href={link.href} className="block rounded-xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>{link.name}</a>)}</div>
            <div className="space-y-2 border-t border-border/40 pt-5">{mainLinks.map((link) => <a key={link.name} href={link.href} className="block rounded-xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" onClick={() => setIsOpen(false)}>{link.name}</a>)}</div>
            <Button variant="hero" className="w-full" asChild><a href="/#contact" onClick={() => setIsOpen(false)}>Plan gratis IT-check</a></Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

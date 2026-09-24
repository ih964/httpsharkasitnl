import { useState } from "react";
import { ChevronDown, Menu, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const serviceLinks = [
  {
    name: "IT & Cloud",
    description: "Microsoft 365, cloud, werkplekken en modern beheer.",
    href: "/diensten/microsoft-365-beheer",
  },
  {
    name: "Managed IT & Support",
    description: "Dagelijks beheer, servicedesk en ondersteuning.",
    href: "/diensten/it-beheer",
  },
  {
    name: "Netwerk & Security",
    description: "Veilige toegang, apparaten, netwerk en identity.",
    href: "/diensten/werkplekbeheer",
  },
  {
    name: "Installatie & Field Services",
    description: "Hardware, roll-outs en technische inzet op locatie.",
    href: "/diensten/installatie-field-services",
  },
  {
    name: "Software & Digital",
    description: "Websites, webapps, portalen en automatisering.",
    href: "/diensten/websites",
  },
  {
    name: "Zorgtechnologie",
    description: "Medische techniek, zorgdomotica en koppelingen.",
    href: "/diensten/zorgtechnologie",
  },
  {
    name: "Online Marketing",
    description: "SEO, campagnes en digitale groei.",
    href: "/diensten/seo",
  },
];

const mainLinks = [
  { name: "Sectoren", href: "/#sectoren" },
  { name: "Cases", href: "/#portfolio" },
  { name: "Over ons", href: "/over-ons" },
  { name: "Contact", href: "/#contact" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="border-b border-border/50 bg-background/85 backdrop-blur-2xl">
        <div className="container px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            <a href="/" className="flex items-center gap-3 group">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-button group-hover:scale-[1.03] transition-transform duration-300">
                <span className="text-lg font-black tracking-tight text-primary-foreground">H</span>
              </span>
              <span className="leading-tight">
                <span className="block text-base font-bold tracking-tight">Harkas IT</span>
                <span className="hidden sm:block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">IT · Technology · Digital</span>
              </span>
            </a>

            <div className="hidden xl:flex items-center gap-7">
              <div className="relative group">
                <button className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-7">
                  Expertises <ChevronDown className="w-4 h-4" />
                </button>
                <div className="invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 absolute left-1/2 -translate-x-1/2 top-full w-[760px] rounded-3xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl p-5">
                  <div className="grid grid-cols-2 gap-2">
                    {serviceLinks.map((link) => (
                      <a key={link.name} href={link.href} className="group/item rounded-2xl px-4 py-4 hover:bg-secondary/80 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm text-foreground mb-1">{link.name}</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">{link.description}</p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {mainLinks.map((link) => (
                <a key={link.name} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              ))}
            </div>

            <div className="hidden xl:block">
              <Button variant="hero" asChild>
                <a href="/?aanvraag=kennismaking#contact">Praat met een specialist</a>
              </Button>
            </div>

            <button
              className="xl:hidden p-2 rounded-xl hover:bg-secondary transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Menu openen of sluiten"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="xl:hidden border-b border-border/50 bg-background/98 backdrop-blur-2xl max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="container px-5 py-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">Expertises</p>
              <div className="grid gap-1">
                {serviceLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="block rounded-xl px-3 py-3 hover:bg-secondary transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="block text-sm font-semibold">{link.name}</span>
                    <span className="block text-xs text-muted-foreground mt-1">{link.description}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-1 border-t border-border/50 pt-5">
              {mainLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
            </div>

            <Button variant="hero" className="w-full" asChild>
              <a href="/?aanvraag=kennismaking#contact" onClick={() => setIsOpen(false)}>Praat met een specialist</a>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

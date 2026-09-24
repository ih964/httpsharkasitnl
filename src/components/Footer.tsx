import { Instagram, Linkedin, Mail, MessageSquareText, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const expertiseLinks = [
  { label: "IT & Cloud", href: "/diensten/microsoft-365-beheer" },
  { label: "Managed IT & Support", href: "/diensten/it-beheer" },
  { label: "Netwerk & Security", href: "/diensten/werkplekbeheer" },
  { label: "Installatie & Field Services", href: "/diensten/installatie-field-services" },
  { label: "Software & Digital", href: "/diensten/websites" },
  { label: "Zorgtechnologie", href: "/diensten/zorgtechnologie" },
  { label: "Online Marketing", href: "/diensten/seo" },
];

const Footer = () => {
  return (
    <footer className="py-16 border-t border-border/50 bg-card/20">
      <div className="container px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_0.8fr_1fr] gap-10 xl:gap-14">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <img src={logo} alt="Harkas IT logo" className="h-10 max-w-[150px] object-contain object-left" />
              <div>
                <p className="font-semibold">Harkas IT</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">IT · Technology · Digital</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
              Technologiepartner voor organisaties. Van IT en cloud tot installaties, software, automatisering en specialistische zorgtechnologie.
            </p>
            <a href="/?aanvraag=kennismaking#contact" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all">
              Praat met een specialist <span aria-hidden="true">→</span>
            </a>
          </div>

          <div>
            <h3 className="font-semibold mb-5">Expertises</h3>
            <div className="space-y-3">
              {expertiseLinks.map((link) => (
                <Link key={link.label} to={link.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-5">Harkas IT</h3>
            <div className="space-y-3">
              <a href="/#sectoren" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Sectoren</a>
              <a href="/#portfolio" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Cases</a>
              <Link to="/over-ons" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Over ons</Link>
              <a href="/#prijzen" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Prijzen</a>
              <Link to="/it-check" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">IT-zelfcheck</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-5">Contact</h3>
            <div className="space-y-3 mb-6">
              <a href="mailto:info@harkasit.nl" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" /> info@harkasit.nl
              </a>
              <a href="tel:+31851249091" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" /> 085 124 9091
              </a>
              <a href="https://wa.me/31851249091" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <MessageSquareText className="w-4 h-4" /> WhatsApp
              </a>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://www.linkedin.com/in/iliasharkati" className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="https://www.instagram.com/harkasit" className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Harkas IT. Alle rechten voorbehouden.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacyverklaring</Link>
            <Link to="/voorwaarden" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Algemene voorwaarden</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

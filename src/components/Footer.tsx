import { Instagram, Linkedin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const serviceLinks = [
  { label: "IT Beheer", href: "/diensten/support" },
  { label: "Microsoft 365", href: "/diensten/support" },
  { label: "Werkplekbeheer", href: "/diensten/support" },
  { label: "Remote Support", href: "/diensten/support" },
  { label: "Websites & Webapps", href: "/diensten/websites" },
  { label: "Automatisering", href: "/diensten/marketing" },
];

const Footer = () => {
  return (
    <footer className="py-14 border-t border-border/50">
      <div className="container px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <img src={logo} alt="HARKAS IT" className="h-10" />
              <div>
                <p className="font-semibold">Harkas IT</p>
                <p className="text-xs text-muted-foreground">IT-beheer, support en digitale oplossingen</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Betrouwbaar IT-beheer, Microsoft 365-support, werkplekbeheer, websites en automatisering voor ondernemers en organisaties.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Diensten</h3>
            <div className="space-y-3">
              {serviceLinks.map((link) => (
                <a key={link.label} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <div className="space-y-3">
              <a href="/diensten/support" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Ticket aanmaken</a>
              <a href="/diensten/support" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Remote support</a>
              <a href="/diensten/support" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Klantportaal</a>
              <a href="/#contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-3 mb-5">
              <a href="mailto:info@harkasit.nl" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-4 h-4" /> info@harkasit.nl
              </a>
              <a href="tel:+31851249091" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="w-4 h-4" /> 085 124 9091
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

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
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

import { Linkedin, Facebook, Instagram, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border/50">
      <div className="container px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <img src={logo} alt="HARKAS IT" className="h-10" />
            <div>
              <p className="text-sm font-medium">Harkas IT — IT-beheer, websites en digitale oplossingen voor het mkb.</p>
              <p className="text-sm text-muted-foreground">© 2025 Alle rechten voorbehouden</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="/#diensten" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              IT Beheer
            </a>
            <a href="/diensten/websites" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Websites & Apps
            </a>
            <a href="/diensten/marketing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Marketing
            </a>
            <Link to="/over-ons" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Over Ons
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/voorwaarden" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Algemene Voorwaarden
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors"
              aria-label="Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

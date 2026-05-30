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
      <div className="glass border-b border-border/30">
        <div className="container px-6">
          <div className="flex items-center justify-between h-20">
            <a href="/" className="flex items-center">
              <img src={logo} alt="HARKAS IT" className="h-12" />
            </a>

            <div className="hidden lg:flex items-center gap-7">
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
              className="lg:hidden p-2"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden glass border-b border-border/30">
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

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Target, Award, Clock, ShieldCheck, Laptop, Globe } from "lucide-react";

const values = [
  {
    icon: Users,
    title: "Persoonlijk contact",
    description: "Je hebt direct contact met iemand die jouw omgeving begrijpt en snel kan schakelen.",
  },
  {
    icon: ShieldCheck,
    title: "Veilige basis",
    description: "We letten op gebruikers, werkplekken, toegang, updates en duidelijke afspraken.",
  },
  {
    icon: Target,
    title: "Praktisch en duidelijk",
    description: "Geen onnodig ingewikkelde taal, maar duidelijke uitleg en oplossingen die werken.",
  },
  {
    icon: Award,
    title: "Kwaliteit",
    description: "We leveren liever betrouwbaar werk dan snelle oplossingen die later problemen geven.",
  },
];

const expertise = [
  { icon: ShieldCheck, title: "Microsoft 365", text: "E-mail, Teams, SharePoint, OneDrive, gebruikers en licenties." },
  { icon: Laptop, title: "Werkplekbeheer", text: "Laptops, printers, scanners, instellingen en dagelijkse support." },
  { icon: Clock, title: "Support", text: "Remote hulp, duidelijke opvolging en praktisch meedenken." },
  { icon: Globe, title: "Web & automatisering", text: "Websites, webapps, formulieren en slimme digitale workflows." },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
          
          <div className="container px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4">
                Over Harkas IT
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Jouw vaste partner voor <span className="text-gradient">IT, support en digitale oplossingen</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Harkas IT helpt ondernemers en organisaties met betrouwbare, begrijpelijke en veilige IT. Van Microsoft 365 en werkplekken tot websites, webapps en automatisering.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 relative">
          <div className="container px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  IT moet rust geven, <span className="text-gradient">geen gedoe</span>
                </h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  Veel bedrijven lopen vast op dezelfde problemen: trage werkplekken, onduidelijke Microsoft 365-instellingen, rechten die niet goed staan, support die te lang duurt of websites die niet meer professioneel aanvoelen.
                </p>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  Harkas IT helpt praktisch en persoonlijk. We denken mee, lossen problemen op en zorgen dat jouw digitale omgeving beter werkt.
                </p>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  Met ervaring in systeembeheer, functioneel beheer, Microsoft 365, werkplekbeheer, supportprocessen en weboplossingen biedt Harkas IT brede ondersteuning voor moderne bedrijven.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <a href="/#contact" className="gap-3">
                    Plan gratis IT-check
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {expertise.map((item) => (
                  <div key={item.title} className="p-6 rounded-2xl gradient-card border border-border/50">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
          
          <div className="container px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Waar Harkas IT voor <span className="text-gradient">staat</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                De basis van onze aanpak: duidelijk, veilig, persoonlijk en gericht op oplossingen die in de praktijk werken.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl gradient-card border border-border/50 hover:border-primary/30 transition-all duration-500 text-center group animate-fade-up"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <value.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 relative">
          <div className="container px-6">
            <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl gradient-card border border-border/50">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Wil je weten waar jouw IT <span className="text-gradient">beter kan?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Vraag een gratis IT-check aan. We kijken mee naar je huidige situatie en geven eerlijk advies over wat beter, veiliger of slimmer kan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="lg" asChild>
                  <a href="/#contact" className="gap-2">
                    Plan gratis IT-check
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="tel:+31851249091" className="gap-2">
                    Bel 085 124 9091
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default About;

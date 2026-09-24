import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Sectors from "@/components/Sectors";
import ITCheckCTA from "@/components/ITCheckCTA";
import Process from "@/components/Process";
import Certifications from "@/components/Certifications";
import Portfolio from "@/components/Portfolio";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CookieConsent from "@/components/CookieConsent";
import { applyPageSeo } from "@/lib/pageSeo";

const Index = () => {
  useEffect(() => {
    applyPageSeo({
      title: "Harkas IT | IT, Technologie & Digitale Oplossingen",
      description: "Harkas IT ondersteunt organisaties met IT-beheer, Microsoft 365, cloud, field services, websites, automatisering, online marketing en zorgtechnologie.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Sectors />
        <Process />
        <Portfolio />
        <Certifications />
        <ITCheckCTA />
        <Pricing />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
};

export default Index;

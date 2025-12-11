import { useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const portfolioItems = [
  {
    title: "Brandweer Inside",
    url: "https://brandweerinside.nl/",
    description: "Informatief platform voor de brandweer",
  },
  {
    title: "TSP TL",
    url: "https://tsptl.nl/",
    description: "Professionele bedrijfswebsite",
  },
  {
    title: "Elektro Blommestein",
    url: "https://elektro-blommestein.nl/",
    description: "Website voor elektrotechnisch bedrijf",
  },
];

const Portfolio = () => {
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  return (
    <>
      <section id="portfolio" className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        
        <div className="container px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ons <span className="text-gradient">Portfolio</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Bekijk enkele voorbeelden van websites die wij hebben gemaakt voor onze klanten.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {portfolioItems.map((item, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div 
                      className="glass rounded-2xl p-6 h-full cursor-pointer hover:border-primary/50 transition-all duration-300 group"
                      onClick={() => setSelectedSite(item.url)}
                    >
                      <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden relative">
                        <iframe
                          src={item.url}
                          title={item.title}
                          className="w-full h-full scale-[0.5] origin-top-left pointer-events-none"
                          style={{ width: '200%', height: '200%' }}
                        />
                        <div className="absolute inset-0 bg-background/50 group-hover:bg-background/30 transition-colors flex items-center justify-center">
                          <ExternalLink className="w-8 h-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12" />
              <CarouselNext className="hidden md:flex -right-12" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Fullscreen iframe modal */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <span className="text-sm text-muted-foreground truncate max-w-[70%]">{selectedSite}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSite(null)}
              className="shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <iframe
            src={selectedSite}
            title="Portfolio site"
            className="w-full h-[calc(100vh-65px)]"
          />
        </div>
      )}
    </>
  );
};

export default Portfolio;

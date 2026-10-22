import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Globe2, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

type Project = {
  name: string;
  category: string;
  description: string;
  url: string;
  preview?: string;
  monogram: string;
};

type Organisation = {
  name: string;
  role: string;
  logo?: string;
};

const projects: Project[] = [
  {
    name: "Comfort by Sons",
    category: "WooCommerce & maatwerk",
    description: "Maatwerk meubelconfigurator binnen WooCommerce voor banken en poefs, met keuzes voor stof en afmetingen.",
    url: "https://comfortbysons.nl/",
    preview: "https://s0.wordpress.com/mshots/v1/https%3A%2F%2Fcomfortbysons.nl%2F?w=1200",
    monogram: "C",
  },
  {
    name: "SMVC Fair Play",
    category: "Verenigingswebsite & WordPress",
    description: "Verenigingswebsite en inrichting van WordPress, zodat de vereniging de site zelf kan beheren.",
    url: "https://smvcfairplay.nl/",
    preview: "https://screenshot2.lovable.dev/lovp_24derjrarv880bwgfrtx02w90z/e3020aba2f955afbff16fafb66bd02bb_1790888371651.png",
    monogram: "F",
  },
  {
    name: "Brandweer Inside",
    category: "Contentwebsite",
    description: "Website gericht op nieuws, informatie en content rondom de brandweer.",
    url: "https://brandweerinside.nl/",
    preview: "https://image.thum.io/get/noanimate/width/1000/crop/650/maxAge/168/https://brandweerinside.nl/",
    monogram: "B",
  },
  {
    name: "De Jager Ongediertebestrijding",
    category: "Bedrijfswebsite",
    description: "Online presentatie van ongediertebestrijdingsdiensten met duidelijke informatie en contactmogelijkheden.",
    url: "https://dejagerongediertebestrijding.nl/",
    preview: "https://image.thum.io/get/noanimate/width/1000/crop/650/maxAge/168/https://dejagerongediertebestrijding.nl/",
    monogram: "D",
  },
  {
    name: "Elekro Blommestein",
    category: "Bedrijfswebsite",
    description: "Website voor een technisch dienstverlenend bedrijf met overzichtelijke informatie over de diensten.",
    url: "https://elekroblommestein.nl/",
    preview: "https://image.thum.io/get/noanimate/width/1000/crop/650/maxAge/168/https://elekroblommestein.nl/",
    monogram: "E",
  },
  {
    name: "TSPTL",
    category: "Webproject",
    description: "Website met een heldere structuur en een professionele presentatie.",
    url: "https://tsptl.nl/",
    preview: "https://image.thum.io/get/noanimate/width/1000/crop/650/maxAge/168/https://tsptl.nl/",
    monogram: "T",
  },
  {
    name: "Stichting Albir Wa Taqwa",
    category: "Stichtingswebsite",
    description: "Informatieve website voor de stichting, met ruimte voor activiteiten en contact.",
    url: "https://stichtingalbirwataqwa.nl/",
    preview: "https://image.thum.io/get/noanimate/width/1000/crop/650/maxAge/168/https://stichtingalbirwataqwa.nl/",
    monogram: "A",
  },
];

// Selectie uit de werkervaring van de oprichter. Dit is geen lijst van
// actieve Harkas IT-beheercontracten of commerciële aanbevelingen.
// Zorggroep Almere: logo uitsluitend met toestemming; daarom tekstweergave.
const organisations: Organisation[] = [
  { name: "Zorggroep Almere", role: "Cloud- & Serverbeheer" },
  {
    name: "ActiVite",
    role: "Functioneel beheer",
    logo: "https://www.zorgkaartnederland.nl/cache/4/c/8/b/d/4c8bd1a7b7fd7cb35f2c63b32a5b91965762df78.png",
  },
  {
    name: "Partou",
    role: "Systeembeheer",
    logo: "https://www.iamexpat.nl/_next/image?q=75&url=https%3A%2F%2Fdirectus.iamexpat.com%2Fassets%2F4c718b2b-6555-42a2-a5c6-7fd19e2caac5&w=640",
  },
  {
    name: "Koning Willem I College",
    role: "Werkplekbeheer",
    logo: "https://www.kw1c.nl/media/brubgujw/logo-kw1c.png",
  },
  {
    name: "IVC Evidensia",
    role: "IT-support",
    logo: "https://www.vetpd.com/public/filemanager/image/ivc-evidensia-logo-2.jpeg",
  },
  {
    name: "Previder Corporaties",
    role: "IT-support",
    logo: "https://www.glaspoort.nl/-/jssmedia/previder-logo-website-1024x512.png?mh=220&mw=1080",
  },
  {
    name: "GGNet",
    role: "Werkplekbeheer",
    logo: "https://assets.foleon.com/eu-central-1/de-uploads-7e3kk3/49115/logo-zonder-achtergrond_digitaal.7fccc9460c79.png?ext=webp",
  },
  { name: "BEN IT", role: "IT-werkzaamheden" },
  {
    name: "VIP Response",
    role: "Softwareontwikkeling",
    logo: "https://images.seeklogo.com/logo-png/49/1/vip-response-logo-png_seeklogo-498600.png",
  },
];

const CarouselSlider = ({
  label,
  interval,
  children,
}: {
  label: string;
  interval: number;
  children: ReactNode;
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!api || paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") api.scrollNext();
    }, interval);
    return () => window.clearInterval(timer);
  }, [api, paused, reduceMotion, interval]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <Carousel
        opts={{ align: "start", loop: true, containScroll: false }}
        setApi={setApi}
        aria-label={label}
      >
        <CarouselContent className="-ml-4">{children}</CarouselContent>
      </Carousel>
      <div className="mt-7 flex items-center justify-end gap-3">
        <button
          type="button"
          aria-label={"Vorige in " + label}
          onClick={() => api?.scrollPrev()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/80 text-foreground transition-colors hover:border-primary/60 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={"Volgende in " + label}
          onClick={() => api?.scrollNext()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/80 text-foreground transition-colors hover:border-primary/60 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

const ProjectPreview = ({ project }: { project: Project }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950">
      <div className="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-2 border-b border-white/10 bg-[#111a2a] px-4">
        <span className="h-2 w-2 rounded-full bg-rose-400/75" />
        <span className="h-2 w-2 rounded-full bg-amber-400/75" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/75" />
        <span className="ml-3 max-w-[70%] truncate text-[10px] text-slate-400">{project.url.replace("https://", "")}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-9 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-800 via-[#101c35] to-[#102f50] p-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-4xl font-black text-white shadow-xl">{project.monogram}</span>
        <span className="text-sm font-medium text-slate-300">Bekijk de website via de knop hieronder</span>
      </div>
      {project.preview && !imageFailed && (
        <img
          src={project.preview}
          alt={"Voorbeeldweergave van de website " + project.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
          className={`absolute inset-x-0 bottom-0 top-9 h-[calc(100%_-_2.25rem)] w-full object-cover object-top transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/35 to-transparent" />
    </div>
  );
};

const ProjectCard = ({ project }: { project: Project }) => (
  <article className="group h-full overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow">
    <ProjectPreview project={project} />
    <div className="flex min-h-[226px] flex-col p-6 sm:p-7">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.17em] text-primary">{project.category}</p>
      <h3 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">{project.name}</h3>
      <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary transition-all hover:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Bekijk website <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  </article>
);

const OrganisationCard = ({ item }: { item: Organisation }) => {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <article className="flex h-full min-h-[205px] flex-col rounded-2xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/40">
      <div className="flex h-[108px] items-center justify-center overflow-hidden rounded-xl bg-white px-4 py-4">
        {item.logo && !imageFailed ? (
          <img
            src={item.logo}
            alt={"Logo van " + item.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-center text-lg font-extrabold tracking-tight text-slate-800">{item.name}</span>
        )}
      </div>
      <div className="mt-4 text-center">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{item.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{item.role}</p>
      </div>
    </article>
  );
};

const Portfolio = () => (
  <section id="portfolio" className="relative scroll-mt-24 overflow-hidden py-20 md:py-28">
    <div className="pointer-events-none absolute -right-24 top-0 h-[450px] w-[450px] rounded-full bg-primary/5 blur-[100px]" />
    <div className="container relative px-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="mb-10 max-w-3xl"
      >
        <span className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <Layers3 className="h-4 w-4" aria-hidden="true" /> Ons werk
        </span>
        <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
          Websites & <span className="text-gradient">digitale projecten</span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Een selectie van klantwebsites en digitale projecten waaraan Harkas IT heeft gewerkt.
        </p>
      </motion.div>

      <CarouselSlider label="websites en digitale projecten" interval={6500}>
        {projects.map((project) => (
          <CarouselItem key={project.name} className="basis-[92%] pl-4 sm:basis-[74%] md:basis-[54%] lg:basis-[43%] xl:basis-[39%]">
            <ProjectCard project={project} />
          </CarouselItem>
        ))}
      </CarouselSlider>

      <div className="my-16 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent md:my-20" />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="mb-9 max-w-3xl"
      >
        <span className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
          <Globe2 className="h-4 w-4" aria-hidden="true" /> Ervaring
        </span>
        <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
          Ervaring bij <span className="text-gradient">organisaties</span>
        </h2>
        <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
          Onze oprichter heeft als IT-specialist ervaring opgedaan binnen verschillende organisaties in de zorg, het onderwijs en de IT-sector.
        </p>
      </motion.div>

      <CarouselSlider label="organisaties en werkervaring" interval={4300}>
        {organisations.map((item) => (
          <CarouselItem key={item.name} className="basis-[77%] pl-4 min-[420px]:basis-[58%] sm:basis-[44%] md:basis-[31%] lg:basis-[24%] xl:basis-[20%]">
            <OrganisationCard item={item} />
          </CarouselItem>
        ))}
      </CarouselSlider>

      <p className="mx-auto mt-6 max-w-4xl text-center text-xs leading-relaxed text-muted-foreground">
        Deze vermeldingen hebben betrekking op de persoonlijke werkervaring van de oprichter. Ze betekenen niet dat deze organisaties momenteel klant van Harkas IT zijn of Harkas IT aanbevelen.
      </p>

      <div className="mt-14 flex flex-col items-center justify-center gap-5 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card/75 to-primary/5 px-6 py-10 text-center">
        <h3 className="text-2xl font-bold md:text-3xl">Ook iets moois laten realiseren?</h3>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Van website en automatisering tot compleet IT-beheer: vertel ons wat je wilt bereiken.
        </p>
        <Button variant="hero" asChild>
          <Link to="/#contact" className="gap-2">
            Bespreek jouw project <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

export default Portfolio;

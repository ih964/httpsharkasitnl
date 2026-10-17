import { useEffect } from "react";
import { Building2, FileText, Mail, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { applyPageSeo } from "@/lib/pageSeo";
import { businessDetails } from "@/lib/businessDetails";

const companyFields = [
  { label: "Officiële bedrijfsnaam", value: businessDetails.legalName },
  { label: "Handelsnaam", value: businessDetails.tradeName },
  { label: "Vestigingsplaats", value: businessDetails.city },
  { label: "KvK-nummer", value: businessDetails.kvk },
  { label: "Btw-identificatienummer", value: businessDetails.vatId },
];

const Factuurgegevens = () => {
  useEffect(() => {
    applyPageSeo({
      title: "Factuurgegevens | Harkas IT",
      description:
        "Bedrijfsgegevens van Harkas IT voor leveranciers en zakelijke relaties, met KvK-nummer, btw-identificatienummer en e-mail voor facturen.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <section className="container px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10 md:mb-14">
              <p className="text-primary text-sm font-semibold uppercase tracking-[0.18em] mb-4">
                Voor leveranciers en zakelijke relaties
              </p>
              <h1 className="text-4xl md:text-5xl font-bold mb-5">
                Factuurgegevens <span className="text-gradient">Harkas IT</span>
              </h1>
              <p className="max-w-3xl text-lg text-muted-foreground leading-relaxed">
                Hieronder vindt u onze bedrijfsgegevens en de juiste e-mailadressen
                voor facturen en overige correspondentie.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8 items-start">
              <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-7">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Bedrijfsgegevens</h2>
                    <p className="text-sm text-muted-foreground">Gegevens voor uw administratie</p>
                  </div>
                </div>
                <dl className="divide-y divide-border/50">
                  {companyFields.map(({ label, value }) => (
                    <div key={label} className="grid gap-1 py-4 sm:grid-cols-[190px_1fr] sm:gap-5">
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="font-medium break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 rounded-xl border border-border/50 bg-secondary/30 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-primary" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Heeft u het volledige post- of factuuradres nodig? Vraag het op via
                      {" "}<a className="font-medium text-primary hover:underline break-all" href={"mailto:" + businessDetails.invoiceEmail}>{businessDetails.invoiceEmail}</a>.
                    </p>
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
                    <h2 className="text-xl font-bold">Facturen en betalingen</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Stuur uw factuur bij voorkeur als PDF naar onze administratie.
                    Voor facturen en betalingsvragen gebruiken wij uitsluitend:
                  </p>
                  <a href={"mailto:" + businessDetails.invoiceEmail}
                    className="inline-flex items-center gap-2 font-semibold text-primary hover:underline break-all">
                    <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {businessDetails.invoiceEmail}
                  </a>
                </section>

                <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
                  <h2 className="text-lg font-bold mb-3">Algemene correspondentie</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Voor vragen over diensten, offertes, ondersteuning en andere
                    zakelijke correspondentie kunt u contact opnemen via:
                  </p>
                  <a href={"mailto:" + businessDetails.contactEmail}
                    className="inline-flex items-center gap-2 font-semibold text-primary hover:underline break-all">
                    <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {businessDetails.contactEmail}
                  </a>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Factuurgegevens;

import { ArrowUpRight, ClipboardList, LayoutDashboard, ListChecks, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import './installation-guide.css';

type InstallationDemoGuideProps = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  {
    title: 'Dien een demoaanvraag in',
    description: <>Kies een dienst en klik op <strong>Vul voorbeeldgegevens in</strong>. Doorloop het formulier en sla uw aanvraag op.</>,
    icon: ClipboardList,
  },
  {
    title: 'Bekijk de aanvraag',
    description: <>Open het beheerdashboard in dezelfde browser. Uw aanvraag staat direct in het overzicht, klaar om te bekijken.</>,
    icon: LayoutDashboard,
  },
  {
    title: 'Test de opvolging',
    description: <>Open uw aanvraag, wijzig de status, voeg een notitie toe en kies een opvolgdatum. Zo ervaart u de hele route.</>,
    icon: ListChecks,
  },
];

export default function InstallationDemoGuide({ open, onClose }: InstallationDemoGuideProps) {
  if (!open) return null;

  return <section id="id-test-guide" className="id-test-guide" role="region" aria-label="Demo testen">
    <div className="id-test-guide-inner">
      <div className="id-test-guide-heading">
        <div>
          <p className="id-test-guide-eyebrow">ZELF ONTDEKKEN <span aria-hidden="true">/</span> ZONDER ACCOUNT</p>
          <h2>Probeer de digitale balie zelf.</h2>
          <p className="id-test-guide-intro">Van een eerste aanvraag tot de volgende actie. Ontdek in drie stappen hoe het werkt.</p>
        </div>
        <button type="button" className="id-test-guide-close" aria-label="Testuitleg sluiten" onClick={onClose}><X size={19} aria-hidden="true" /></button>
      </div>

      <ol className="id-test-guide-steps">
        {steps.map(({ title, description, icon: Icon }, index) => <li key={title}>
          <div className="id-test-guide-step-top"><span className="id-test-guide-number">0{index + 1}</span><Icon size={21} strokeWidth={1.6} aria-hidden="true" /></div>
          <h3>{title}</h3>
          <p>{description}</p>
        </li>)}
      </ol>

      <div className="id-test-guide-bottom">
        <div className="id-test-guide-actions">
          <Link className="id-test-guide-primary" to="/demo/installatiebedrijf/aanvragen" onClick={onClose}>Start de praktijktest <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link className="id-test-guide-secondary" to="/demo/installatiebedrijf/dashboard" onClick={onClose}>Direct naar dashboard <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </div>
        <p className="id-test-guide-disclaimer">Veld is een fictief bedrijf. Gebruik fictieve gegevens. Alles wordt alleen in deze browser opgeslagen. Er worden geen echte e-mails verstuurd of afspraken gemaakt.</p>
      </div>
    </div>
  </section>;
}

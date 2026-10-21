export type TicketStatus =
  | "nieuw"
  | "toegewezen"
  | "wacht_op_leverancier"
  | "in_behandeling"
  | "wacht_op_klant"
  | "opgelost"
  | "gesloten";
export type TicketPriority = "laag" | "normaal" | "hoog" | "spoed";

export type SupportTicket = {
  id: string;
  ticket_no: number;
  customer_id: string;
  created_by: string;
  requester_email: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  treatment_group: string;
  due_at: string | null;
  sla_label: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  sender_type: "klant" | "medewerker";
  body: string;
  is_internal: boolean;
  created_at: string;
};

export type PortalAccess = {
  id: string;
  customer_id: string;
  customer_label: string;
  email: string;
  created_at: string;
};

export const ticketCategories: Record<string, string> = {
  it_beheer: "IT-beheer",
  microsoft_365: "Microsoft 365",
  werkplek: "Werkplek / apparaat",
  security: "Cybersecurity",
  website: "Website / applicatie",
  facturatie: "Administratie & facturatie",
  overig: "Overig",
};

export const ticketPriorities: Record<TicketPriority, string> = {
  laag: "Laag",
  normaal: "Normaal",
  hoog: "Hoog",
  spoed: "Spoed",
};

export const ticketStatuses: Record<TicketStatus, string> = {
  nieuw: "Nieuw",
  toegewezen: "Toegewezen",
  wacht_op_leverancier: "Wacht op leverancier",
  in_behandeling: "In behandeling",
  wacht_op_klant: "Wacht op klant",
  opgelost: "Opgelost",
  gesloten: "Gesloten",
};

export const ticketNumber = (n: number) => "HIT-" + String(n).padStart(5, "0");

export const formatTicketDate = (s: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(s));

export const statusBadge: Record<TicketStatus, string> = {
  toegewezen: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  wacht_op_leverancier: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  nieuw: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_behandeling: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  wacht_op_klant: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  opgelost: "bg-green-500/10 text-green-700 dark:text-green-300",
  gesloten: "bg-muted text-muted-foreground",
};
export const treatmentGroups: Record<string, string> = {
  servicedesk: "Servicedesk",
  cloud: "Cloud & Microsoft 365",
  werkplek: "Werkplek & netwerk",
  security: "Cybersecurity",
  web: "Websites & applicaties",
  administratie: "Administratie",
};
export const isOpenTicket = (ticket: SupportTicket) =>
  !["opgelost", "gesloten"].includes(ticket.status);
export const isOverdue = (ticket: SupportTicket) =>
  isOpenTicket(ticket) &&
  !!ticket.due_at &&
  new Date(ticket.due_at).getTime() < Date.now();
export const replyTemplates = {
  ontvangst:
    "Bedankt voor je melding. We onderzoeken het probleem en houden je via dit ticket op de hoogte.",
  informatie:
    "Om je verder te helpen ontvangen we graag de exacte foutmelding, sinds wanneer het probleem speelt en welke stappen je al hebt geprobeerd. Deel geen wachtwoorden of andere vertrouwelijke gegevens.",
  leverancier:
    "We hebben het probleem voor verder onderzoek bij de leverancier neergelegd. Zodra er nieuwe informatie is, ontvang je een update.",
  oplossing:
    "De oplossing is uitgevoerd. Wil je controleren of alles weer naar behoren werkt en dit in het ticket bevestigen?",
};

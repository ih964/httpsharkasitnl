export type TicketStatus = "nieuw" | "in_behandeling" | "wacht_op_klant" | "opgelost" | "gesloten";
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
  laag: "Laag", normaal: "Normaal", hoog: "Hoog", spoed: "Spoed",
};

export const ticketStatuses: Record<TicketStatus, string> = {
  nieuw: "Nieuw",
  in_behandeling: "In behandeling",
  wacht_op_klant: "Wacht op klant",
  opgelost: "Opgelost",
  gesloten: "Gesloten",
};

export const ticketNumber = (n: number) => "HIT-" + String(n).padStart(5, "0");

export const formatTicketDate = (s: string) =>
  new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));

export const statusBadge: Record<TicketStatus, string> = {
  nieuw: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_behandeling: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  wacht_op_klant: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  opgelost: "bg-green-500/10 text-green-700 dark:text-green-300",
  gesloten: "bg-muted text-muted-foreground",
};
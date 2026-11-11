// Public labels only. Credentials and vault identifiers stay on the server.
export const accounts = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' } as const;
export type Account = keyof typeof accounts;
export const accountKeys = Object.keys(accounts) as Account[];
export const accountLabels: Record<Account, string> = { info: 'IT · Info', administratie: 'IT · Admin', support: 'IT · Support', webbuilder_info: 'Builder · Info', webbuilder_admin: 'Builder · Admin' };
export const isAccount = (value: string | null): value is Account => value !== null && Object.prototype.hasOwnProperty.call(accounts, value);

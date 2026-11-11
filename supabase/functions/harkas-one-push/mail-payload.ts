// Only fixed account addresses and UID metadata enter notifications. Never email content.
const ACCOUNTS = { info: 'info@harkasit.nl', administratie: 'administratie@harkasit.nl', support: 'support@harkasit.nl', webbuilder_info: 'info@harkaswebbuilder.nl', webbuilder_admin: 'admin@harkaswebbuilder.nl' } as const;
export function mailPayload(message: { account: string; uid: string | number; uid_validity: string }, tag: string) {
  if (!Object.prototype.hasOwnProperty.call(ACCOUNTS, message.account) || !/^[1-9]\d*$/.test(String(message.uid)) || !/^[1-9]\d*$/.test(message.uid_validity)) return null;
  const address = ACCOUNTS[message.account as keyof typeof ACCOUNTS];
  return { title: 'Harkas One · E-mail', body: `Nieuwe e-mail in ${address}. Open de app om het bericht te lezen.`, url: `/admin/one/mail?account=${message.account}&uid=${encodeURIComponent(message.uid)}&validity=${encodeURIComponent(message.uid_validity)}`, tag };
}

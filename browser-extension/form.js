// Serialized by chrome.scripting; keep self-contained. Top document only.
export function loginForm(expectedOrigin, credentials = null) {
  if (window.top !== window || location.origin !== expectedOrigin || location.protocol !== "https:") return false;
  const visible = e => e instanceof HTMLInputElement && !e.disabled && !e.readOnly &&
    e.getClientRects().length > 0 && getComputedStyle(e).visibility === "visible" && !e.closest("[inert]");
  const passwords = [...document.querySelectorAll('input[type="password"]')].filter(visible);
  if (passwords.length !== 1) return false;
  const pass = passwords[0], form = pass.form;
  if (!form || pass.autocomplete.includes("new-password") || pass.value) return false;
  try {
    if (new URL(form.action, location.href).origin !== expectedOrigin) return false;
    for (const button of form.querySelectorAll("[formaction]")) {
      if (new URL(button.getAttribute("formaction"), location.href).origin !== expectedOrigin) return false;
    }
  } catch { return false; }
  const candidates = [...form.elements].filter(e => visible(e) && ["text","email","tel"].includes(e.type) &&
    !e.autocomplete.includes("one-time-code"));
  const explicit = candidates.filter(e => e.autocomplete === "username" || e.type === "email" ||
    /user|email|login|account|gebruikersnaam/i.test(e.name + " " + e.id));
  const user = explicit.length === 1 ? explicit[0] : explicit.length === 0 && candidates.length === 1 ? candidates[0] : null;
  if (!credentials) return true;
  if (credentials.username && (!user || (user.value && user.value !== credentials.username))) return false;
  if (user && user.value && !credentials.username) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) return false;
  if (user && credentials.username) setter.call(user, credentials.username);
  setter.call(pass, credentials.password);
  for (const e of [user && credentials.username ? user : null, pass].filter(Boolean)) {
    e.dispatchEvent(new Event("input",{bubbles:true}));
    e.dispatchEvent(new Event("change",{bubbles:true}));
  }
  return true; // Never submit the form.
}

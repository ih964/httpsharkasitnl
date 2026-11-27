export const ADMIN = "https://www.harkasit.nl";
export const BRIDGE = "/admin/password-extension";
export const TTL = 120000;
export function originOf(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : "https://" + input);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    return u.origin;
  } catch { return null; }
}
export function isBridge(sender, request, now = Date.now()) {
  try {
    const u = new URL(sender.url);
    return !!request && now < request.expires && sender.tab?.id === request.bridgeTab &&
      sender.frameId === 0 && sender.origin === ADMIN && u.origin === ADMIN && u.pathname === BRIDGE;
  } catch { return false; }
}
export function canFill(request, response) {
  return request?.mode === "fill" && response.origin === request.origin &&
    typeof response.username === "string" && typeof response.password === "string" &&
    response.password.length > 0 && response.password.length <= 16384 && response.username.length <= 4096;
}
export function hostPattern(origin) {
  const u = new URL(origin);
  return u.protocol === "https:" && !u.port ? u.origin + "/*" : null;
}

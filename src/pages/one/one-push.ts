import { portalSupabase } from '@/integrations/supabase/client';

export function pushSupported() { return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
export async function pushRequest(body: Record<string, unknown>) {
  const { data, error } = await portalSupabase.functions.invoke('harkas-one-push', { body });
  if (error) {
    let message = 'Meldingen zijn niet bereikbaar. Controleer je verbinding en probeer opnieuw.';
    try { const result = await error.context?.json(); if (typeof result?.error === 'string') message = result.error; } catch { /* Do not expose raw provider errors. */ }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Geen bevestiging van de meldingenserver ontvangen.');
  return data;
}
export async function currentPush() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/admin/one/');
  return registration?.pushManager.getSubscription() || null;
}
export async function enablePush() {
  if (!pushSupported()) throw new Error('Deze browser ondersteunt push hier niet. Open Harkas One in Chrome of installeer de app eerst.');
  // Called directly from a click: permissions must never be requested on page load.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'Meldingen zijn geblokkeerd. Sta meldingen voor harkasit.nl toe in de site-instellingen van je browser.' : 'Je hebt nog geen toestemming gegeven. Meldingen blijven uit.');
  const cfg = await pushRequest({ action: 'status' });
  const registration = await navigator.serviceWorker.register('/admin/one/sw.js', { scope: '/admin/one/', updateViaCache: 'none' });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('De app is nog niet gereed. Vernieuw en probeer opnieuw.')), 12000); })]); } finally { clearTimeout(timeout); }
  const existing = await registration.pushManager.getSubscription();
  const base64 = String(cfg.publicKey).replace(/-/g, '+').replace(/_/g, '/');
  const key = Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0));
  const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  try { await pushRequest({ action: 'subscribe', subscription: subscription.toJSON() }); }
  catch (error) { if (!existing) await subscription.unsubscribe().catch(() => false); throw error; }
  return subscription;
}
export async function disablePush() {
  if (!pushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration('/admin/one/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  let serverStopped = false, browserStopped = false;
  try { await pushRequest({ action: 'unsubscribe', endpoint: subscription.endpoint }); serverStopped = true; } catch { /* Still stop this device when the server cannot be reached. */ }
  try { browserStopped = await subscription.unsubscribe(); } catch { /* Server deletion is independently sufficient to stop delivery. */ }
  if (!serverStopped && !browserStopped) throw new Error('Uitschakelen is niet bevestigd. Probeer opnieuw voordat je dit apparaat deelt.');
  try { for (const notification of await registration!.getNotifications()) notification.close(); } catch { /* Optional browser feature. */ }
}

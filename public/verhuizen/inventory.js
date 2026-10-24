import { ITEMS, volume, inventoryCount, customItemVolume, unknownItems, specialItems } from './model.js?v=2';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => Number(value).toLocaleString('nl-NL');
export const ROOMS = [...new Set(ITEMS.map(item => item.room))];

export function volumeLabel(request, confirmedVolume) {
  const amount = confirmedVolume ?? volume(request.items, request.customItems);
  return `${confirmedVolume == null && unknownItems(request).length ? 'Minimaal ' : ''}${number(amount)} m³`;
}

export function inventoryTags(request, assessed = request.quote?.extraM3 > 0) {
  const standard = ITEMS.filter(item => request.items[item.id]).map(item => `<span>${request.items[item.id]}× ${item.name}${item.special ? ' · bijzonder vervoer' : ''}</span>`);
  const custom = (request.customItems || []).map(item => `<span>${item.quantity}× ${esc(item.name)} · ${customItemVolume(item) ? `${number(item.length)} × ${number(item.width)} × ${number(item.height)} cm` : assessed ? 'inhoud door planner beoordeeld' : 'inhoud te beoordelen'}${item.special ? ' · zwaar/breekbaar' : ''}</span>`);
  return standard.concat(custom).join('');
}

export function inventoryWarning(request) {
  const unknown = unknownItems(request), special = specialItems(request);
  if (!unknown.length && !special.length) return '';
  return `<div class="inventory-warning">${unknown.length ? `<p><strong>${request.quote?.extraM3 > 0 ? 'Aanvullende inhoud vastgelegd in offerte: '+number(request.quote.extraM3)+' m³.' : 'Inhoud nog niet compleet.'}</strong> ${unknown.map(item => `${item.quantity}× ${esc(item.name)}`).join(', ')} ${unknown.length === 1 ? 'heeft' : 'hebben'} nog geen afmetingen. ${request.quote?.extraM3 > 0 ? 'De aanvullende inhoud is in de calculatie meegerekend.' : 'De planner vult de aanvullende inhoud in vóór de offerte.'}</p>` : ''}${special.length ? `<p><strong>Bijzonder vervoer:</strong> ${special.map(esc).join(', ')}. Bespreek gewicht, bescherming, toegang en benodigde inzet met de planner.</p>` : ''}</div>`;
}

export function catalogMarkup(draft, query, room, openRooms) {
  const needle = query.trim().toLocaleLowerCase('nl-NL');
  const found = ITEMS.filter(item => (room === 'alle' || item.room === room) && `${item.name} ${item.room}`.toLocaleLowerCase('nl-NL').includes(needle));
  if (!found.length) return '<div class="inventory-empty"><strong>Voorwerp niet gevonden?</strong><p>Voeg het hieronder zelf toe. Ook zonder afmetingen kun je verder.</p><button type="button" class="btn outline small" data-action="add-custom">Zelf een voorwerp toevoegen</button></div>';
  return ROOMS.map(name => {
    const items = found.filter(item => item.room === name);
    if (!items.length) return '';
    const selected = ITEMS.filter(item => item.room === name).reduce((sum, item) => sum + (draft.items[item.id] || 0), 0);
    return `<details class="inventory-room" data-room="${name}" ${needle || room !== 'alle' || openRooms.has(name) ? 'open' : ''}><summary><span>${name}</span><small>${selected ? `${selected} geselecteerd` : `${items.length} soorten`}</small></summary><div class="inventory-grid">${items.map(item => `<div class="inventory-item"><div><strong>${item.name}</strong><small>ca. ${number(item.m3)} m³ per stuk${item.special ? ' · bijzonder vervoer' : ''}</small></div><div class="counter"><button type="button" data-action="count" data-item="${item.id}" data-delta="-1" aria-label="Eén ${item.name.toLowerCase()} minder" ${!draft.items[item.id] ? 'disabled' : ''}>−</button><output aria-label="Aantal ${item.name}">${draft.items[item.id] || 0}</output><button type="button" data-action="count" data-item="${item.id}" data-delta="1" aria-label="Eén ${item.name.toLowerCase()} meer" ${draft.items[item.id] >= 100 ? 'disabled' : ''}>+</button></div></div>`).join('')}</div></details>`;
  }).join('');
}

export function renderInventory(draft, query, room, openRooms) {
  const count = inventoryCount(draft);
  return `<div class="form-title"><span class="eyebrow">STAP 02 / 04</span><h2>Wat gaat er allemaal mee?</h2><p>Kies uit ${ITEMS.length} veelvoorkomende voorwerpen, of voeg zelf iets toe. Gebruik verhuisdozen voor ingepakte spullen. De genoemde inhoud is een schatting; tel losse matrassen alleen apart als ze niet al bij een bed horen.</p></div><div class="inventory-toolbar"><label class="field"><span>Zoek een voorwerp</span><input id="inventory-search" type="search" placeholder="Bijv. koelkast, piano of tuinstoel" value="${esc(query)}"></label><label class="field"><span>Ruimte</span><select id="inventory-room"><option value="alle">Alle ruimtes</option>${ROOMS.map(name => `<option ${room === name ? 'selected' : ''}>${name}</option>`).join('')}</select></label></div><p class="inventory-count" role="status">${count} ${count === 1 ? 'voorwerp' : 'voorwerpen'} geselecteerd · je selectie blijft bewaard tijdens het zoeken</p><div id="inventory-catalog">${catalogMarkup(draft, query, room, openRooms)}</div><section class="custom-inventory"><div class="section-heading"><div><h3>Staat jouw voorwerp er niet bij?</h3><p class="helper">Voeg bijvoorbeeld een aquarium, drumstel of maatwerkkast toe.</p></div><button type="button" class="btn outline small" data-action="add-custom">+ Zelf een voorwerp toevoegen</button></div>${(draft.customItems || []).length ? `<ul class="custom-items">${draft.customItems.map(item => `<li><div><strong>${item.quantity}× ${esc(item.name)}</strong><small>${customItemVolume(item) ? `${number(item.length)} × ${number(item.width)} × ${number(item.height)} cm · ca. ${number(customItemVolume(item))} m³/stuk` : 'Geen afmetingen · planner beoordeelt inhoud'}${item.special ? ' · zwaar of breekbaar' : ''}</small></div><div class="custom-actions"><button type="button" data-action="edit-custom" data-id="${esc(item.id)}" aria-label="${esc(item.name)} bewerken">Bewerken</button><button type="button" data-action="remove-custom" data-id="${esc(item.id)}" aria-label="${esc(item.name)} verwijderen">Verwijderen</button></div></li>`).join('')}</ul>` : ''}</section><div class="volume-note"><p><strong>${volumeLabel(draft)} geschatte inboedel</strong><br>De planner controleert de inhoud en benodigde inzet. Afmetingen zijn buitenmaten in de staat waarin het voorwerp wordt vervoerd.</p></div>${inventoryWarning(draft)}`;
}

export function customItemDialog(item = {}) {
  return `<form id="custom-item-form" data-id="${esc(item.id || '')}"><p class="eyebrow">JOUW INBOEDEL</p><h2 id="custom-title">${item.id ? 'Voorwerp bewerken' : 'Zelf een voorwerp toevoegen'}</h2><p class="helper">Staat iets niet in de lijst? Omschrijf het hier. Afmetingen zijn optioneel; zonder afmetingen beoordeelt de planner de inhoud.</p><label class="field"><span>Voorwerp *</span><input name="itemName" required maxlength="80" placeholder="Bijv. aquarium met onderkast" value="${esc(item.name)}" autofocus></label><label class="field"><span>Aantal *</span><input name="quantity" type="number" min="1" max="100" step="1" required value="${esc(item.quantity || 1)}"></label><fieldset class="dimension-fields"><legend>Afmetingen per stuk in cm (optioneel)</legend><div class="dimensions-grid">${[['length','Lengte'],['width','Breedte'],['height','Hoogte']].map(([key, label]) => `<label class="field"><span>${label} (cm)</span><input name="${key}" type="number" min="1" max="2000" step="0.1" placeholder="—" value="${esc(item[key] ?? '')}"></label>`).join('')}</div></fieldset><p class="helper">Meet de buitenmaten zoals het meegaat: bijvoorbeeld gedemonteerd of opgevouwen. Vul alle drie de maten in, of laat ze leeg.</p><label class="check-line"><input type="checkbox" name="special" ${item.special ? 'checked' : ''}> Dit voorwerp is zwaar, breekbaar of heeft speciale aandacht nodig.</label><p id="custom-error" class="inline-error" role="alert" hidden></p><div class="detail-actions"><button type="button" class="btn outline" data-action="close-custom">Annuleren</button><button type="submit" class="btn primary">Voorwerp bewaren</button></div></form>`;
}

const LEVELS = ['Bronregels', 'Hoofdstuk', 'Artikel', 'Artikelonderdeel', 'Financieel instrument', 'Detail of regeling'];
const CHAPTER_COLORS = {
  A: 76, B: 255, C: 245, F: 150, H: 215,
  I: 295, IIA: 280, IIB: 275, III: 260, IV: 225,
  IX: 245, IXA: 240, IXB: 250, J: 205, K: 128,
  L: 92, M: 170, V: 220, VI: 285, VII: 265,
  VIII: 310, X: 128, XII: 76, XIII: 95, XIV: 150,
  XV: 25, XVI: 195, XVII: 212, XX: 280, XXII: 55, XXIII: 170,
};
const svg = document.querySelector('#chart');
const tooltip = document.querySelector('#tooltip');
const wrap = document.querySelector('.chart-wrap');
const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });
let dataset;
let roots = {};
let year = '2026';
let phase = 'SBS';
let focus;
const currentKey = () => `${year}:${phase}`;

function formatAmount(thousands) {
  const amount = thousands * 1000;
  if (Math.abs(amount) >= 1e9) return `€ ${compact.format(amount / 1e9)} mld`;
  if (Math.abs(amount) >= 1e6) return `€ ${compact.format(amount / 1e6)} mln`;
  return euro.format(amount);
}

function node(name, code, depth, parent) {
  return { name, code, depth, parent, children: new Map(), net: 0, area: 0 };
}

function buildTree(records) {
  const root = node('Uitgaven in de bron', '', 0, null);
  for (const record of records) {
    let current = root;
    for (let depth = 1; depth <= 5; depth++) {
      const code = String(record[(depth - 1) * 2]);
      const name = record[(depth - 1) * 2 + 1] || 'Niet nader gespecificeerd';
      const key = depth === 1 ? code : `${code}\u0000${name}`;
      if (!current.children.has(key)) current.children.set(key, node(name, code, depth, current));
      current = current.children.get(key);
      current.net += record[10];
      current.area += Math.max(record[10], 0);
    }
    root.net += record[10];
    root.area += Math.max(record[10], 0);
  }
  return root;
}

function childrenOf(current) {
  return [...current.children.values()].sort((a, b) => b.area - a.area || a.name.localeCompare(b.name, 'nl'));
}

function setText(id, value) { document.querySelector(id).textContent = value; }

function pathFor(inner, outer, start, end) {
  const center = 410;
  const point = (radius, angle) => [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
  const [x1, y1] = point(outer, start);
  const [x2, y2] = point(outer, end);
  const [x3, y3] = point(inner, end);
  const [x4, y4] = point(inner, start);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
}

function colorFor(current, ring) {
  let top = current;
  while (top.parent && top.parent.depth > 0) top = top.parent;
  const hue = CHAPTER_COLORS[top.code] ?? 35;
  let article = current;
  while (article.parent && article.depth > 2) article = article.parent;
  const variation = article.depth === 2
    ? [...article.code].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 5 - 2
    : 0;
  const lightness = 62 + Math.min(ring - 1, 3) * 5 + variation;
  const chroma = 0.14 - Math.min(ring - 1, 3) * 0.012;
  return `oklch(${lightness}% ${chroma} ${hue + variation * 3})`;
}

function showTooltip(event, current) {
  tooltip.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = current.name;
  const value = document.createElement('span');
  value.textContent = formatAmount(current.net);
  const label = document.createElement('span');
  label.textContent = `${LEVELS[current.depth]} · ${percent.format(current.area / focus.area || 0)} van de positieve bedragen in deze weergave`;
  tooltip.append(title, value, label);
  const bounds = wrap.getBoundingClientRect();
  tooltip.style.left = `${Math.min(event.clientX - bounds.left + 16, bounds.width - 260)}px`;
  tooltip.style.top = `${Math.max(0, event.clientY - bounds.top - 8)}px`;
  tooltip.hidden = false;
}

function addSector(current, start, end, ring) {
  if (ring > 4 || end - start < 0.003 || current.area <= 0) return;
  const inner = 112 + (ring - 1) * 65;
  const outer = inner + 63;
  const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  element.setAttribute('d', pathFor(inner, outer, start + 0.001, end - 0.001));
  element.setAttribute('class', 'sector');
  element.setAttribute('fill', colorFor(current, ring));
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', '0');
  element.setAttribute('aria-label', `${LEVELS[current.depth]} ${current.name}, ${formatAmount(current.net)}`);
  element.addEventListener('click', () => select(current));
  element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(current, true); } });
  element.addEventListener('pointermove', event => showTooltip(event, current));
  element.addEventListener('pointerleave', () => { tooltip.hidden = true; });
  svg.append(element);
  if (ring === 4) return;
  let angle = start;
  const children = childrenOf(current);
  for (const child of children) {
    const next = angle + (end - start) * child.area / current.area;
    if (next > angle) addSector(child, angle, next, ring + 1);
    angle = next;
  }
}

function renderChart() {
  svg.replaceChildren();
  const guides = [112, 177, 242, 307, 372];
  for (const radius of guides) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '410'); circle.setAttribute('cy', '410'); circle.setAttribute('r', radius);
    circle.setAttribute('class', 'ring-guide'); svg.append(circle);
  }
  let angle = -Math.PI / 2;
  const children = childrenOf(focus);
  for (const child of children) {
    const next = angle + 2 * Math.PI * child.area / focus.area;
    if (next > angle) addSector(child, angle, next, 1);
    angle = next;
  }
  const center = document.querySelector('#chart-center');
  center.replaceChildren();
  center.disabled = !focus.parent;
  center.setAttribute('aria-label', focus.parent ? `Een niveau omhoog naar ${focus.parent.name}` : 'Alle uitgaven, hoogste niveau');
  const overline = document.createElement('span'); overline.className = 'center-overline'; overline.textContent = focus.parent ? '↑ EEN NIVEAU TERUG' : phase === 'JV' ? `GEREALISEERD ${year}` : phase === 'SBS' ? `BIJGESTELD ${year}` : `BEGROOT ${year}`;
  const total = document.createElement('span'); total.className = 'center-total'; total.textContent = formatAmount(focus.net);
  const caption = document.createElement('span'); caption.className = 'center-caption'; caption.textContent = focus.name;
  center.append(overline, total, caption);
}

function renderBreadcrumbs() {
  const nav = document.querySelector('#breadcrumbs');
  nav.replaceChildren();
  const ancestors = [];
  for (let current = focus; current; current = current.parent) ancestors.unshift(current);
  ancestors.forEach((current, index) => {
    if (index) { const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '/'; nav.append(sep); }
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = current.depth === 0 ? 'Alle bronregels' : current.name;
    button.addEventListener('click', event => select(current, event.detail === 0)); nav.append(button);
  });
}

function renderDetail() {
  setText('#depth-label', LEVELS[focus.depth].toUpperCase());
  setText('#selection-name', focus.name);
  setText('#selection-context', focus.depth ? `${focus.code ? focus.code + ' · ' : ''}${focus.parent.name}` : 'Som van beschikbare bronregels, geen officieel uitgaventotaal');
  setText('#selection-value', formatAmount(focus.net));
  const measure = phase === 'JV' ? `Gerealiseerd in ${year}` : phase === 'SBS' ? `Septemberstand ${year}` : `Ontwerpbegroting voor ${year}`;
  setText('#measure-label', focus.depth ? measure : `${measure} · som bronregels`);
  const children = childrenOf(focus);
  setText('#child-count', children.length ? `${children.length} onderdelen` : 'Laagste bronregel');
  setText('#share-value', `${percent.format(focus.area / roots[currentKey()].area)} van positieve bedragen`);
  const list = document.querySelector('#children'); list.replaceChildren();
  for (const child of children) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'child-row';
    const title = document.createElement('span');
    const name = document.createElement('span'); name.className = 'child-name';
    const swatch = document.createElement('span'); swatch.className = 'child-swatch'; swatch.style.background = colorFor(child, 1); swatch.setAttribute('aria-hidden', 'true');
    name.append(swatch, document.createTextNode(child.name));
    const sub = document.createElement('span'); sub.className = 'child-sub'; sub.textContent = `${LEVELS[child.depth]}${child.code ? ` ${child.code}` : ''}`;
    const track = document.createElement('span'); track.className = 'child-track';
    const fill = document.createElement('span'); fill.style.width = `${focus.area ? Math.max(0, Math.min(100, child.area / focus.area * 100)) : 0}%`; fill.style.background = colorFor(child, 1); track.append(fill);
    title.append(name, sub, track);
    const amount = document.createElement('span'); amount.className = 'child-amount'; amount.textContent = formatAmount(child.net);
    button.append(title, amount); button.addEventListener('click', event => select(child, event.detail === 0)); list.append(button);
  }
  const meta = dataset.years[year][phase].metadata;
  setText('#phase-meta', `${meta.rows} bronregels · ${meta.chapters} hoofdstukken`);
  const phaseName = phase === 'JV' ? 'het jaarverslag' : phase === 'SBS' ? 'de septemberstand' : 'de ontwerpbegroting';
  const scope = year === '2025' ? '' : ' Inclusief premiegefinancierde uitgaven.';
  setText('#coverage-note', `${meta.rows} uitgavenregels uit ${phaseName} ${year}, waarvan ${meta.negative_rows} negatieve correcties.${scope} Bedragen in de bron zijn duizenden euro's.`);
  document.querySelector('#phase-source').href = meta.url;
}

function select(current, restoreFocus = false) {
  focus = current;
  tooltip.hidden = true;
  renderBreadcrumbs(); renderChart(); renderDetail();
  if (restoreFocus) document.querySelector('#selection-name').focus();
}

function setPhase(next) {
  if (!dataset.years[year][next]) return;
  phase = next;
  document.querySelectorAll('[data-phase]').forEach(button => {
    button.hidden = !dataset.years[year][button.dataset.phase];
    const active = button.dataset.phase === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  select(roots[currentKey()]);
}

function renderYearStatus() {
  const status = document.querySelector('#year-status');
  status.replaceChildren();
  if (year === '2025') {
    status.textContent = 'Afgesloten jaar: ontwerpbegroting en jaarverslag zijn beschikbaar.';
  } else if (year === '2026') {
    const partial = dataset.partial_realization_2026;
    status.append(`Tussentijdse realisatie t/m ${partial.through}: ${formatAmount(partial.million_eur * 1000)}. Andere afbakening dan de cirkel: alleen begrotingsgefinancierde uitgaven, zonder premies. `);
    const link = document.createElement('a'); link.href = partial.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Bron ↗'; status.append(link);
  } else {
    status.textContent = 'Vooruitblik: ontwerpbegroting 2027. Er is nog geen uitvoering of jaarverslag.';
  }
}

function setYear(next) {
  if (!dataset.years[next]) return;
  year = next;
  document.querySelectorAll('[data-year]').forEach(button => {
    const active = button.dataset.year === next;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  setText('#intro-period', `NEDERLAND · RIJKSBEGROTING · ${year}`);
  document.title = `De gloeiende plaat: Rijksuitgaven ${year}`;
  renderYearStatus();
  setPhase(next === '2025' ? 'JV' : next === '2026' ? 'SBS' : 'OWB');
}

document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => setPhase(button.dataset.phase)));
document.querySelectorAll('[data-year]').forEach(button => button.addEventListener('click', () => setYear(button.dataset.year)));
document.querySelector('#chart-center').addEventListener('click', event => {
  if (focus?.parent) select(focus.parent, event.detail === 0 && !focus.parent.parent);
});
fetch('data/budget.json').then(response => {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}).then(data => {
  dataset = data;
  for (const [budgetYear, phases] of Object.entries(data.years)) {
    for (const [budgetPhase, entry] of Object.entries(phases)) {
      const key = `${budgetYear}:${budgetPhase}`;
      roots[key] = buildTree(entry.records);
      if (roots[key].net !== entry.metadata.sum_thousand_eur) throw new Error(`Total mismatch: ${key}`);
    }
  }
  setYear('2026');
}).catch(error => {
  setText('#selection-name', 'Data laden mislukt');
  setText('#selection-context', error.message);
});

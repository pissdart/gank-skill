import { SITE, OWNER, START_BID, STEP, TARGET, END_AT, SLOTS, slotById } from './config.js';
import { createBodyViewer } from './body.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;
const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const safeOrigin = (url) => { try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : ''; } catch { return ''; } };
const logoUrl = (domain) => `/api/logo?domain=${encodeURIComponent(domain)}`;
const ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const spots = SLOTS.map((s) => ({ ...s, currentBid: 0, bids: 0, leader: '', website: '', domain: '', custom: '', history: [] }));
const nextBid = (s) => (s.currentBid ? s.currentBid + STEP : START_BID);
let endsAt = new Date(END_AT);
const closed = () => Date.now() >= endsAt.getTime();

/* ---------------------------------------------------------- static copy --- */
$$('[data-step]').forEach((el) => (el.textContent = money(STEP)));
$$('[data-start]').forEach((el) => (el.textContent = money(START_BID)));
$$('[data-target]').forEach((el) => (el.textContent = money(TARGET)));
$$('[data-game]').forEach((el) => (el.textContent = OWNER.game));
const ownerLink = $('[data-owner-link]');
ownerLink.textContent = OWNER.handle;
ownerLink.href = OWNER.link;
$('[data-hero-copy]').textContent = `Ten tattoo placements across my back and my ass. Every slot opens at ${money(START_BID)} USD and each new bid raises it by ${money(STEP)}. Winners get inked, permanently. The money finishes ${OWNER.game}.`;

/* ---------------------------------------------------------------- rows --- */
const historyHTML = (s) => s.history.length
  ? `<ol>${s.history.map((h) => {
      const origin = safeOrigin(h.website);
      const logo = h.domain ? `<span class="history-logo" data-history-logo="${esc(h.domain)}" aria-hidden="true"></span>` : '';
      const name = origin ? `<a href="${esc(origin)}" target="_blank" rel="noopener nofollow sponsored">${esc(h.company)}</a>` : `<span>${esc(h.company)}</span>`;
      const custom = h.custom ? `<small><em>“${esc(h.custom)}”</em></small>` : `<small>${esc(h.domain)}</small>`;
      return `<li>${logo}<div>${name}${custom}</div><strong>${money(h.amount)}</strong></li>`;
    }).join('')}</ol>`
  : `<div class="history-empty"><span>No bids on this placement yet.</span><b>Opens at ${money(START_BID)}</b></div>`;

$('[data-auction-list]').innerHTML = spots.map((s) => `
  <article class="auction-row" data-card-for="${s.id}">
    <div class="row-main">
      <figure class="placement-image" data-focus="${s.id}" title="Show on the model"><img alt="${esc(s.name)} placement on the 3D model" data-thumb-for="${s.id}"></figure>
      <div class="area-name"><span class="area-number">${String(s.id).padStart(2, '0')}</span><h3>${esc(s.name)}</h3><p>${esc(s.note)} <b>${esc(s.size)}</b></p></div>
      <div class="area-holder">
        <span class="brand-mark" data-brand-mark-for="${s.id}"><span>—</span></span>
        <div><small>HELD BY</small><a data-leader-for="${s.id}">No bids yet</a></div>
      </div>
      <div class="area-price"><small>CURRENT BID</small><strong data-current-for="${s.id}">${money(0)}</strong><span><b data-bids-for="${s.id}">0</b> bids</span></div>
      <button type="button" class="row-bid" data-open-bid="${s.id}"><span>PLACE BID</span><b data-next-for="${s.id}">${money(START_BID)}</b>${ARROW}</button>
    </div>
    <div class="row-history">
      <header><span>BID HISTORY</span><span data-ledger-count-for="${s.id}">0 ENTRIES</span></header>
      <div data-history-for="${s.id}">${historyHTML(s)}</div>
    </div>
  </article>`).join('');

function hydrateLogos(root) {
  $$('[data-history-logo]', root).forEach((el) => {
    const img = new Image();
    img.alt = '';
    img.src = logoUrl(el.dataset.historyLogo);
    img.addEventListener('load', () => { el.classList.add('has-logo'); el.closest('li')?.classList.add('with-logo'); }, { once: true });
    img.addEventListener('error', () => el.remove(), { once: true });
    el.append(img);
  });
}

function renderSpot(s) {
  $(`[data-current-for="${s.id}"]`).textContent = money(s.currentBid);
  $(`[data-next-for="${s.id}"]`).textContent = money(nextBid(s));
  $(`[data-bids-for="${s.id}"]`).textContent = s.bids;
  const btn = $(`[data-open-bid="${s.id}"]`);
  btn.disabled = closed();
  btn.querySelector('span').textContent = closed() ? 'CLOSED' : s.currentBid ? 'OUTBID' : 'PLACE BID';
  const leader = $(`[data-leader-for="${s.id}"]`);
  leader.textContent = s.leader || 'No bids yet';
  if (s.website && safeOrigin(s.website)) { leader.href = s.website; leader.target = '_blank'; leader.rel = 'noopener nofollow sponsored'; }
  else { leader.removeAttribute('href'); leader.removeAttribute('target'); leader.removeAttribute('rel'); }
  const mark = $(`[data-brand-mark-for="${s.id}"]`);
  const initials = s.leader ? s.leader.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() : '—';
  mark.querySelector('span').textContent = initials;
  if (mark.dataset.domain !== (s.domain || '')) {
    mark.querySelector('img')?.remove();
    mark.classList.remove('has-logo');
    mark.dataset.domain = s.domain || '';
    if (s.domain) {
      const img = new Image();
      img.alt = '';
      img.src = logoUrl(s.domain);
      img.addEventListener('load', () => mark.classList.add('has-logo'), { once: true });
      img.addEventListener('error', () => img.remove(), { once: true });
      mark.append(img);
    }
  }
  $(`[data-ledger-count-for="${s.id}"]`).textContent = `${s.history.length} ${s.history.length === 1 ? 'ENTRY' : 'ENTRIES'}`;
  const hist = $(`[data-history-for="${s.id}"]`);
  hist.innerHTML = historyHTML(s);
  hydrateLogos(hist);
  viewer?.setSlotState(s.id, s.leader ? { company: s.leader, domain: s.domain, custom: s.custom, priceLabel: money(s.currentBid) } : null);
}

function renderFunding() {
  const raised = spots.reduce((sum, s) => sum + s.currentBid, 0);
  const pct = Math.min(100, Math.round((raised / TARGET) * 100));
  $('[data-raised]').textContent = money(raised);
  $('[data-funded]').textContent = `${pct}% funded`;
  const bar = $('.progress');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.querySelector('span').style.width = `${pct}%`;
}

async function refresh() {
  try {
    const res = await fetch('/api/bids', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Auction unavailable');
    const data = await res.json();
    if (data.endsAt) endsAt = new Date(data.endsAt);
    for (const remote of data.spots || []) {
      const s = spots.find((x) => x.id === remote.id);
      if (!s) continue;
      Object.assign(s, {
        currentBid: remote.currentBid || 0, bids: remote.bids || 0, leader: remote.leader || '', website: remote.website || '',
        domain: remote.domain || '', custom: remote.custom || '', history: Array.isArray(remote.history) ? remote.history : [],
      });
      renderSpot(s);
    }
    renderFunding();
  } catch {
    /* keep whatever we have; the next poll will try again */
  }
}

/* ------------------------------------------------------------ countdown --- */
function tickCountdown() {
  const ms = Math.max(0, endsAt.getTime() - Date.now());
  const t = Math.floor(ms / 1000);
  const p = (n) => String(n).padStart(2, '0');
  $('[data-countdown]').textContent = ms
    ? `${p(Math.floor(t / 86400))}d ${p(Math.floor((t % 86400) / 3600))}h ${p(Math.floor((t % 3600) / 60))}m ${p(t % 60)}s`
    : 'AUCTION CLOSED';
  if (!ms) $$('.row-bid').forEach((b) => { b.disabled = true; b.querySelector('span').textContent = 'CLOSED'; });
}

/* ---------------------------------------------------------------- modal --- */
const modal = $('#bid-modal');
const form = $('#bid-form');
const status = $('#form-status');
let current = spots[0];
let lastFocus = null;

function openBid(id) {
  if (closed()) return;
  current = spots.find((s) => s.id === Number(id)) || spots[0];
  const amount = nextBid(current);
  $('#modal-title').textContent = current.name;
  $('#modal-sub').textContent = current.currentBid
    ? `Current bid ${money(current.currentBid)}. Each new bid raises it by ${money(STEP)} USD.`
    : `No bids yet. This placement opens at ${money(START_BID)} USD.`;
  $('#bid-amount').value = amount.toLocaleString('en-US');
  $('#bid-increment').textContent = current.currentBid ? `CURRENT ${money(current.currentBid)} · +${money(STEP)}` : 'OPENING BID';
  $('#bid-consent').checked = false;
  status.textContent = '';
  const custom = $('#custom-option');
  custom.hidden = !current.customField;
  $('#custom-option-label').textContent = current.customField || 'Customization';
  const customInput = $('#bid-customization');
  customInput.placeholder = current.customPlaceholder || 'Your choice';
  customInput.maxLength = current.customMax || 40;
  customInput.value = '';
  $$('.text-input', form).forEach((i) => i.classList.remove('is-invalid'));
  lastFocus = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  setTimeout(() => $('#bid-email').focus(), 150);
}

function closeBid() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  lastFocus?.focus?.();
}

$$('[data-close]', modal).forEach((el) => el.addEventListener('click', closeBid));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeBid(); });

let toastTimer;
function toast(msg) {
  const el = $('.toast');
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3500);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#bid-email'), company = $('#bid-company'), website = $('#bid-website'), custom = $('#bid-customization');
  $$('.text-input', form).forEach((i) => i.classList.remove('is-invalid'));
  const fail = (input, msg) => { input.classList.add('is-invalid'); input.focus(); status.textContent = msg; };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return fail(email, 'Enter a valid work email.');
  if (company.value.trim().length < 2) return fail(company, 'Enter your company or brand name.');
  let site;
  try {
    site = new URL(/^https?:\/\//i.test(website.value.trim()) ? website.value.trim() : `https://${website.value.trim()}`);
    if (!['https:', 'http:'].includes(site.protocol) || !site.hostname.includes('.')) throw new Error();
  } catch { return fail(website, 'Enter a valid company website.'); }
  if (current.customField && custom.value.trim().length < 2) return fail(custom, 'Tell me what goes on the skin.');
  if (!$('#bid-consent').checked) { status.textContent = 'Confirm that this is a genuine sponsorship bid.'; return; }

  const btn = $('#submit-bid');
  btn.disabled = true;
  status.textContent = '';
  try {
    const res = await fetch('/api/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        spotId: current.id, amount: nextBid(current), email: email.value.trim(), company: company.value.trim(),
        website: site.toString(), custom: current.customField ? custom.value.trim() : '', fax: $('#fax-number').value,
        consent: true, consentVersion: '2026-09-05',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not save your bid.');
    closeBid();
    await refresh();
    toast(`Bid confirmed · ${data.reference}`);
    $(`[data-card-for="${current.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    status.textContent = err.message;
    await refresh();
    $('#bid-amount').value = nextBid(current).toLocaleString('en-US');
    $('#bid-increment').textContent = current.currentBid ? `CURRENT ${money(current.currentBid)} · +${money(STEP)}` : 'OPENING BID';
  } finally {
    btn.disabled = false;
  }
});

/* ----------------------------------------------------------- 3D viewer --- */
let viewer = null;
const hotRow = (id, on) => $(`[data-card-for="${id}"]`)?.classList.toggle('is-hot', on);

$$('[data-open-bid]').forEach((b) => b.addEventListener('click', () => openBid(b.dataset.openBid)));
$$('.auction-row').forEach((row) => {
  const id = row.dataset.cardFor;
  row.addEventListener('pointerenter', () => viewer?.highlight(id, true));
  row.addEventListener('pointerleave', () => viewer?.highlight(id, false));
});
$$('[data-focus]').forEach((fig) => fig.addEventListener('click', () => {
  viewer?.focus(fig.dataset.focus);
  viewer?.highlight(fig.dataset.focus, true);
  $('#body-viewer').scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => viewer?.highlight(fig.dataset.focus, false), 2600);
}));

createBodyViewer({
  container: $('#body-viewer'),
  slots: SLOTS,
  onSelect: (id) => openBid(id),
  onHover: (id, on) => hotRow(id, on),
}).then((v) => {
  viewer = v;
  for (const s of spots) {
    $(`[data-thumb-for="${s.id}"]`).src = v.thumbnail(s.id);
    if (s.leader) v.setSlotState(s.id, { company: s.leader, domain: s.domain, custom: s.custom, priceLabel: money(s.currentBid) });
  }
}).catch((err) => {
  console.error('viewer failed', err);
  const c = $('#body-viewer');
  c.classList.remove('is-loading');
  c.innerHTML = '<p class="body-fallback">Your browser could not render the 3D model. The placements below still work.</p>';
});

/* ----------------------------------------------------------------- boot --- */
document.title = SITE.title;
tickCountdown();
setInterval(tickCountdown, 1000);
refresh();
setInterval(refresh, 10000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

/* ILĀ SITE B: one small script, loaded with defer. No network requests, no analytics, no cookies.
   Storage: localStorage only ("ila.cart.v1", "ila.lastOrder.v1"). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ROOT = document.documentElement.dataset.root || '';
  const CAT = (window.ILA_CATALOG && window.ILA_CATALOG.products) || {};
  const money = n => 'EGP ' + Number(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'ila.cart.v1', ORDER = 'ila.lastOrder.v1';
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable: bag lives for this page only */ mem[k] = v; } },
  };
  const mem = {};
  let cart = store.get(KEY, mem[KEY] || []);
  if (!Array.isArray(cart)) cart = [];
  const saveCart = () => { store.set(KEY, cart); renderAll(); };

  const toastEl = () => $('#toast');
  let toastT;
  function toast(msg) {
    const t = toastEl(); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- cart model ---------- */
  const lines = () => cart.map((l, i) => ({ ...l, i, p: CAT[l.s] })).filter(l => l.p);
  const count = () => cart.reduce((a, l) => a + l.q, 0);
  const subtotal = () => lines().reduce((a, l) => a + l.p.p * l.q, 0);
  function add(slug, size) {
    const l = cart.find(x => x.s === slug && x.z === size);
    if (l) l.q = Math.min(9, l.q + 1); else cart.push({ s: slug, z: size, q: 1 });
    saveCart();
  }
  function change(i, d) { const l = cart[i]; if (!l) return; l.q = Math.min(9, l.q + d); if (l.q <= 0) cart.splice(i, 1); saveCart(); }
  function removeAt(i) { cart.splice(i, 1); saveCart(); }

  function lineHTML(l, i, tag, editable) {
    const q = editable
      ? `<div class="qty" role="group" aria-label="Quantity for ${esc(l.p.n)}"><button type="button" data-act="dec" data-i="${i}" aria-label="Decrease quantity">&minus;</button><output aria-live="polite">${l.q}</output><button type="button" data-act="inc" data-i="${i}" aria-label="Increase quantity">+</button></div>`
      : `<span class="muted">Qty ${l.q}</span>`;
    return `<li class="line"><img src="${ROOT}${l.p.i}" width="84" height="112" alt="${esc(l.p.a)}" loading="lazy" decoding="async">
      <div><${tag}><a href="${ROOT}${l.p.u}">${esc(l.p.n)}</a></${tag}><p class="meta">Size ${esc(l.z)}</p>
      <p class="meta">${money(l.p.p)} <span class="proto-tag">Prototype price</span></p>
      <div class="line-row">${q}${editable ? `<button type="button" class="remove" data-act="rm" data-i="${i}" aria-label="Remove ${esc(l.p.n)}, size ${esc(l.z)}">Remove</button>` : `<span>${money(l.p.p * l.q)}</span>`}</div></div></li>`;
  }
  const totalsHTML = () => `<div class="totals"><div><span>Subtotal</span><span>${money(subtotal())}</span></div><div><span>Delivery</span><span>To be confirmed</span></div><div class="grand"><span>Total</span><span>${money(subtotal())} + delivery</span></div></div>`;
  const emptyHTML = `<div class="empty-cart"><p>Your bag is empty.</p><p><a class="btn" href="${ROOT}shop.html">Shop the collection</a></p></div>`;

  function renderAll() {
    const n = count();
    $$('.bag-link').forEach(a => {
      a.setAttribute('aria-label', n ? `Bag, ${n} ${n === 1 ? 'item' : 'items'}` : 'Bag');
      const c = $('.bag-count', a); if (c) c.textContent = n ? String(n) : '';
    });
    const L = lines();
    const db = $('#cart-drawer-body'), df = $('#cart-drawer-foot');
    if (db) {
      db.innerHTML = L.length ? `<ul>${L.map(l => lineHTML(l, l.i, 'h3', true)).join('')}</ul>` : emptyHTML;
      df.innerHTML = L.length ? `${totalsHTML()}<p class="field-note">Delivery cost and time are to be confirmed. Prices are prototype placeholders.</p><div class="buy-actions"><a class="btn btn-block" href="${ROOT}checkout.html">Checkout as guest</a><a class="btn btn-ghost btn-block" href="${ROOT}cart.html">View bag</a></div>` : '';
      df.hidden = !L.length;
    }
    const cp = $('#cart-page');
    if (cp) {
      cp.innerHTML = L.length
        ? `<div class="checkout" style="padding-block:8px 48px"><div><ul>${L.map(l => lineHTML(l, l.i, 'h2', true)).join('')}</ul></div><aside><div class="summary"><h2>Summary</h2>${totalsHTML()}<p class="field-note">Delivery cost and time are to be confirmed.</p><div class="buy-actions"><a class="btn btn-block" href="${ROOT}checkout.html">Checkout as guest</a><a class="btn btn-ghost btn-block" href="${ROOT}shop.html">Continue shopping</a></div></div></aside></div>`
        : emptyHTML;
    }
    const cs = $('#checkout-summary');
    if (cs) {
      cs.innerHTML = `<h2>Order summary</h2>` + (L.length ? `<ul>${L.map(l => lineHTML(l, 0, 'h3', false)).join('')}</ul>${totalsHTML()}<p><a href="${ROOT}cart.html">Edit bag</a></p>` : emptyHTML);
      const pb = $('#place-btn'); if (pb) { pb.disabled = !L.length; }
    }
  }

  /* ---------- dialogs ---------- */
  function openDlg(id) { const d = document.getElementById(id); if (d && !d.open) { d.showModal(); } }
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (o.hasAttribute('data-swap')) { const cur = o.closest('dialog'); if (cur) cur.close(); }
      openDlg(o.dataset.open); return;
    }
    const c = e.target.closest('[data-close]');
    if (c) { const d = c.closest('dialog'); if (d) d.close(); return; }
    if (e.target.tagName === 'DIALOG') { e.target.close(); return; }
    const b = e.target.closest('[data-act]');
    if (b) {
      const i = +b.dataset.i;
      if (b.dataset.act === 'inc') change(i, 1);
      else if (b.dataset.act === 'dec') change(i, -1);
      else if (b.dataset.act === 'rm') removeAt(i);
    }
  });
  const menuBtn = $('.menu-btn'), menuDlg = $('#menu');
  if (menuDlg && menuBtn) {
    menuDlg.addEventListener('close', () => menuBtn.setAttribute('aria-expanded', 'false'));
    menuBtn.addEventListener('click', () => { menuBtn.setAttribute('aria-expanded', 'true'); menuBtn.setAttribute('aria-label', 'Open menu'); });
    // close the menu if the viewport becomes wide
    matchMedia('(min-width:960px)').addEventListener('change', m => { if (m.matches && menuDlg.open) menuDlg.close(); });
  }

  /* ---------- validation ---------- */
  const PHONE = /^(\+?20|0)?1[0125]\d{8}$/;
  const phoneOk = v => PHONE.test(v.replace(/[\s\-()]/g, ''));
  function fieldError(f, show) {
    const err = f.form.querySelector(`.err[data-for="${f.name}"]`);
    if (err) err.classList.toggle('show', show);
    f.setAttribute('aria-invalid', show ? 'true' : 'false');
  }
  function validField(f) {
    const v = (f.value || '').trim();
    if (f.dataset.validate === 'phone') return phoneOk(v);
    if (f.type === 'email') return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (f.required) return v.length >= (f.name === 'address' ? 5 : f.tagName === 'SELECT' ? 1 : 2);
    return true;
  }
  function validateForm(form) {
    const bad = [];
    $$('input,select,textarea', form).forEach(f => {
      if (!f.name || f.type === 'radio') return;
      const ok = validField(f); fieldError(f, !ok);
      if (!ok) bad.push(f);
    });
    return bad;
  }
  document.addEventListener('focusout', e => {
    const f = e.target;
    if (f.matches && f.matches('form input[name],form select[name],form textarea[name]') && f.form && f.form.noValidate && f.type !== 'radio' && (f.value || f.getAttribute('aria-invalid'))) fieldError(f, !validField(f));
  });
  document.addEventListener('input', e => { const f = e.target; if (f.getAttribute && f.getAttribute('aria-invalid') === 'true' && validField(f)) fieldError(f, false); });

  /* prototype forms (fitting, contact): validate, then show a "not sent" message */
  $$('form[data-proto]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = validateForm(form);
    if (bad.length) { bad[0].focus(); return; }
    $('[data-proto-fields]', form).hidden = true;
    const done = $('.proto-done', form); done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus();
  }));

  /* ---------- product page ---------- */
  const pdp = $('.pdp[data-slug]');
  if (pdp) {
    const slug = pdp.dataset.slug, form = $('#add-form'), err = $('#size-err'), stickyBtn = $('#sticky-btn'), sub = $('#sticky-sub');
    const chosen = () => { const r = $('input[name=size]:checked', form); return r ? r.value : ''; };
    const syncSticky = () => {
      const s = chosen();
      stickyBtn.textContent = s ? 'Add to bag' : 'Select size';
      sub.textContent = (s ? `Size ${s} · ` : '') + money(CAT[slug].p) + ' · Prototype price';
    };
    form.addEventListener('change', () => { err.classList.remove('show'); syncSticky(); });
    const tryAdd = () => {
      const s = chosen();
      if (!s) {
        err.classList.add('show');
        const first = $('input[name=size]', form);
        $('.sizes', form).scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
        first.focus({ preventScroll: true });
        return;
      }
      add(slug, s); openDlg('cart-drawer');
    };
    form.addEventListener('submit', e => { e.preventDefault(); tryAdd(); });
    stickyBtn.addEventListener('click', tryAdd);
    const bar = $('#sticky-bar'), addBtn = $('#add-btn');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => bar.classList.toggle('show', !en.isIntersecting), { threshold: 0 }).observe(addBtn);
    }
    // swipe track is a scrollable region on phones: make it keyboard-reachable only while it actually scrolls
    const tr0 = $('#gallery-track');
    const syncTab = () => { if (tr0.scrollWidth > tr0.clientWidth + 1) tr0.setAttribute('tabindex', '0'); else tr0.removeAttribute('tabindex'); };
    syncTab(); addEventListener('resize', syncTab);
    // gallery counter
    const track = $('#gallery-track'), cnt = $('#gallery-count');
    if (track && cnt && 'IntersectionObserver' in window) {
      const items = $$('.gallery-item', track);
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) cnt.textContent = `${items.indexOf(en.target) + 1} / ${items.length}`; }), { root: track, threshold: 0.6 });
      items.forEach(i => io.observe(i));
    }
    syncSticky();
  }

  /* ---------- shop / collection filters ---------- */
  const grid = $('#grid');
  if (grid) {
    const tb = $('.toolbar'), fixedCat = tb ? tb.dataset.cat : '';
    const form = $('#filter-form'), cards = $$('.card', grid), cnt = $('#result-count'), chips = $('#chips'), empty = $('#empty');
    const NAMES = { denim: 'Denim', tailoring: 'Tailoring', leather: 'Leather', knitwear: 'Knitwear', tops: 'Tops' };
    const state = { cat: [], size: [], sort: 'featured' };
    const params = new URLSearchParams(location.search);
    if (!fixedCat && params.get('cat')) state.cat = params.get('cat').split(',').filter(c => NAMES[c]);
    if (params.get('size')) state.size = params.get('size').split(',').filter(s => /^(XS|S|M|L|XL)$/.test(s));
    if (['price-asc', 'price-desc', 'name'].includes(params.get('sort'))) state.sort = params.get('sort');
    function apply(pushUrl) {
      let shown = 0;
      cards.forEach(c => {
        const ok = (!state.cat.length || state.cat.includes(c.dataset.cat)) && (!state.size.length || state.size.some(s => c.dataset.sizes.split(' ').includes(s)));
        c.hidden = !ok; if (ok) shown++;
      });
      const key = { featured: c => +c.dataset.order, 'price-asc': c => +c.dataset.price, 'price-desc': c => -c.dataset.price, name: c => c.dataset.name.toLowerCase() }[state.sort];
      [...cards].sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : +a.dataset.order - +b.dataset.order; }).forEach(c => grid.appendChild(c));
      cnt.textContent = `${shown} ${shown === 1 ? 'piece' : 'pieces'}`;
      const show = $('#filter-show'); if (show) show.textContent = `Show ${shown} ${shown === 1 ? 'piece' : 'pieces'}`;
      empty.hidden = shown > 0;
      const labels = [...state.cat.map(c => ['cat', c, NAMES[c]]), ...state.size.map(s => ['size', s, 'Size ' + s])];
      if (state.sort !== 'featured') labels.push(['sort', state.sort, { 'price-asc': 'Price, low to high', 'price-desc': 'Price, high to low', name: 'Name, A to Z' }[state.sort]]);
      chips.innerHTML = labels.map(([k, v, t]) => `<span class="chip">${esc(t)}<button type="button" data-chip="${k}:${v}" aria-label="Remove filter ${esc(t)}">&times;</button></span>`).join('');
      if (form) {
        $$('input[name=cat]', form).forEach(i => i.checked = state.cat.includes(i.value));
        $$('input[name=size]', form).forEach(i => i.checked = state.size.includes(i.value));
        $$('input[name=sort]', form).forEach(i => i.checked = i.value === state.sort);
      }
      const q = new URLSearchParams();
      if (state.cat.length) q.set('cat', state.cat.join(','));
      if (state.size.length) q.set('size', state.size.join(','));
      if (state.sort !== 'featured') q.set('sort', state.sort);
      if (pushUrl) history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : ''));
    }
    const reset = () => { state.cat = []; state.size = []; state.sort = 'featured'; apply(true); };
    if (form) form.addEventListener('change', () => {
      state.cat = $$('input[name=cat]:checked', form).map(i => i.value);
      state.size = $$('input[name=size]:checked', form).map(i => i.value);
      const s = $('input[name=sort]:checked', form); state.sort = s ? s.value : 'featured';
      apply(true);
    });
    $('#filter-clear') && $('#filter-clear').addEventListener('click', reset);
    $('#empty-clear') && $('#empty-clear').addEventListener('click', reset);
    chips.addEventListener('click', e => {
      const b = e.target.closest('[data-chip]'); if (!b) return;
      const [k, v] = b.dataset.chip.split(':');
      if (k === 'cat') state.cat = state.cat.filter(x => x !== v);
      else if (k === 'size') state.size = state.size.filter(x => x !== v);
      else state.sort = 'featured';
      apply(true);
    });
    apply(false);
  }

  /* ---------- checkout ---------- */
  const co = $('#checkout-form');
  if (co) {
    const t = $('#addr2-toggle'), w = $('#addr2-wrap');
    t.addEventListener('click', () => { const open = w.hidden; w.hidden = !open; t.setAttribute('aria-expanded', String(open)); if (open) $('input', w).focus(); });
    const gov = $('#c-gov'), note = $('#c-gov-note');
    gov.addEventListener('change', () => {
      note.textContent = ['Cairo', 'Alexandria'].includes(gov.value) || !gov.value
        ? 'Delivery coverage is to be confirmed. The first target cities are Cairo and Alexandria.'
        : 'Delivery to ' + gov.value + ' is to be confirmed. The first target cities are Cairo and Alexandria.';
    });
    co.addEventListener('submit', e => {
      e.preventDefault();
      const sum = $('#err-summary'), list = $('#err-list');
      if (!lines().length) { toast('Your bag is empty.'); return; }
      const bad = validateForm(co);
      if (bad.length) {
        list.innerHTML = bad.map(f => { const lab = $(`label[for="${f.id}"]`); return `<li><a href="#${f.id}">${esc(lab ? lab.firstChild.textContent.trim() : f.name)}</a></li>`; }).join('');
        sum.classList.add('show'); sum.focus(); return;
      }
      sum.classList.remove('show');
      const fd = new FormData(co);
      store.set(ORDER, {
        items: lines().map(l => ({ n: l.p.n, z: l.z, q: l.q, p: l.p.p })), subtotal: subtotal(),
        name: fd.get('name'), governorate: fd.get('governorate'), city: fd.get('city'), payment: fd.get('payment'),
      });
      cart = []; store.set(KEY, cart);
      location.href = ROOT + 'order-confirmation.html';
    });
    $('#err-list').addEventListener('click', e => { const a = e.target.closest('a'); if (a) { e.preventDefault(); const f = $(a.getAttribute('href')); f && f.focus(); } });
  }

  /* ---------- confirmation ---------- */
  const cd = $('#confirm-detail');
  if (cd) {
    const o = store.get(ORDER, null);
    const PAY = { cod: 'Cash on delivery', card: 'Card', wallet: 'Mobile wallet', instapay: 'InstaPay' };
    cd.innerHTML = o
      ? `<h2>What you entered</h2><dl class="facts"><dt>Name</dt><dd>${esc(o.name)}</dd><dt>Delivery to</dt><dd>${esc(o.city)}, ${esc(o.governorate)}</dd><dt>Payment choice</dt><dd>${esc(PAY[o.payment] || '')} (planned, not functional)</dd><dt>Order reference</dt><dd>None. No order was created.</dd></dl>
         <h2>Items</h2><ul>${o.items.map(i => `<li class="line" style="grid-template-columns:1fr auto"><span>${esc(i.n)}, size ${esc(i.z)}, qty ${i.q}</span><span>${money(i.p * i.q)}</span></li>`).join('')}</ul>
         <div class="totals"><div class="grand"><span>Subtotal (prototype prices)</span><span>${money(o.subtotal)}</span></div><div><span>Delivery</span><span>To be confirmed</span></div></div>`
      : `<p>There is no prototype checkout to show. Add a piece to your bag and walk through the checkout to see this page filled in.</p>`;
  }

  renderAll();
  window.addEventListener('storage', e => { if (e.key === KEY) { cart = store.get(KEY, []); renderAll(); } });
})();

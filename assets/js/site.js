/* BlairsLab Games site: nav drawer, theme toggle, search, small helpers. No dependencies. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var siteRoot = body.getAttribute('data-root') || '';

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---- Theme toggle ---- */
  var themeBtn = $('.theme-toggle');
  function currentTheme() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function syncThemeBtn() {
    if (!themeBtn) return;
    var light = currentTheme() === 'light';
    themeBtn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    themeBtn.setAttribute('title', light ? 'Switch to dark theme' : 'Switch to light theme');
  }
  if (themeBtn) {
    syncThemeBtn();
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('bl-theme', next); } catch (e) { /* storage unavailable */ }
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#f6efdf' : '#111522');
      syncThemeBtn();
    });
  }

  /* ---- Slide-out navigation (phones) ---- */
  var toggle = $('.nav-toggle'), nav = $('#site-nav'), scrim = $('.scrim');
  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && nav) {
      var first = $('a', nav);
      if (first) first.focus();
    } else if (!open && toggle && doc.activeElement && nav && nav.contains(doc.activeElement)) {
      toggle.focus();
    }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setNav(!body.classList.contains('nav-open')); });
    $all('.nav-close', nav).forEach(function (b) { b.addEventListener('click', function () { setNav(false); }); });
    if (scrim) scrim.addEventListener('click', function () { setNav(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) setNav(false); });
  }
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (body.classList.contains('nav-open')) setNav(false);
      var m = $('.menu[open]');
      if (m) m.removeAttribute('open');
    }
  });
  doc.addEventListener('click', function (e) {
    var m = $('.menu[open]');
    if (m && !m.contains(e.target)) m.removeAttribute('open');
  });

  /* ---- Table of contents: open on wide screens, collapsed on phones ---- */
  var toc = $('details.toc');
  if (toc && window.matchMedia && window.matchMedia('(max-width: 959px)').matches) toc.removeAttribute('open');

  /* ---- Make wide tables keyboard-scrollable ---- */
  $all('.table-wrap').forEach(function (w) { if (w.scrollWidth > w.clientWidth) w.setAttribute('tabindex', '0'); });

  /* ---- Search ---- */
  var input = $('.search input'), results = $('.search-results');
  var loading = false, loaded = !!window.BL_SEARCH, active = -1, shown = [];

  function loadIndex(cb) {
    if (window.BL_SEARCH) { loaded = true; cb(); return; }
    if (loading) return;
    loading = true;
    var s = doc.createElement('script');
    s.src = siteRoot + 'search-data.js';
    s.onload = function () { loaded = true; cb(); };
    s.onerror = function () { loading = false; render([], true); };
    doc.head.appendChild(s);
  }

  function norm(s) { return (s || '').toLowerCase(); }

  function search(q) {
    var terms = norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    window.BL_SEARCH.forEach(function (d) {
      var t = norm(d.t), s = norm(d.s), g = norm(d.g), x = norm(d.x), score = 0, ok = true;
      terms.forEach(function (w) {
        var sc = 0;
        if (t.indexOf(w) === 0) sc += 14; else if (t.indexOf(w) > -1) sc += 10;
        if (s.indexOf(w) > -1) sc += 4;
        if (g.indexOf(w) > -1) sc += 2;
        if (x.indexOf(w) > -1) sc += 1;
        if (!sc) ok = false;
        score += sc;
      });
      if (ok) out.push({ d: d, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score || a.d.t.localeCompare(b.d.t); });
    return out.slice(0, 8).map(function (r) { return r.d; });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(list, failed) {
    shown = list; active = -1;
    if (!results) return;
    if (failed) { results.innerHTML = '<li class="r-empty">Search is unavailable right now.</li>'; results.hidden = false; return; }
    if (!list.length) { results.innerHTML = '<li class="r-empty">No pages found.</li>'; results.hidden = false; return; }
    results.innerHTML = list.map(function (d, i) {
      return '<li><a href="' + esc(siteRoot + d.u + 'index.html') + '" data-i="' + i + '"><span class="r-title">' + esc(d.t) +
        '</span><br><span class="r-meta">' + esc(d.g) + (d.sp ? ' · Spoilers' : '') + (d.s ? ' · ' + esc(d.s.length > 90 ? d.s.slice(0, 88) + '…' : d.s) : '') + '</span></a></li>';
    }).join('');
    results.hidden = false;
  }

  function run() {
    var q = input.value.trim();
    if (!q) { if (results) results.hidden = true; shown = []; return; }
    loadIndex(function () { render(search(input.value.trim())); });
  }

  function setActive(i) {
    var links = $all('a', results);
    if (!links.length) return;
    active = (i + links.length) % links.length;
    links.forEach(function (a, n) { a.classList.toggle('active', n === active); });
    links[active].scrollIntoView({ block: 'nearest' });
  }

  if (input && results) {
    input.addEventListener('focus', function () { if (!window.BL_SEARCH) loadIndex(function () {}); });
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') {
        var target = active >= 0 ? shown[active] : shown[0];
        if (target) { e.preventDefault(); window.location.href = siteRoot + target.u + 'index.html'; }
      } else if (e.key === 'Escape') { results.hidden = true; }
    });
    doc.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.search')) results.hidden = true; });
    doc.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); input.focus(); }
    });
    var form = input.form;
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
  }
})();

/* Scroll reveal and picture zoom. Both are extras: the page works without them. */
(function () {
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var items = doc.querySelectorAll('.game-card, .page-card, .world-teaser, .community, .prose figure, .group-title');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(items, function (el, n) {
      el.classList.add('reveal');
      el.style.transitionDelay = (n % 3) * 70 + 'ms';
      io.observe(el);
    });
  }

  var box = null;
  function closeBox() { if (box) { box.remove(); box = null; doc.body.classList.remove('zoom-open'); } }
  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (box) { closeBox(); return; }
    if (!t || t.tagName !== 'IMG' || !t.closest('.prose') || t.closest('a')) return;
    box = doc.createElement('div');
    box.className = 'zoom';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', t.alt || 'Picture');
    var img = doc.createElement('img');
    img.src = t.currentSrc || t.src;
    img.alt = t.alt || '';
    box.appendChild(img);
    doc.body.appendChild(box);
    doc.body.classList.add('zoom-open');
  });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBox(); });
})();

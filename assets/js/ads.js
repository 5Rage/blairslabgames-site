/* Ads and consent for blairslabgames.co.nz.
 *
 * STATUS: STUB. Ads are OFF by default (site.config.json -> "adsEnabled": false).
 * With ads off the build emits no ad slots and no consent banner, and this file does nothing.
 * With ads on, the build adds data-ads="1" and data-ad-client="ca-pub-..." to <body>, and the
 * ad slots (<ins class="adsbygoogle">) are already in the page. This file decides WHEN to load
 * the single AdSense script. Nothing is sent to Google until consent is granted.
 *
 * TODO before turning ads on (see README "Before turning ads on"):
 *   1. Replace the stub consent banner below with a Google-certified CMP for EEA/UK visitors
 *      (it must support the IAB TCF and Google Consent Mode v2) and call grantAds()/denyAds()
 *      from its callbacks.
 *   2. Decide the default for visitors outside the EEA/UK (this stub asks everyone).
 *   3. Review the privacy page text against what the CMP and AdSense actually do.
 */
(function () {
  'use strict';
  var body = document.body;
  if (!body || body.getAttribute('data-ads') !== '1') return;

  // Visits that start from a game's Wiki button (?src=game) never see ads: the games give a small gift for
  // opening the wiki, and AdSense does not allow rewarding people for visiting pages that show ads.
  var fromGame = false;
  try {
    if (/[?&]src=game(&|$)/.test(location.search)) sessionStorage.setItem('bl-from-game', '1');
    fromGame = sessionStorage.getItem('bl-from-game') === '1';
  } catch (e) { fromGame = /[?&]src=game(&|$)/.test(location.search); }
  if (fromGame) {
    Array.prototype.forEach.call(document.querySelectorAll('.ad-slot, #consent-banner'), function (el) { el.remove(); });
    return;
  }

  var CLIENT = body.getAttribute('data-ad-client') || '';
  var KEY = 'bl-ad-consent'; // 'granted' | 'denied'
  var scriptAdded = false;

  function readChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function saveChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* storage unavailable: choice lasts this page only */ }
  }

  /* TODO: replace with the CMP's "ads allowed" signal (Consent Mode v2: ad_storage, ad_user_data,
     ad_personalization). Until a CMP is wired in, 'granted' means the visitor pressed Accept. */
  function loadAdSense() {
    if (scriptAdded || !CLIENT) return;
    scriptAdded = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CLIENT);
    s.onload = function () {
      var slots = document.querySelectorAll('ins.adsbygoogle');
      for (var i = 0; i < slots.length; i++) {
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ignore */ }
      }
    };
    document.head.appendChild(s);
  }

  function hideBanner() {
    var b = document.getElementById('consent-banner');
    if (b) b.hidden = true;
  }
  function grantAds() { saveChoice('granted'); hideBanner(); loadAdSense(); }
  function denyAds() { saveChoice('denied'); hideBanner(); }

  function showBanner() {
    var b = document.getElementById('consent-banner');
    if (!b) return;
    b.hidden = false;
    var yes = b.querySelector('[data-consent="accept"]');
    var no = b.querySelector('[data-consent="reject"]');
    if (yes) yes.addEventListener('click', grantAds);
    if (no) no.addEventListener('click', denyAds);
  }

  /* Footer "Ad choices" link lets people change their mind. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-consent="reopen"]') : null;
    if (t) { e.preventDefault(); showBanner(); }
  });

  var choice = readChoice();
  if (choice === 'granted') loadAdSense();
  else if (choice !== 'denied') showBanner();
})();

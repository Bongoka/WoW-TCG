// ============================================================================
// SPRACHE (Deutsch / Englisch). Texte stehen im Code auf Deutsch und laufen durch tr:
//   tr('Text')            → einfacher Text
//   tr`Text ${x} …`       → Text mit Platzhaltern; Schlüssel im Wörterbuch: 'Text {0} …'
// Englisch: Übersetzung aus I18N_EN (js/i18n_en.js), fehlt sie, bleibt der deutsche Text.
// Feste HTML-Texte (index.html) übersetzt translateDom beim Start. Standard: Englisch, gemerkt in localStorage.
// ============================================================================
const LANG_KEY = 'wow_tcg_lang';
let LANG = (() => { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } })();
var I18N_EN = typeof I18N_EN !== 'undefined' ? I18N_EN : {};
const I18N_MISS = new Set();   // fehlende Übersetzungen (Konsole: [...I18N_MISS])
// Oberfläche ohne Emoji (nur das Log behält sie): Schlüssel und Übersetzungen auch ohne Emoji auffindbar
const I18N_EMO = /(?![☰★✓✦⚠])[\u{1F000}-\u{1F1E5}\u{1F200}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{23E9}-\u{23FA}\u{25B6}\u{21A9}][️‍]*\s?/gu;
const i18nPlain = s => s.replace(/✔/g, '✓').replace(/>[✖✕]</g, '>×<').replace(/>✚</g, '>+<').replace(I18N_EMO, '');
let _i18nPlainMap = null;
function i18nGet(k) {
    const en = I18N_EN[k]; if (en !== undefined) return en;
    if (!_i18nPlainMap) { _i18nPlainMap = {}; for (const key in I18N_EN) { const p = i18nPlain(key); if (p !== key && !(p in _i18nPlainMap)) _i18nPlainMap[p] = i18nPlain(I18N_EN[key]); } }
    return _i18nPlainMap[k];
}
function tr(s, ...v) {
    if (typeof s === 'string') {
        if (LANG === 'de') return s;
        const en = i18nGet(s); if (en === undefined) { I18N_MISS.add(s); return s; }
        return en;
    }
    // Tagged Template: Schlüssel aus den Rohtexten mit {0}, {1} …
    let key = s.raw[0];
    for (let i = 0; i < v.length; i++) key += '{' + i + '}' + s.raw[i + 1];
    const en = LANG === 'de' ? undefined : i18nGet(key);
    if (en === undefined) {
        if (LANG !== 'de') I18N_MISS.add(key);
        let out = s[0]; for (let i = 0; i < v.length; i++) out += v[i] + s[i + 1]; return out;
    }
    return en.replace(/\{(\d+)\}/g, (m, i) => v[+i]);
}
function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    location.reload();   // alle Texte (auch beim Laden erzeugte Listen) in der neuen Sprache
}
// Feste Texte der Seite: Textknoten und title/placeholder-Attribute, deren Text im Wörterbuch steht
function translateDom(root = document.body) {
    if (LANG === 'de') return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
        const t = n.nodeValue.trim(); if (!t) continue;
        const en = i18nGet(t); if (en !== undefined) n.nodeValue = n.nodeValue.replace(t, en); else if (/[äöüÄÖÜß]|\b(der|die|das|und|nicht|Spiel|Karte)\b/.test(t)) I18N_MISS.add(t);
    }
    root.querySelectorAll('[title],[placeholder]').forEach(e => ['title', 'placeholder'].forEach(a => { const t = e.getAttribute(a); const en = t && i18nGet(t.trim()); if (en !== undefined) e.setAttribute(a, en); }));
}

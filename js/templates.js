/* =========================================================================
   Resume render engine — doc + design  ->  sheet HTML
   Markup is shared by every template; each template's look lives in
   css/resume.css under .t-<id>. Elements carrying data-brk are the units the
   paginator keeps together across page breaks.
   ========================================================================= */
(function () {
  var RB = window.RB;

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  // **bold** and *italic*
  function md(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  }
  function prettyUrl(u) { return String(u || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, ''); }
  function href(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    return 'https://' + u;
  }
  function splitList(s) { return String(s || '').split(/[,\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function bulletsOf(t) {
    return String(t || '').split('\n').map(function (s) { return s.replace(/^\s*[-•*▪●◦–]\s+/, '').trim(); }).filter(Boolean);
  }
  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return 'YN';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function hasContent(item) {
    return Object.keys(item).some(function (k) { return k !== 'id' && String(item[k] || '').trim(); });
  }
  function luminance(hex) {
    var m = String(hex || '').replace('#', '');
    if (m.length === 3) m = m.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(m, 16);
    if (isNaN(n)) return 0;
    var rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  RB.util = { esc: esc, md: md, prettyUrl: prettyUrl, href: href, splitList: splitList, bulletsOf: bulletsOf,
              initials: initials, hasContent: hasContent, luminance: luminance };

  /* ---- canonical entry mapping ---------------------------------------- */
  var dr = RB.dateRange;
  var MAP = {
    experience:     function (i) { return { title: i.role, subtitle: i.company, location: i.location, date: dr(i.start, i.end), bullets: bulletsOf(i.bullets) }; },
    volunteer:      function (i) { return { title: i.role, subtitle: i.org, location: i.location, date: dr(i.start, i.end), bullets: bulletsOf(i.bullets) }; },
    education:      function (i) { return { title: i.degree, subtitle: i.school, location: i.location, date: dr(i.start, i.end), extra: i.score, bullets: bulletsOf(i.bullets) }; },
    projects:       function (i) { return { title: i.name, subtitle: i.tech, link: i.link, date: dr(i.start, i.end), bullets: bulletsOf(i.bullets) }; },
    certifications: function (i) { return { title: i.name, subtitle: i.issuer, date: i.date, link: i.link }; },
    awards:         function (i) { return { title: i.title, subtitle: i.issuer, date: i.date, text: i.description }; },
    publications:   function (i) { return { title: i.title, subtitle: i.publisher, date: i.date, link: i.link }; },
    references:     function (i) { return { title: i.name, subtitle: i.position, text: i.contact }; },
    custom:         function (i) { return { title: i.title, subtitle: i.subtitle, location: i.location, date: dr(i.start, i.end), bullets: bulletsOf(i.bullets) }; }
  };
  var ORG_TYPES = { experience: 1, volunteer: 1, education: 1 };

  function joinDot(arr) { return arr.filter(Boolean).join('<span class="e-dot"> · </span>'); }
  function row(l, r, cls) {
    if (!l && !r) return '';
    return '<div class="e-row' + (cls ? ' ' + cls : '') + '"><div class="e-l">' + (l || '') + '</div>' + (r ? '<div class="e-r">' + r + '</div>' : '') + '</div>';
  }

  function entryHTML(e, tpl, col) {
    var layout = col === 'side' ? 'side' : tpl.entry;
    var T = e.title ? '<span class="e-title">' + md(e.title) + '</span>' : '';
    var S = e.subtitle ? '<span class="e-sub">' + esc(e.subtitle) + '</span>' : '';
    var D = e.date ? '<span class="e-date">' + esc(e.date) + '</span>' : '';
    var L = e.location ? '<span class="e-loc">' + esc(e.location) + '</span>' : '';
    var K = e.link ? '<a class="e-link" href="' + esc(href(e.link)) + '">' + esc(prettyUrl(e.link)) + '</a>' : '';
    var X = e.extra ? '<span class="e-extra">' + esc(e.extra) + '</span>' : '';
    var P = e.text ? '<p class="e-text">' + md(e.text) + '</p>' : '';
    var B = e.bullets && e.bullets.length
      ? '<ul class="e-bullets">' + e.bullets.map(function (b) { return '<li data-brk="u">' + md(b) + '</li>'; }).join('') + '</ul>'
      : '';
    var head;
    switch (layout) {
      case 'split':
        head = row(T, L) + row(joinDot([S, X, K]), D, 'e-row2');
        break;
      case 'inline': {
        var l = [T, S].filter(Boolean).join('<span class="e-sep">, </span>') + (L ? '<span class="e-sep"> — </span>' + L : '');
        head = row(l, D) + row(joinDot([X, K]), '', 'e-row2');
        break;
      }
      case 'left':
        return '<div class="entry" data-brk="e"><div class="e-side">' + D + L + '</div><div class="e-main">' +
          row(T, '') + row(joinDot([S, X, K]), '', 'e-row2') + P + B + '</div></div>';
      case 'side':
        head = (T ? '<div class="e-row">' + T + '</div>' : '') +
               ((S || X) ? '<div class="e-row e-row2">' + joinDot([S, X]) + '</div>' : '') +
               ((D || L) ? '<div class="e-row e-meta">' + joinDot([D, L]) + '</div>' : '') +
               (K ? '<div class="e-row">' + K + '</div>' : '');
        break;
      default: // stack
        head = row(T, D) + row(joinDot([S, X, K]), L, 'e-row2');
    }
    return '<div class="entry" data-brk="e">' + head + P + B + '</div>';
  }

  function skillsHTML(items, tpl, col) {
    var style = col === 'side' ? (tpl.sideSkills || 'tags') : (tpl.skills || 'rows');
    return items.map(function (i) {
      var list = splitList(i.items);
      var cat = String(i.name || '').trim();
      if (!list.length && !cat) return '';
      if (style === 'rows') {
        return '<div class="sk-row" data-brk="u">' + (cat ? '<span class="sk-cat">' + esc(cat) + ':</span> ' : '') +
          '<span class="sk-items">' + list.map(esc).join(', ') + '</span></div>';
      }
      if (style === 'stack') {
        return '<div class="sk-group" data-brk="u">' + (cat ? '<div class="sk-cat">' + esc(cat) + '</div>' : '') +
          '<div class="sk-stack">' + list.map(esc).join(', ') + '</div></div>';
      }
      return '<div class="sk-group" data-brk="u">' + (cat ? '<div class="sk-cat">' + esc(cat) + '</div>' : '') +
        '<div class="tags">' + list.map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join(' ') + '</div></div>';
    }).join('');
  }

  var LEVEL_N = { Native: 5, Fluent: 4, Professional: 3, Intermediate: 2, Basic: 1 };
  function langsHTML(items, tpl, col) {
    var dots = col === 'side' || tpl.langs === 'dots';
    if (!dots) {
      return '<p class="s-inline" data-brk="u">' + items.map(function (i) {
        return '<span class="lg"><strong>' + esc(i.name) + '</strong>' + (i.level ? ' (' + esc(i.level) + ')' : '') + '</span>';
      }).join('<span class="e-dot"> · </span>') + '</p>';
    }
    return items.map(function (i) {
      var n = LEVEL_N[i.level] || 0, d = '';
      for (var k = 1; k <= 5; k++) d += '<i' + (k <= n ? ' class="on"' : '') + '></i>';
      return '<div class="lang" data-brk="u"><div class="lang-n"><strong>' + esc(i.name) + '</strong>' +
        (i.level ? '<span class="lang-l">' + esc(i.level) + '</span>' : '') + '</div>' +
        (n ? '<span class="lang-d" aria-hidden="true">' + d + '</span>' : '') + '</div>';
    }).join('');
  }

  function sectionBody(sec, tpl, col) {
    var def = RB.SECTION_TYPES[sec.type] || RB.SECTION_TYPES.custom;
    if (sec.type === 'summary' || (def.kind === 'text')) {
      return String(sec.content || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean)
        .map(function (p) { return '<p class="s-text" data-brk="u">' + md(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
    }
    if (def.kind === 'tags') {
      var list = splitList(sec.content);
      if (!list.length) return '';
      if (col === 'side' && tpl.sideSkills === 'tags') {
        return '<div class="tags" data-brk="u">' + list.map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join(' ') + '</div>';
      }
      return '<p class="s-inline" data-brk="u">' + list.map(esc).join('<span class="e-dot"> · </span>') + '</p>';
    }
    var items = (sec.items || []).filter(hasContent);
    if (!items.length) return '';
    if (sec.type === 'skills') return skillsHTML(items, tpl, col);
    if (sec.type === 'languages') return langsHTML(items, tpl, col);
    var map = MAP[sec.type] || MAP.custom;
    return items.map(function (i) {
      var e = map(i);
      if (tpl.orgFirst && ORG_TYPES[sec.type]) { var t = e.title; e.title = e.subtitle; e.subtitle = t; }
      return entryHTML(e, tpl, col);
    }).join('');
  }

  function sectionHTML(sec, tpl, col) {
    var body = sectionBody(sec, tpl, col);
    if (!body) return '';
    return '<section class="r-sec s-' + sec.type + '" data-brk="sec"><h2 class="s-title"><span>' + esc(sec.title) +
      '</span></h2><div class="s-body">' + body + '</div></section>';
  }

  function contactItems(b) {
    var tel = String(b.phone || '').replace(/[^\d+]/g, '');
    return [
      ['mail', b.email, b.email ? 'mailto:' + String(b.email).trim() : ''],
      ['phone', b.phone, tel ? 'tel:' + tel : ''],
      ['pin', b.location, ''],
      ['globe', b.website, href(b.website)],
      ['linkedin', b.linkedin, href(b.linkedin)],
      ['github', b.github, href(b.github)]
    ].filter(function (c) { return String(c[1] || '').trim(); });
  }
  function contactHTML(b) {
    return contactItems(b).map(function (c) {
      var label = c[0] === 'mail' || c[0] === 'phone' || c[0] === 'pin' ? esc(String(c[1]).trim()) : esc(prettyUrl(c[1]));
      var inner = c[2] ? '<a href="' + esc(c[2]) + '">' + label + '</a>' : '<span>' + label + '</span>';
      return '<span class="c-item">' + RB.icon(c[0], 'c-ic') + inner + '</span>';
    }).join('');
  }

  /* ---- main ------------------------------------------------------------ */
  RB.render = function (doc, override) {
    var d = Object.assign({}, RB.DEFAULT_DESIGN, doc.design || {}, override || {});
    var tpl = RB.tpl(d.template);
    var fontKey = d.font && RB.FONTS[d.font] ? d.font : tpl.font;
    var font = RB.FONTS[fontKey];
    var accent = d.accent || tpl.accent;
    var icons = d.icons == null ? tpl.icons : !!d.icons;
    var b = doc.basics || {};

    var showPhoto = !!(tpl.photo && d.showPhoto && b.photo);
    var avatar = showPhoto
      ? '<div class="h-photo"><img src="' + esc(b.photo) + '" alt=""></div>'
      : (tpl.photo && tpl.monogram && d.showPhoto ? '<div class="h-photo h-mono"><span>' + esc(initials(b.name)) + '</span></div>' : '');

    var contact = contactHTML(b);
    var head = '<header class="r-head' + (tpl.photo === 'head' && avatar ? ' has-photo' : '') + '">' +
      (tpl.photo === 'head' ? avatar : '') +
      '<div class="h-id"><h1 class="h-name">' + (esc(b.name) || 'Your Name') + '</h1>' +
      (b.title ? '<div class="h-title">' + esc(b.title) + '</div>' : '') + '</div>' +
      (tpl.contact !== 'side' && contact ? '<div class="h-contact">' + contact + '</div>' : '') +
      '</header>';

    var main = '', side = '';
    if (tpl.layout === 'two') {
      if (tpl.photo === 'side' && avatar) side += '<div class="side-photo">' + avatar + '</div>';
      if (tpl.contact === 'side' && contact) {
        side += '<section class="r-sec s-contact" data-brk="sec"><h2 class="s-title"><span>Contact</span></h2><div class="s-body"><div class="c-list">' + contact + '</div></div></section>';
      }
    }
    (doc.sections || []).forEach(function (sec) {
      if (!sec.visible) return;
      var col = tpl.layout === 'two' && (tpl.side || []).indexOf(sec.type) > -1 ? 'side' : 'main';
      var h = sectionHTML(sec, tpl, col);
      if (col === 'side') side += h; else main += h;
    });

    var body;
    if (tpl.layout === 'two') {
      body = '<div class="r-body two' + (tpl.sideFirst ? ' side-first' : '') + '">' +
        '<div class="r-col r-main">' + (tpl.header === 'main' ? head : '') + main + '</div>' +
        '<div class="r-col r-side">' + side + '</div></div>';
    } else {
      body = '<div class="r-body one"><div class="r-col r-main">' + main + '</div></div>';
    }

    var mark = d.watermark ? '<div class="r-mark">Made with ' + esc(RB.config.brand) + '</div>' : '';
    var html = '<div class="sheet-bg"></div><div class="r-page">' + (tpl.header !== 'main' ? head : '') + body + mark + '</div>';

    var onAccent = luminance(accent) > 0.45 ? '#111827' : '#ffffff';
    var my = Math.round(d.margin * 0.9 * 10) / 10;
    var vars = {
      '--accent': accent,
      '--on-accent': onAccent,
      '--f-head': font.head,
      '--f-body': font.body,
      '--fs': d.fontSize + 'pt',
      '--lh': d.lineHeight,
      '--mx': d.margin + 'mm',
      '--my': my + 'mm',
      '--gap': d.spacing,
      '--bullet': "'" + (RB.BULLETS[d.bullet] != null ? RB.BULLETS[d.bullet] : '•') + "'"
    };
    var style = Object.keys(vars).map(function (k) { return k + ':' + vars[k]; }).join(';');
    var cls = ['sheet', 't-' + tpl.id, icons ? 'icons' : 'no-icons', 'b-' + (d.bullet || 'disc'), d.pageSize === 'letter' ? 'letter' : 'a4'].join(' ');

    return { html: html, cls: cls, style: style, tpl: tpl, accent: accent, fontKey: fontKey,
             marginMM: { x: d.margin, y: my }, pageSize: d.pageSize === 'letter' ? 'letter' : 'a4' };
  };

  RB.PAGE = {
    a4:     { wmm: 210,   hmm: 297,   label: 'A4' },
    letter: { wmm: 215.9, hmm: 279.4, label: 'US Letter' }
  };
  RB.MM = 96 / 25.4;
})();

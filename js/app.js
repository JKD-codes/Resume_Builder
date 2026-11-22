/* =========================================================================
   Resumeit — application controller
   ========================================================================= */
(function () {
  'use strict';
  var RB = window.RB, U = RB.util, I = RB.icon, C = RB.config, esc = U.esc;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var isMobile = function () { return window.matchMedia('(max-width: 860px)').matches; };

  /* ---------------------------------------------------------------------
     Storage
     --------------------------------------------------------------------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  /* ---------------------------------------------------------------------
     State
     --------------------------------------------------------------------- */
  var S = {
    doc: null,
    index: [],
    pro: !!store.get('rb:pro', false),
    pages: 1,
    scale: 1,
    render: null,
    ui: { tab: 'content', mview: 'content', zoom: 'fit', basicsOpen: true, openSecs: {}, openItems: {}, filter: 'all', jm: null }
  };

  function normalize(doc) {
    doc = doc || {};
    doc.id = doc.id || RB.uid();
    doc.name = doc.name || 'My resume';
    doc.updatedAt = doc.updatedAt || Date.now();
    doc.design = Object.assign({}, RB.DEFAULT_DESIGN, doc.design || {});
    if (!RB.TEMPLATES.some(function (t) { return t.id === doc.design.template; })) doc.design.template = 'modern';
    doc.basics = Object.assign({ name: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '' }, doc.basics || {});
    doc.sections = (doc.sections || []).filter(function (s) { return s && RB.SECTION_TYPES[s.type]; }).map(function (s) {
      var def = RB.SECTION_TYPES[s.type];
      s.id = s.id || RB.uid();
      s.visible = s.visible !== false;
      s.title = s.title || def.label;
      if (def.kind === 'items') s.items = (s.items || []).map(function (i) { return Object.assign({ id: RB.uid() }, i); });
      else s.content = s.content || '';
      return s;
    });
    return doc;
  }

  function addDoc(doc) {
    normalize(doc);
    S.index.push({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt });
    store.set('rb:doc:' + doc.id, doc);
    store.set('rb:index', S.index);
    return doc;
  }

  function openDoc(id) {
    var d = store.get('rb:doc:' + id, null);
    if (!d) return false;
    S.doc = normalize(d);
    S.ui.openSecs = {}; S.ui.openItems = {}; S.ui.jm = null;
    store.set('rb:current', id);
    return true;
  }

  var saveTimer = 0;
  function touch(opts) {
    S.doc.updatedAt = Date.now();
    setSaveState('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
    if (!opts || opts.preview !== false) schedulePreview();
  }
  function saveNow() {
    clearTimeout(saveTimer);
    if (!S.doc) return;
    var ok = store.set('rb:doc:' + S.doc.id, S.doc);
    var e = S.index.find(function (x) { return x.id === S.doc.id; });
    if (e) { e.name = S.doc.name; e.updatedAt = S.doc.updatedAt; }
    store.set('rb:index', S.index);
    store.set('rb:current', S.doc.id);
    setSaveState(ok ? 'saved' : 'error');
  }
  function setSaveState(st) {
    var el = $('#saveState'); if (!el) return;
    el.classList.toggle('saving', st === 'saving');
    $('.lbl-t', el).textContent = st === 'saving' ? 'Saving…' : st === 'error' ? 'Storage full — export a backup' : 'All changes saved';
  }

  /* ---------------------------------------------------------------------
     Preview: render → paginate → show pages
     --------------------------------------------------------------------- */
  var previewRAF = 0;
  function schedulePreview() {
    if (previewRAF) return;
    previewRAF = requestAnimationFrame(function () { previewRAF = 0; renderPreview(); });
  }

  function paginate(sheet, pageH, padT, padB) {
    var base = sheet.getBoundingClientRect().top;
    var top = function (el) { return el.getBoundingClientRect().top - base; };
    var bot = function (el) { return el.getBoundingClientRect().bottom - base; };
    var SAFE = 3;
    var contentH = pageH - padT - padB;
    function need(u) {
      var t = u.getAttribute('data-brk');
      if (t === 'sec') { var f = u.querySelector('.s-body [data-brk]'); return f ? need(f) : bot(u); }
      if (t === 'e') { var li = u.querySelector('li[data-brk]'); return li ? bot(li) : bot(u); }
      return bot(u);
    }
    var units = sheet.querySelectorAll('[data-brk]');
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      var t = top(u), b = need(u);
      var page = Math.floor(t / pageH);
      var limit = (page + 1) * pageH - padB - SAFE;
      var target = null;
      if (b > limit && (b - t) < contentH - SAFE) target = (page + 1) * pageH + padT;
      else if (page > 0 && t - page * pageH < padT - 1) target = page * pageH + padT;
      if (target == null) continue;
      var sp = document.createElement(u.tagName === 'LI' ? 'li' : 'div');
      sp.className = 'pg-sp';
      sp.setAttribute('aria-hidden', 'true');
      var h = Math.max(0, target - t);
      sp.style.height = h + 'px';
      u.parentNode.insertBefore(sp, u);
      for (var k = 0; k < 3; k++) {
        var d = target - top(u);
        if (Math.abs(d) < 0.5) break;
        h = Math.max(0, h + d);
        sp.style.height = h + 'px';
      }
    }
  }

  function renderPreview() {
    if (!S.doc) return;
    var r = RB.render(S.doc, { watermark: C.freeWatermark && !S.pro });
    var pg = RB.PAGE[r.pageSize];
    var pageH = pg.hmm * RB.MM, pageW = pg.wmm * RB.MM;
    var m = $('#measure');
    m.innerHTML = '<div class="' + r.cls + '" style="' + r.style + '">' + r.html + '</div>';
    var sheet = m.firstElementChild;
    var pad = r.marginMM.y * RB.MM;
    paginate(sheet, pageH, pad, pad);
    var h = sheet.querySelector('.r-page').offsetHeight;
    var n = Math.max(1, Math.ceil((h - 2) / pageH));
    sheet.style.height = (n * pg.hmm) + 'mm';
    S.pages = n;
    S.render = { r: r, n: n, pg: pg, pageW: pageW, pageH: pageH };

    var inner = sheet.innerHTML, out = '';
    for (var k = 0; k < n; k++) {
      out += '<div class="page" style="width:' + pg.wmm + 'mm;height:' + pg.hmm + 'mm"><div class="' + r.cls + '" style="' + r.style +
        ';height:' + (n * pg.hmm) + 'mm;top:-' + (k * pg.hmm) + 'mm">' + inner + '</div></div>';
    }
    $('#pages').innerHTML = out;
    layoutZoom();
    updateScore();
  }

  function layoutZoom() {
    var R = S.render; if (!R) return;
    var scroll = $('#previewScroll');
    var gap = parseFloat(getComputedStyle($('#pages')).rowGap) || 28;
    var W = R.pageW, H = R.n * R.pageH + (R.n - 1) * gap;
    var s;
    if (S.ui.zoom === 'fit') {
      var cs = getComputedStyle(scroll);
      var avail = scroll.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      s = avail > 0 ? Math.min(avail / W, 1) : 1;
      s = Math.max(s, 0.2);
    } else s = S.ui.zoom;
    S.scale = s;
    $('#pages').style.transform = 'scale(' + s + ')';
    var f = $('#pagesFrame');
    f.style.width = (W * s) + 'px';
    f.style.height = (H * s) + 'px';
    renderZoombar();
  }

  function renderZoombar() {
    var n = S.pages;
    $('#zoombar').innerHTML =
      '<button class="icon-btn" data-act="zoom-out" title="Zoom out">' + I('zoomOut') + '</button>' +
      '<button class="zl" data-act="zoom-fit" title="Fit to width">' + Math.round(S.scale * 100) + '%</button>' +
      '<button class="icon-btn" data-act="zoom-in" title="Zoom in">' + I('zoomIn') + '</button>' +
      '<span class="div"></span>' +
      '<span class="pc' + (n > 2 ? ' warn' : '') + '">' + (n > 2 ? I('alert') : '') + n + ' page' + (n > 1 ? 's' : '') + ' · ' + RB.PAGE[S.render.r.pageSize].label + '</span>';
  }

  function updateScore() {
    var rv = RB.review(S.doc, S.pages);
    S.lastReview = rv;
    var cls = rv.score >= 75 ? 'good' : rv.score >= 55 ? 'mid' : 'low';
    var pill = $('#scorePill');
    if (pill) { pill.textContent = rv.score; pill.className = 'score-pill ' + cls; }
    var ms = $('#mScore');
    if (ms) { ms.textContent = rv.score; ms.className = 'mscore ' + cls; }
    if (S.ui.tab === 'review' && !$('#tab-review').contains(document.activeElement)) renderReview();
  }

  /* ---------------------------------------------------------------------
     Topbar / nav
     --------------------------------------------------------------------- */
  function renderTopbar() {
    $('#brandName').textContent = C.brand;
    $('#docName').textContent = S.doc.name;
    $('#tplBtn').innerHTML = I('layout') + '<span>Templates</span>';
    $('#tplBtn').setAttribute('data-act', 'open-gallery');
    $('#exportBtn').innerHTML = I('file') + '<span class="hide-sm">Export</span>';
    $('#exportBtn').setAttribute('data-act', 'menu-export');
    $('#docBtn').setAttribute('data-act', 'menu-doc');
    $('#downloadBtn').innerHTML = I('download') + '<span>Download PDF</span>';
    $('#downloadBtn').setAttribute('data-act', 'download-pdf');
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $('#themeBtn').innerHTML = I(dark ? 'sun' : 'moon');
    $('#themeBtn').setAttribute('data-act', 'theme');
    $('#proSlot').innerHTML = S.pro
      ? '<span class="pro-chip" title="' + esc(C.brand) + ' Pro is active">' + I('crown') + '<span class="hide-sm">PRO</span></span>'
      : '<button class="btn pro" data-act="upgrade">' + I('crown') + '<span class="hide-sm">Go Pro</span></button>';
    document.title = C.brand + ' — ' + C.tagline;
  }

  function renderTabs() {
    var tabs = [['content', 'Content', 'pen'], ['design', 'Design', 'palette'], ['review', 'Review', 'target']];
    $('#panelTabs').innerHTML = tabs.map(function (t) {
      return '<button role="tab" data-act="tab" data-tab="' + t[0] + '" class="' + (S.ui.tab === t[0] ? 'active' : '') + '" aria-selected="' + (S.ui.tab === t[0]) + '">' +
        I(t[2]) + t[1] + (t[0] === 'review' ? ' <span class="score-pill" id="scorePill">–</span>' : '') + '</button>';
    }).join('');
    var m = [['content', 'Content', 'pen'], ['design', 'Design', 'palette'], ['review', 'Score', 'target'], ['preview', 'Preview', 'eye']];
    $('#mnav').innerHTML = m.map(function (t) {
      return '<button data-act="mview" data-v="' + t[0] + '" class="' + (S.ui.mview === t[0] ? 'active' : '') + '">' + I(t[2]) + t[1] +
        (t[0] === 'review' ? '<span class="mscore" id="mScore">–</span>' : '') + '</button>';
    }).join('');
  }

  function setTab(tab) {
    S.ui.tab = tab;
    ['content', 'design', 'review'].forEach(function (t) { $('#tab-' + t).hidden = t !== tab; });
    $$('#panelTabs button').forEach(function (b) { var on = b.getAttribute('data-tab') === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    if (tab === 'design') renderDesign();
    if (tab === 'review') renderReview();
    if (tab === 'content') autosizeAll();
    $('#panelBody').scrollTop = 0;
    updateScore();
  }

  function setMView(v) {
    S.ui.mview = v;
    $('#app').setAttribute('data-mview', v);
    $$('#mnav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-v') === v); });
    if (v === 'preview') { S.ui.zoom = 'fit'; requestAnimationFrame(layoutZoom); }
    else setTab(v);
  }

  /* ---------------------------------------------------------------------
     Content tab
     --------------------------------------------------------------------- */
  var VERBS = ['Led', 'Built', 'Launched', 'Reduced', 'Increased', 'Delivered', 'Automated', 'Mentored'];

  function renderContent() {
    var d = S.doc, h = '';
    if (d.isSample) {
      h += '<div class="banner">' + I('sparkles') + '<div><b>You\'re editing a sample resume</b>Replace it with your details — or start from a clean slate. Everything saves automatically in this browser.' +
        '<div class="row"><button class="btn primary sm" data-act="start-blank">Start blank</button><button class="btn sm" data-act="keep-sample">Keep &amp; edit sample</button></div></div></div>';
    }
    h += basicsCard();
    h += d.sections.map(function (s, i) { return secCard(s, i); }).join('');
    h += '<div class="add-sec-wrap menu-wrap"><button class="add-btn add-sec" data-act="menu-addsec">' + I('plus') + ' Add section</button><div class="menu left" id="addSecMenu"></div></div>';
    $('#tab-content').innerHTML = h;
    autosizeAll();
  }

  function basicsCard() {
    var b = S.doc.basics, open = S.ui.basicsOpen;
    function f(k, label, ph, type, mode, ac) {
      return '<div class="field"><label for="b-' + k + '">' + label + '</label><input id="b-' + k + '" type="' + (type || 'text') + '"' +
        (mode ? ' inputmode="' + mode + '"' : '') + ' autocomplete="' + (ac || 'off') + '" data-bind="basics.' + k + '" value="' + esc(b[k]) + '" placeholder="' + esc(ph) + '"></div>';
    }
    var tpl = RB.tpl(S.doc.design.template);
    return '<div class="card' + (open ? ' open' : '') + '" data-card="basics">' +
      '<div class="card-head"><button class="card-toggle" data-act="toggle-basics"><span class="card-icon">' + I('user') + '</span><span class="card-title">Personal details</span>' + I('chevronDown', 'card-chev') + '</button></div>' +
      '<div class="card-body">' +
        '<div class="photo-row"><div class="photo-av">' + (b.photo ? '<img src="' + esc(b.photo) + '" alt="">' : I('image')) + '</div>' +
          '<div class="txt"><b>Profile photo <small style="font-weight:500;color:var(--text-3)">optional</small></b>' +
          (tpl.photo ? 'Shown on this template.' : 'Shown on Sidebar, Bold, Elegant &amp; Studio.') + ' Skip for US/UK/Canada roles.</div>' +
          '<div class="acts"><button class="btn sm" data-act="photo-upload">' + I('upload') + (b.photo ? 'Change' : 'Upload') + '</button>' +
          (b.photo ? '<button class="icon-btn sm danger" data-act="photo-remove" title="Remove photo">' + I('trash') + '</button>' : '') + '</div></div>' +
        '<div class="fgrid">' +
          f('name', 'Full name', 'Aarav Mehta', 'text', '', 'name') +
          f('title', 'Target job title', 'Senior Software Engineer', 'text', '', 'organization-title') +
          f('email', 'Email', 'you@email.com', 'email', 'email', 'email') +
          f('phone', 'Phone', '+91 98765 43210', 'tel', 'tel', 'tel') +
          f('location', 'Location', 'Bengaluru, India') +
          f('website', 'Website / Portfolio', 'yourname.com', 'text', 'url') +
          f('linkedin', 'LinkedIn', 'linkedin.com/in/you', 'text', 'url') +
          f('github', 'GitHub', 'github.com/you', 'text', 'url') +
        '</div></div></div>';
  }

  function secMeta(sec) {
    var def = RB.SECTION_TYPES[sec.type];
    if (!sec.visible) return 'Hidden';
    if (def.kind === 'items') { var n = sec.items.filter(U.hasContent).length; return n ? n + (n === 1 ? ' entry' : ' entries') : 'Empty'; }
    return String(sec.content || '').trim() ? '' : 'Empty';
  }

  function secCard(sec, idx) {
    var def = RB.SECTION_TYPES[sec.type];
    var open = !!S.ui.openSecs[sec.id];
    var last = S.doc.sections.length - 1;
    return '<div class="card' + (open ? ' open' : '') + (sec.visible ? '' : ' hidden-sec') + '" data-sid="' + sec.id + '">' +
      '<div class="card-head">' +
        '<button class="card-toggle" data-act="toggle-sec"><span class="card-icon">' + I(def.icon) + '</span><span class="card-title">' + esc(sec.title) + '</span>' +
        '<span class="card-meta">' + secMeta(sec) + '</span>' + I('chevronDown', 'card-chev') + '</button>' +
        '<div class="card-actions">' +
          '<button class="icon-btn sm" data-act="vis-sec" title="' + (sec.visible ? 'Hide from resume' : 'Show on resume') + '">' + I(sec.visible ? 'eye' : 'eyeOff') + '</button>' +
          '<button class="icon-btn sm" data-act="up-sec" title="Move up"' + (idx === 0 ? ' disabled' : '') + '>' + I('up') + '</button>' +
          '<button class="icon-btn sm" data-act="down-sec" title="Move down"' + (idx === last ? ' disabled' : '') + '>' + I('down') + '</button>' +
          '<button class="icon-btn sm danger" data-act="del-sec" title="Delete section">' + I('trash') + '</button>' +
        '</div></div>' +
      '<div class="card-body">' + (open ? secBody(sec) : '') + '</div></div>';
  }

  function counterCls(len, lo, hi) { return !len ? '' : len < lo || len > hi ? 'warn' : 'ok'; }

  function secBody(sec) {
    var def = RB.SECTION_TYPES[sec.type];
    var h = '<div class="sec-title-row"><div class="field"><label for="st-' + sec.id + '">Section heading</label><input id="st-' + sec.id + '" data-bind="sec.' + sec.id + '.title" value="' + esc(sec.title) + '"></div></div>';
    if (def.kind === 'text') {
      var len = String(sec.content || '').trim().length;
      h += '<div class="field"><label for="sc-' + sec.id + '">Professional summary <span class="counter ' + counterCls(len, 150, 750) + '" data-counter>' + len + ' / 750</span></label>' +
        '<textarea id="sc-' + sec.id + '" rows="5" data-autosize data-count="150-750" data-bind="sec.' + sec.id + '.content" placeholder="' + esc(def.ph) + '">' + esc(sec.content) + '</textarea>' +
        '<div class="hint">2–4 lines: who you are, years of experience, core skills and one measurable win. Use <b>**bold**</b> to highlight.</div></div>';
    } else if (def.kind === 'tags') {
      h += '<div class="field"><label for="sc-' + sec.id + '">Comma separated</label><input id="sc-' + sec.id + '" data-bind="sec.' + sec.id + '.content" value="' + esc(sec.content) + '" placeholder="' + esc(def.ph) + '"></div>';
    } else {
      h += '<div class="items">' + sec.items.map(function (it, i) { return itemHTML(sec, it, i); }).join('') + '</div>' +
        '<button class="add-btn" data-act="add-item">' + I('plus') + esc(def.add) + '</button>';
    }
    return h;
  }

  function itemHTML(sec, it, i) {
    var def = RB.SECTION_TYPES[sec.type];
    var open = !!S.ui.openItems[it.id];
    var sm = def.sum(it), empty = !U.hasContent(it);
    return '<div class="item' + (open ? ' open' : '') + '" data-iid="' + it.id + '">' +
      '<div class="item-head" data-act="toggle-item">' + I('chevronRight', 'item-chev') +
        '<div class="item-sum"><b class="' + (empty ? 'empty' : '') + '">' + esc(sm.t) + '</b><span>' + esc(sm.s) + '</span></div>' +
        '<div class="item-actions">' +
          '<button class="icon-btn sm" data-act="up-item" title="Move up"' + (i === 0 ? ' disabled' : '') + '>' + I('up') + '</button>' +
          '<button class="icon-btn sm" data-act="down-item" title="Move down"' + (i === sec.items.length - 1 ? ' disabled' : '') + '>' + I('down') + '</button>' +
          '<button class="icon-btn sm hide-sm" data-act="dup-item" title="Duplicate">' + I('copy') + '</button>' +
          '<button class="icon-btn sm danger" data-act="del-item" title="Delete">' + I('trash') + '</button>' +
        '</div></div>' +
      '<div class="item-body">' + (open ? itemFields(sec, it) : '') + '</div></div>';
  }

  function itemFields(sec, it) {
    var def = RB.SECTION_TYPES[sec.type];
    return '<div class="fgrid">' + def.fields.map(function (f) {
      var bind = 'item.' + sec.id + '.' + it.id + '.' + f.k, v = it[f.k] || '', id = 'f-' + it.id + '-' + f.k;
      var cls = 'field' + (f.full || f.type === 'bullets' || f.type === 'textarea' ? ' full' : '');
      if (f.type === 'bullets') {
        return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + ' <small>one per line</small></label>' +
          '<textarea id="' + id + '" class="bullets" data-autosize data-bind="' + bind + '" placeholder="' + esc(f.ph) + '">' + esc(v) + '</textarea>' +
          (sec.type === 'education' ? '' : '<div class="verb-row"><span class="hint">Start with:</span>' + VERBS.map(function (vb) { return '<button class="chip" data-act="verb" data-verb="' + vb + '">' + vb + '</button>'; }).join('') + '</div>') +
          '<div class="hint">Action verb → what you did → measurable result. <b>**bold**</b> for key numbers.</div></div>';
      }
      if (f.type === 'textarea') {
        return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + '</label><textarea id="' + id + '" rows="2" data-autosize data-bind="' + bind + '" placeholder="' + esc(f.ph) + '">' + esc(v) + '</textarea></div>';
      }
      if (f.type === 'select') {
        return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + '</label><select id="' + id + '" data-bind="' + bind + '"><option value="">Select…</option>' +
          f.options.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
      }
      return '<div class="' + cls + '"><label for="' + id + '">' + esc(f.label) + '</label><input id="' + id + '" data-bind="' + bind + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '"></div>';
    }).join('') + '</div>';
  }

  function findSec(id) { return S.doc.sections.find(function (s) { return s.id === id; }); }
  function findItem(sid, iid) { var s = findSec(sid); return s && s.items.find(function (i) { return i.id === iid; }); }

  function rerenderCard(sid) {
    var sec = findSec(sid), el = $('[data-sid="' + sid + '"]', $('#tab-content'));
    if (!sec || !el) return renderContent();
    var tmp = document.createElement('div');
    tmp.innerHTML = secCard(sec, S.doc.sections.indexOf(sec));
    el.replaceWith(tmp.firstElementChild);
    autosizeAll();
  }

  function autosize(t) {
    if (!t.offsetParent) return;
    t.style.height = 'auto';
    t.style.height = (t.scrollHeight + 2) + 'px';
  }
  function autosizeAll() { $$('textarea[data-autosize]', $('#panelBody')).forEach(autosize); }

  /* ---------------------------------------------------------------------
     Binding (inputs → state)
     --------------------------------------------------------------------- */
  function onBind(el) {
    var path = el.getAttribute('data-bind').split('.');
    var v = el.type === 'checkbox' ? el.checked : el.value;
    if (el.hasAttribute('data-num')) v = parseFloat(v);
    var kind = path[0];
    if (kind === 'basics') {
      S.doc.basics[path[1]] = v;
    } else if (kind === 'sec') {
      var sec = findSec(path[1]); if (!sec) return;
      sec[path[2]] = v;
      var card = el.closest('.card');
      if (path[2] === 'title' && card) $('.card-title', card).textContent = v || RB.SECTION_TYPES[sec.type].label;
      if (card) $('.card-meta', card).textContent = secMeta(sec);
    } else if (kind === 'item') {
      var s2 = findSec(path[1]), it = findItem(path[1], path[2]); if (!it) return;
      it[path[3]] = v;
      var item = el.closest('.item');
      if (item) {
        var sm = RB.SECTION_TYPES[s2.type].sum(it), bEl = $('.item-sum b', item);
        bEl.textContent = sm.t; bEl.classList.toggle('empty', !U.hasContent(it));
        $('.item-sum span', item).textContent = sm.s;
      }
      var c2 = el.closest('.card'); if (c2) $('.card-meta', c2).textContent = secMeta(s2);
    } else if (kind === 'design') {
      S.doc.design[path[1]] = v;
      var out = el.closest('.range-row') && $('output', el.closest('.range-row'));
      if (out) out.textContent = fmtRange(path[1], v);
      if (el.type === 'range') setRangeFill(el);
    }
    if (el.tagName === 'TEXTAREA' && el.hasAttribute('data-autosize')) autosize(el);
    if (el.hasAttribute('data-count')) {
      var lim = el.getAttribute('data-count').split('-').map(Number), len = el.value.trim().length;
      var cEl = $('[data-counter]', el.closest('.field'));
      if (cEl) { cEl.textContent = len + ' / ' + lim[1]; cEl.className = 'counter ' + counterCls(len, lim[0], lim[1]); }
    }
    touch();
  }

  function fmtRange(k, v) {
    if (k === 'fontSize') return v + ' pt';
    if (k === 'lineHeight') return Number(v).toFixed(2);
    if (k === 'margin') return v + ' mm';
    if (k === 'spacing') return Math.round(v * 100) + '%';
    return v;
  }
  function setRangeFill(el) {
    var p = (el.value - el.min) / (el.max - el.min) * 100;
    el.style.setProperty('--p', p + '%');
  }

  /* ---------------------------------------------------------------------
     Design tab
     --------------------------------------------------------------------- */
  function thumbHTML(tplId, data) {
    var r = RB.render(data || S.doc, { template: tplId });
    return '<div class="' + r.cls + '" style="' + r.style + '">' + r.html + '</div>';
  }
  function scaleThumbs(root) {
    $$('[data-thumb]', root).forEach(function (box) {
      var sh = box.querySelector('.sheet'); if (!sh) return;
      var w = box.clientWidth; if (!w) return;
      var sw = (sh.classList.contains('letter') ? 215.9 : 210) * RB.MM;
      sh.style.transform = 'scale(' + (w / sw) + ')';
      sh.style.transformOrigin = '0 0';
      sh.style.position = 'absolute'; sh.style.top = '0'; sh.style.left = '0';
    });
  }
  function thumbData() {
    var d = S.doc, bullets = 0;
    d.sections.forEach(function (s) { (s.items || []).forEach(function (i) { bullets += U.bulletsOf(i.bullets).length; }); });
    if (d.basics.name && bullets >= 3) return d;
    var smp = RB.sampleDoc(); smp.design = d.design; return smp;
  }

  function renderDesign() {
    var d = S.doc.design, tpl = RB.tpl(d.template), td = thumbData();
    var accent = d.accent || tpl.accent;
    var h = '';

    // Template
    h += '<div class="dblock"><h3>Template <button data-act="open-gallery">Browse all →</button></h3>' +
      '<div class="cur-tpl"><div class="mini" data-thumb style="position:relative;aspect-ratio:210/297">' + thumbHTML(tpl.id, td) + '</div>' +
      '<div class="info"><b>' + esc(tpl.name) + (tpl.pro ? ' <span class="badge pro">PRO</span>' : '') + '</b><p>' + esc(tpl.desc) + '</p>' +
      '<div class="tags-row" style="display:flex;gap:5px;flex-wrap:wrap">' + (tpl.ats ? '<span class="badge ok">' + I('check') + 'ATS-friendly</span>' : '<span class="badge soft">Best for creative roles</span>') +
      (tpl.layout === 'two' ? '<span class="badge soft">2 columns</span>' : '') + '</div></div></div>' +
      '<div class="tpl-strip">' + RB.TEMPLATES.map(function (t) {
        return '<button data-act="set-tpl" data-id="' + t.id + '" class="' + (t.id === tpl.id ? 'active' : '') + '" title="' + esc(t.name) + '" style="aspect-ratio:210/297" data-thumb>' +
          thumbHTML(t.id, td) + (t.pro && !S.pro ? '<span class="lock">' + I('crown') + '</span>' : '') + '</button>';
      }).join('') + '</div></div>';

    // Colour
    h += '<div class="dblock"><h3>Accent colour</h3><div class="swatches">' +
      '<button class="swatch auto' + (!d.accent ? ' active' : '') + '" data-act="set-accent" data-color="" title="Template default" style="--swatch:' + tpl.accent + '">Auto</button>' +
      RB.ACCENTS.map(function (c) {
        return '<button class="swatch' + (d.accent && d.accent.toLowerCase() === c ? ' active' : '') + '" data-act="set-accent" data-color="' + c + '" style="background:' + c + ';--swatch:' + c + '" title="' + c + '"></button>';
      }).join('') +
      '<label class="swatch custom' + (d.accent && RB.ACCENTS.indexOf(d.accent.toLowerCase()) < 0 ? ' active' : '') + '" title="Custom colour" style="--swatch:' + accent + '"><input type="color" id="customColor" value="' + esc(accent) + '"></label>' +
      '</div></div>';

    // Font
    h += '<div class="dblock"><h3>Font</h3><div class="font-list">' +
      '<button class="font-opt auto' + (!d.font ? ' active' : '') + '" data-act="set-font" data-font=""><span class="aa" style="font-family:' + RB.FONTS[tpl.font].head + '">Aa</span><span class="nm">Template default</span></button>' +
      Object.keys(RB.FONTS).map(function (k) {
        var f = RB.FONTS[k];
        return '<button class="font-opt' + (d.font === k ? ' active' : '') + '" data-act="set-font" data-font="' + k + '"><span class="aa" style="font-family:' + f.head + '">Aa</span><span class="nm">' + esc(f.label) + '</span></button>';
      }).join('') + '</div></div>';

    // Typography & layout
    function range(k, label, min, max, step) {
      return '<div class="range-row"><label class="lbl" for="rg-' + k + '">' + label + '</label><output>' + fmtRange(k, d[k]) + '</output>' +
        '<input type="range" id="rg-' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + d[k] + '" data-bind="design.' + k + '" data-num></div>';
    }
    h += '<div class="dblock"><h3>Typography &amp; spacing</h3>' +
      range('fontSize', 'Font size', 8.5, 12, 0.25) + range('lineHeight', 'Line spacing', 1.15, 1.75, 0.05) +
      range('margin', 'Page margins', 8, 25, 1) + range('spacing', 'Section spacing', 0.6, 1.6, 0.05) + '</div>';

    // Details
    var icons = d.icons == null ? tpl.icons : d.icons;
    h += '<div class="dblock"><h3>Details</h3>' +
      '<div class="opt-row"><div class="txt"><b>Page size</b><span>A4 worldwide · Letter for US/Canada</span></div><div class="seg">' +
        ['a4', 'letter'].map(function (p) { return '<button data-act="set-page" data-v="' + p + '" class="' + (d.pageSize === p ? 'active' : '') + '">' + RB.PAGE[p].label + '</button>'; }).join('') + '</div></div>' +
      '<div class="opt-row"><div class="txt"><b>Bullet style</b></div><div class="seg">' +
        Object.keys(RB.BULLETS).map(function (k) { return '<button data-act="set-bullet" data-v="' + k + '" class="' + (d.bullet === k ? 'active' : '') + '" title="' + k + '">' + (RB.BULLETS[k] || 'None') + '</button>'; }).join('') + '</div></div>' +
      '<div class="opt-row"><div class="txt"><b>Contact icons</b><span>Small icons beside email, phone and links</span></div><label class="switch"><input type="checkbox" data-bind="design.icons"' + (icons ? ' checked' : '') + '><span></span></label></div>' +
      '<div class="opt-row"><div class="txt"><b>Photo / monogram</b><span>' + (tpl.photo ? 'Shows your photo, or initials if none' : 'Not used by ' + esc(tpl.name)) + '</span></div><label class="switch"><input type="checkbox" data-bind="design.showPhoto"' + (d.showPhoto ? ' checked' : '') + (tpl.photo ? '' : ' disabled') + '><span></span></label></div>' +
      '</div>';

    // Smart fit
    h += '<div class="dblock"><div class="fit-card"><span class="ic-wrap">' + I('wand') + '</span><div class="txt"><b>Smart Fit' + (S.pro ? '' : ' <span class="badge pro">PRO</span>') + '</b>' +
      '<span>Auto-tunes size and spacing to fit one page.</span></div><button class="btn primary sm" data-act="smart-fit">Fit to 1 page</button></div>' +
      '<div style="margin-top:12px;text-align:center"><button class="btn ghost sm" data-act="reset-design">' + I('undo') + 'Reset design to template defaults</button></div></div>';

    $('#tab-design').innerHTML = h;
    $$('#tab-design input[type=range]').forEach(setRangeFill);
    var cc = $('#customColor');
    cc.addEventListener('input', function () { S.doc.design.accent = cc.value; cc.parentNode.style.setProperty('--swatch', cc.value); touch(); });
    cc.addEventListener('change', function () { renderDesign(); });
    requestAnimationFrame(function () { scaleThumbs($('#tab-design')); });
  }

  /* ---------------------------------------------------------------------
     Review tab
     --------------------------------------------------------------------- */
  function renderReview() {
    var rv = RB.review(S.doc, S.pages);
    var col = rv.score >= 75 ? 'var(--ok)' : rv.score >= 55 ? 'var(--warn)' : 'var(--bad)';
    var R = 40, Cf = 2 * Math.PI * R;
    var checks = rv.checks.slice().sort(function (a, b) { return (a.ok - b.ok) || (b.w - a.w); });
    var h = '<div class="score-card"><div class="ring"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="' + R + '"/>' +
      '<circle class="fg" cx="50" cy="50" r="' + R + '" stroke="' + col + '" stroke-dasharray="' + Cf + '" stroke-dashoffset="' + (Cf * (1 - rv.score / 100)) + '"/></svg>' +
      '<div class="val"><div>' + rv.score + '<small>/ 100</small></div></div></div>' +
      '<div><h3>' + RB.scoreLabel(rv.score) + '</h3><p>' + rv.passed + ' of ' + rv.checks.length + ' recruiter &amp; ATS checks passed. Fix the items below to raise your score.</p></div></div>';

    h += '<div class="checks">' + checks.map(function (c) {
      return '<div class="check ' + (c.ok ? 'ok' : 'bad') + '"><span class="st">' + I(c.ok ? 'check' : 'alert') + '</span><div class="txt"><b>' + esc(c.title) + '</b><span>' + esc(c.tip) + '</span></div>' +
        (!c.ok && c.jump ? '<button class="btn sm fix" data-act="jump" data-jump="' + esc(c.jump) + '">Fix</button>' : '') + '</div>';
    }).join('') + '</div>';

    var jd = S.doc.jd || '';
    h += '<div class="rv-h"><h3>' + I('target') + 'Job match' + (S.pro ? '' : ' <span class="badge pro">PRO</span>') + '</h3></div>' +
      '<div class="jm-card"><div class="hint">Paste the job description you\'re applying to. We\'ll find the keywords recruiters and ATS filters look for — and which ones your resume is missing.</div>' +
      '<textarea class="input" id="jdInput" placeholder="Paste the full job description here…">' + esc(jd) + '</textarea>' +
      '<button class="btn primary block" data-act="analyze-jd">' + I('sparkles') + 'Analyze match</button><div class="jm-res" id="jmRes"></div></div>';

    h += '<div class="rv-h"><h3>' + I('info') + 'What recruiters look for</h3></div><ul class="tips">' +
      '<li><b>The 6-second scan.</b> Put your strongest, most recent wins at the top of each role.</li>' +
      '<li><b>Numbers beat adjectives.</b> “Cut churn 18%” beats “excellent retention skills”.</li>' +
      '<li><b>Mirror the job post.</b> Use the exact tool and skill names from the description.</li>' +
      '<li><b>One page</b> under ~8 years of experience; two pages max after that.</li>' +
      '<li><b>Submit a text PDF.</b> Download PDF here creates selectable text that ATS can parse.</li>' +
      '<li><b>Tailor every application.</b> Duplicate this resume per role from the resume menu.</li></ul>';

    $('#tab-review').innerHTML = h;
    $('#jdInput').addEventListener('input', function (e) { S.doc.jd = e.target.value; touch({ preview: false }); });
    if (S.ui.jm) renderJM();
  }

  function renderJM() {
    var r = S.ui.jm, el = $('#jmRes'); if (!el || !r) return;
    if (!r.total) { el.innerHTML = '<div class="hint">Paste a longer job description to analyze.</div>'; return; }
    var col = r.pct >= 70 ? 'var(--ok)' : r.pct >= 45 ? 'var(--warn)' : 'var(--bad)';
    var FREE = 3, miss = r.missing;
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px">' + r.pct + '% keyword match</b><span class="hint">' + r.matched.length + ' of ' + r.total + ' keywords</span></div>' +
      '<div class="jm-bar"><i style="width:' + r.pct + '%;background:' + col + '"></i></div>';
    if (miss.length) {
      h += '<div class="lbl">Missing — add these where truthful</div><div class="kw miss">' +
        miss.map(function (k, i) { return '<span class="' + (!S.pro && i >= FREE ? 'blur' : '') + '">' + esc(!S.pro && i >= FREE ? 'keyword' : k) + '</span>'; }).join('') + '</div>';
      if (!S.pro && miss.length > FREE) h += '<div class="kw-lock">' + I('lock') + '<span>' + (miss.length - FREE) + ' more missing keywords</span><button class="btn pro sm" data-act="upgrade" data-reason="jobmatch">Unlock</button></div>';
    }
    if (r.matched.length) h += '<div class="lbl" style="margin-top:12px">Already on your resume</div><div class="kw hit">' + r.matched.map(function (k) { return '<span>' + esc(k) + '</span>'; }).join('') + '</div>';
    el.innerHTML = h;
  }

  /* ---------------------------------------------------------------------
     Menus
     --------------------------------------------------------------------- */
  var openMenuEl = null, backdrop = null;
  function closeMenus() {
    if (openMenuEl) openMenuEl.classList.remove('open');
    $('.topbar').style.zIndex = '';
    openMenuEl = null;
    if (backdrop) { backdrop.remove(); backdrop = null; }
  }
  function toggleMenu(menuEl, html) {
    if (openMenuEl === menuEl) { closeMenus(); return; }
    closeMenus();
    menuEl.innerHTML = html;
    menuEl.classList.add('open');
    openMenuEl = menuEl;
    if (isMobile()) {
      backdrop = document.createElement('div');
      backdrop.className = 'overlay';
      backdrop.style.zIndex = 40;
      backdrop.addEventListener('click', closeMenus);
      document.body.appendChild(backdrop);
      menuEl.style.zIndex = 60;
      if (menuEl.closest('.topbar')) $('.topbar').style.zIndex = 60;
    } else if (!menuEl.closest('.topbar')) {
      requestAnimationFrame(function () { menuEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    }
  }

  function ago(t) {
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  function docMenuHTML() {
    var list = S.index.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    return '<div class="menu-label">My resumes (' + list.length + (S.pro ? '' : ' of ' + C.freeResumeLimit + ' free') + ')</div>' +
      list.map(function (e) {
        var cur = e.id === S.doc.id;
        return '<button class="menu-item' + (cur ? ' current' : '') + '" data-act="open-doc" data-id="' + e.id + '">' + I('file') +
          '<span class="grow"><b>' + esc(e.name) + '</b><span class="sub">Edited ' + ago(cur ? S.doc.updatedAt : e.updatedAt) + '</span></span>' + (cur ? I('check') : '') + '</button>';
      }).join('') +
      '<div class="menu-sep"></div>' +
      '<button class="menu-item" data-act="new-doc">' + I('plus') + 'New resume</button>' +
      '<button class="menu-item" data-act="dup-doc">' + I('copy') + '<span class="grow"><b style="font-weight:500">Duplicate</b><span class="sub">Tailor a copy for another job</span></span></button>' +
      '<button class="menu-item" data-act="rename-doc">' + I('pen') + 'Rename</button>' +
      '<button class="menu-item danger" data-act="del-doc">' + I('trash') + 'Delete this resume</button>' +
      (isMobile() ? '<div class="menu-sep"></div><button class="menu-item" data-act="theme">' + I('moon') + 'Toggle dark mode</button>' : '');
  }

  function exportMenuHTML() {
    return '<button class="menu-item" data-act="download-pdf">' + I('printer') + '<span class="grow"><b>Download PDF</b><span class="sub">Real text PDF — readable by ATS</span></span></button>' +
      '<button class="menu-item" data-act="dl-txt">' + I('text') + '<span class="grow"><b>Plain text (.txt)</b><span class="sub">For pasting into application forms</span></span></button>' +
      '<button class="menu-item" data-act="copy-txt">' + I('copy') + '<span class="grow"><b>Copy as text</b><span class="sub">Copy the whole resume to clipboard</span></span></button>' +
      '<div class="menu-sep"></div>' +
      '<button class="menu-item" data-act="dl-json">' + I('download') + '<span class="grow"><b>Backup (.json)</b><span class="sub">Save to move between devices</span></span></button>' +
      '<button class="menu-item" data-act="import-json">' + I('upload') + '<span class="grow"><b>Import backup</b><span class="sub">Restore a .json backup</span></span></button>';
  }

  function addSecMenuHTML() {
    var present = {}; S.doc.sections.forEach(function (s) { present[s.type] = 1; });
    var types = Object.keys(RB.SECTION_TYPES).filter(function (t) { return !RB.SECTION_TYPES[t].single || !present[t]; });
    return '<div class="menu-label">Add a section</div><div class="menu-grid">' + types.map(function (t) {
      var def = RB.SECTION_TYPES[t];
      return '<button class="menu-item" data-act="add-sec" data-type="' + t + '">' + I(def.icon) + esc(def.label) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------------
     Modals & toasts
     --------------------------------------------------------------------- */
  function modal(opts) {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = '<div class="modal ' + (opts.cls || '') + '" role="dialog" aria-modal="true">' + opts.html + '</div>';
    $('#modalRoot').appendChild(ov);
    var prev = document.activeElement;
    function onKey(e) { if (e.key === 'Escape' && ov === $('#modalRoot').lastElementChild) close(); }
    function close() {
      if (!ov.parentNode) return;
      ov.remove();
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
      if (prev && prev.focus) try { prev.focus(); } catch (e) { /* ignore */ }
    }
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    ov.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    if (opts.onOpen) opts.onOpen(ov, close);
    var f = $('[autofocus]', ov) || $('.modal input:not([type=checkbox]), .modal textarea', ov);
    if (f && !isMobile()) setTimeout(function () { f.focus(); if (f.select) f.select(); }, 30);
    return { el: ov, close: close };
  }

  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      var done = false;
      modal({
        html: '<div class="modal-head"><div class="grow"><h2>' + esc(title) + '</h2></div></div><div class="modal-body"><p style="margin:0;color:var(--text-2)">' + text + '</p></div>' +
          '<div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn ' + (danger ? 'primary' : 'primary') + '" data-ok' + (danger ? ' style="background:var(--bad);border-color:var(--bad)"' : '') + '>' + esc(okLabel || 'OK') + '</button></div>',
        onOpen: function (ov, close) { $('[data-ok]', ov).addEventListener('click', function () { done = true; close(); res(true); }); },
        onClose: function () { if (!done) res(false); }
      });
    });
  }

  function askText(title, value, label, okLabel) {
    return new Promise(function (res) {
      var done = false;
      modal({
        html: '<div class="modal-head"><div class="grow"><h2>' + esc(title) + '</h2></div><button class="icon-btn" data-close>' + I('x') + '</button></div>' +
          '<div class="modal-body"><div class="field"><label>' + esc(label || 'Name') + '</label><input class="input" id="askIn" value="' + esc(value || '') + '" autofocus></div></div>' +
          '<div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>' + esc(okLabel || 'Save') + '</button></div>',
        onOpen: function (ov, close) {
          var go = function () { var v = $('#askIn', ov).value.trim(); if (!v) return; done = true; close(); res(v); };
          $('[data-ok]', ov).addEventListener('click', go);
          $('#askIn', ov).addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
        },
        onClose: function () { if (!done) res(null); }
      });
    });
  }

  function toast(msg, action, fn, ms) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = I('check') + '<span>' + esc(msg) + '</span>' + (action ? '<button>' + esc(action) + '</button>' : '');
    $('#toasts').appendChild(t);
    var kill = function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 220); };
    if (action) $('button', t).addEventListener('click', function () { fn(); kill(); });
    setTimeout(kill, ms || (action ? 6000 : 2600));
  }

  function withUndo(msg, mutate) {
    var snap = JSON.stringify(S.doc);
    mutate();
    touch();
    renderContent();
    toast(msg, 'Undo', function () { S.doc = normalize(JSON.parse(snap)); touch(); renderContent(); if (S.ui.tab === 'design') renderDesign(); });
  }

  /* ---- template gallery ------------------------------------------------ */
  var galleryRO = null;
  function openGallery() {
    var filters = [['all', 'All templates'], ['ats', 'ATS-friendly'], ['one', 'Single column'], ['two', 'Two column'], ['photo', 'With photo'], ['free', 'Free']];
    modal({
      cls: 'wide',
      html: '<div class="modal-head"><div class="grow"><h2>Choose a template</h2><p>Every template is fully customisable — colours, fonts, spacing and sections. Switch anytime; your content stays.</p></div><button class="icon-btn" data-close>' + I('x') + '</button></div>' +
        '<div class="filters">' + filters.map(function (f) { return '<button class="chip' + (S.ui.filter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
        '<div class="modal-body"><div class="tpl-grid" id="tplGrid"></div></div>',
      onOpen: function (ov, close) {
        var grid = $('#tplGrid', ov), td = thumbData();
        function draw() {
          var cur = S.doc.design.template, f = S.ui.filter;
          var list = RB.TEMPLATES.filter(function (t) {
            return f === 'all' || (f === 'ats' && t.ats) || (f === 'one' && t.layout === 'one') || (f === 'two' && t.layout === 'two') || (f === 'photo' && t.photo) || (f === 'free' && !t.pro);
          });
          grid.innerHTML = list.map(function (t) {
            return '<button class="tpl-card' + (t.id === cur ? ' active' : '') + '" data-tpl="' + t.id + '"><div class="tpl-thumb" data-thumb>' + thumbHTML(t.id, td) +
              (t.id === cur ? '<span class="badge ok current-tag">' + I('check') + 'Current</span>' : '') +
              '<span class="corner">' + (t.pro && !S.pro ? '<span class="badge pro">' + I('crown') + 'PRO</span>' : '') + '</span>' +
              '<span class="btn primary sm use">Use this template</span></div>' +
              '<div class="tpl-meta"><b>' + esc(t.name) + '</b><p>' + esc(t.desc) + '</p><div class="tags-row">' +
              (t.ats ? '<span class="badge ok">ATS-friendly</span>' : '') + (t.layout === 'two' ? '<span class="badge soft">2 columns</span>' : '') + (t.photo ? '<span class="badge soft">Photo</span>' : '') +
              '</div></div></button>';
          }).join('');
          requestAnimationFrame(function () { scaleThumbs(grid); });
        }
        draw();
        $$('.filters .chip', ov).forEach(function (c) {
          c.addEventListener('click', function () {
            S.ui.filter = c.getAttribute('data-f');
            $$('.filters .chip', ov).forEach(function (x) { x.classList.toggle('active', x === c); });
            draw();
          });
        });
        grid.addEventListener('click', function (e) {
          var card = e.target.closest('[data-tpl]'); if (!card) return;
          setTemplate(card.getAttribute('data-tpl'));
          close();
        });
        galleryRO = new ResizeObserver(function () { scaleThumbs(grid); });
        galleryRO.observe(grid);
      },
      onClose: function () { if (galleryRO) galleryRO.disconnect(); galleryRO = null; }
    });
  }

  function setTemplate(id) {
    var t = RB.tpl(id);
    S.doc.design.template = id;
    touch();
    if (S.ui.tab === 'design') renderDesign();
    if (S.ui.tab === 'content') renderContent();
    if (t.pro && !S.pro) toast(t.name + ' is a Pro template — free to try, unlock to download', 'Unlock', function () { openUpgrade('template'); }, 5000);
    else toast('Switched to ' + t.name);
  }

  /* ---- upgrade --------------------------------------------------------- */
  function openUpgrade(reason) {
    var tpl = RB.tpl(S.doc.design.template);
    var sub = {
      template: '“' + tpl.name + '” is a Pro template. Unlock it — and everything else — to download.',
      smartfit: 'Smart Fit automatically tunes your layout to fit on one page.',
      jobmatch: 'See every keyword you\'re missing for the job you want.',
      resumes: 'The free plan includes ' + C.freeResumeLimit + ' resumes. Go Pro to tailor one for every application.'
    }[reason] || 'Stand out with premium templates and tools built to get you interviews.';
    var plan = (C.plans.find(function (p) { return p.best; }) || C.plans[0]).id;
    var freeAlt = reason === 'template';
    modal({
      cls: 'md',
      html: '<button class="icon-btn" data-close style="position:absolute;top:12px;right:12px;z-index:2">' + I('x') + '</button>' +
        '<div class="modal-body" style="padding:0"><div class="up-hero"><div class="crown">' + I('crown') + '</div><h2>Unlock ' + esc(C.brand) + ' Pro</h2><p>' + esc(sub) + '</p></div>' +
        '<div style="padding:4px 24px 22px"><ul class="up-feats">' +
          ['All 12 templates — 8 premium designs', 'Smart Fit to one page', 'Full job-description keyword match', 'Unlimited tailored resumes', 'Every future template, free', 'Priority support']
            .map(function (f) { return '<li>' + I('check') + f + '</li>'; }).join('') + '</ul>' +
          '<div class="plans">' + C.plans.map(function (p) {
            return '<button class="plan' + (p.id === plan ? ' active' : '') + '" data-plan="' + p.id + '">' + (p.best ? '<span class="badge pro best">BEST VALUE</span>' : '') +
              '<div class="nm">' + esc(p.name) + '</div><div class="pr">' + esc(C.currency) + p.price + ' <small>' + esc(p.period) + '</small></div><div class="nt">' + esc(p.note) + '</div></button>';
          }).join('') + '</div>' +
          '<button class="btn pro lg block" style="margin-top:14px" data-pay>Continue</button>' +
          '<div id="upNotice"></div>' +
          '<div class="license"><input class="input" id="licIn" placeholder="Have a license key?"><button class="btn" data-lic>' + I('key') + 'Apply</button></div>' +
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px">' +
            (freeAlt ? '<button class="btn ghost sm" data-free>Use a free template instead</button>' : '') +
            (C.demoUnlock ? '<button class="btn ghost sm" data-demo>' + I('sparkles') + 'Unlock demo (dev mode)</button>' : '') +
          '</div>' +
          '<div class="fine">Secure checkout · Your resumes stay private in your browser</div>' +
        '</div></div>',
      onOpen: function (ov, close) {
        var payBtn = $('[data-pay]', ov);
        function label() { var p = C.plans.find(function (x) { return x.id === plan; }); payBtn.textContent = 'Continue — ' + C.currency + p.price + (p.id === 'monthly' ? ' / month' : ''); }
        label();
        $$('[data-plan]', ov).forEach(function (b) {
          b.addEventListener('click', function () { plan = b.getAttribute('data-plan'); $$('[data-plan]', ov).forEach(function (x) { x.classList.toggle('active', x === b); }); label(); });
        });
        var notice = function (msg, ok) { $('#upNotice', ov).innerHTML = '<div class="notice"' + (ok ? ' style="background:var(--ok-soft);color:var(--ok)"' : '') + '>' + msg + '</div>'; };
        payBtn.addEventListener('click', function () {
          var url = C.checkoutUrls[plan];
          if (url) { window.open(url, '_blank', 'noopener'); notice('Complete checkout in the new tab. Your license key will arrive by email — paste it below to activate.', true); }
          else notice('Payments aren\'t connected yet. Add your checkout links in <b>js/data.js → RB.config.checkoutUrls</b>.');
        });
        $('[data-lic]', ov).addEventListener('click', function () {
          var k = $('#licIn', ov).value;
          if (!k.trim()) return;
          C.verifyLicense(k).then(function (ok) { if (ok) { close(); setPro(true); } else notice('That license key isn\'t valid. Check for typos and try again.'); });
        });
        var fa = $('[data-free]', ov);
        if (fa) fa.addEventListener('click', function () { close(); S.ui.filter = 'free'; openGallery(); });
        var dm = $('[data-demo]', ov);
        if (dm) dm.addEventListener('click', function () { close(); setPro(true); });
      }
    });
  }

  function setPro(v) {
    S.pro = v;
    store.set('rb:pro', v);
    renderTopbar();
    if (S.ui.tab === 'design') renderDesign();
    if (S.ui.tab === 'review') renderReview();
    schedulePreview();
    if (v) toast('Pro unlocked — every template and tool is yours');
  }
  function needsPro() { return !S.pro && RB.tpl(S.doc.design.template).pro; }

  /* ---- new resume ------------------------------------------------------ */
  function canAddDoc() {
    if (S.pro || S.index.length < C.freeResumeLimit) return true;
    openUpgrade('resumes');
    return false;
  }
  function newDocModal() {
    if (!canAddDoc()) return;
    var mode = 'blank';
    modal({
      html: '<div class="modal-head"><div class="grow"><h2>New resume</h2><p>Tip: keep one resume per job type and tailor each.</p></div><button class="icon-btn" data-close>' + I('x') + '</button></div>' +
        '<div class="modal-body"><div class="field"><label>Resume name</label><input class="input" id="ndName" placeholder="e.g. Product Manager — Fintech" autofocus></div>' +
        '<div class="choice-grid">' +
          '<button class="choice active" data-m="blank">' + I('file') + '<b>Start blank</b><span>Empty sections ready to fill</span></button>' +
          '<button class="choice" data-m="copy">' + I('copy') + '<b>Copy current</b><span>Reuse “' + esc(S.doc.name) + '”</span></button>' +
          '<button class="choice" data-m="sample">' + I('sparkles') + '<b>From example</b><span>See a strong resume, then edit</span></button>' +
        '</div></div>' +
        '<div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>Create resume</button></div>',
      onOpen: function (ov, close) {
        $$('.choice', ov).forEach(function (c) { c.addEventListener('click', function () { mode = c.getAttribute('data-m'); $$('.choice', ov).forEach(function (x) { x.classList.toggle('active', x === c); }); }); });
        var go = function () {
          var name = $('#ndName', ov).value.trim();
          var d;
          if (mode === 'copy') { d = JSON.parse(JSON.stringify(S.doc)); d.id = RB.uid(); delete d.isSample; d.name = name || S.doc.name + ' (copy)'; }
          else if (mode === 'sample') { d = RB.sampleDoc(); if (name) d.name = name; }
          else { d = RB.blankDoc(name || 'Untitled resume'); d.design = Object.assign({}, S.doc.design); }
          d.updatedAt = Date.now();
          saveNow();
          addDoc(d); openDoc(d.id); refreshAll();
          close();
          toast('Created “' + d.name + '”');
        };
        $('[data-ok]', ov).addEventListener('click', go);
        $('#ndName', ov).addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      }
    });
  }

  /* ---- print / export -------------------------------------------------- */
  function fileBase() {
    var n = String(S.doc.basics.name || S.doc.name || 'Resume').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
    return (n || 'Resume') + '_Resume';
  }

  function preparePrint() {
    renderPreview();
    var R = S.render, pr = $('#printRoot');
    pr.innerHTML = '';
    if (needsPro()) {
      pr.innerHTML = '<div style="font:16px/1.5 Inter,sans-serif;padding:40mm 20mm;text-align:center;color:#111">' +
        '<h1 style="font-size:22px">' + esc(RB.tpl(S.doc.design.template).name) + ' is a Pro template</h1><p>Unlock ' + esc(C.brand) + ' Pro or switch to a free template to download your resume.</p></div>';
      $('#pageStyle').textContent = '@page { size: auto; margin: 0; }';
      return;
    }
    var clone = $('#measure').firstElementChild.cloneNode(true);
    pr.appendChild(clone);
    $('#pageStyle').textContent = '@page { size: ' + R.pg.wmm + 'mm ' + R.pg.hmm + 'mm; margin: 0; }' +
      '@media print { #printRoot .sheet { height: ' + (R.n * R.pg.hmm - 0.6).toFixed(2) + 'mm !important; min-height: 0 !important; } }';
  }

  function doPrint() {
    preparePrint();
    var t = document.title;
    document.title = fileBase();
    var restore = function () { document.title = t; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    setTimeout(function () { window.print(); setTimeout(restore, 4000); }, 60);
  }

  function downloadPDF() {
    closeMenus();
    if (needsPro()) { openUpgrade('template'); return; }
    if (store.get('rb:printHint', false)) { doPrint(); return; }
    modal({
      html: '<div class="modal-head"><div class="grow"><h2>Save your resume as PDF</h2><p>Takes 5 seconds — and creates a real text PDF that applicant tracking systems can read.</p></div><button class="icon-btn" data-close>' + I('x') + '</button></div>' +
        '<div class="modal-body"><ol class="print-steps">' +
          '<li>In the print dialog, set <b>Destination</b> to <b>Save as PDF</b>.</li>' +
          '<li>Keep <b>Margins: Default</b> and <b>Scale: 100%</b>. Turn on <b>Background graphics</b> if you see the option.</li>' +
          '<li>Click <b>Save</b>. On iPhone: tap <b>Share → Save to Files</b>.</li></ol>' +
          '<label class="checkline"><input type="checkbox" id="phSkip"> Don\'t show this again</label></div>' +
        '<div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>' + I('printer') + 'Open print dialog</button></div>',
      onOpen: function (ov, close) {
        $('[data-ok]', ov).addEventListener('click', function () {
          if ($('#phSkip', ov).checked) store.set('rb:printHint', true);
          close(); doPrint();
        });
      }
    });
  }

  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function importJSON(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(fr.result);
        var d = data && data.doc ? data.doc : data;
        if (!d || !d.basics || !Array.isArray(d.sections)) throw new Error('bad');
        if (!canAddDoc()) return;
        d.id = RB.uid(); delete d.isSample;
        d.name = (d.name || 'Imported resume');
        saveNow();
        addDoc(d); openDoc(d.id); refreshAll();
        toast('Imported “' + d.name + '”');
      } catch (e) { toast('That file isn\'t a valid ' + C.brand + ' backup'); }
    };
    fr.readAsText(file);
  }

  function handlePhoto(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var size = 400, c = document.createElement('canvas');
        c.width = c.height = size;
        var s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        S.doc.basics.photo = c.toDataURL('image/jpeg', 0.86);
        S.doc.design.showPhoto = true;
        touch(); renderContent();
        var t = RB.tpl(S.doc.design.template);
        toast(t.photo ? 'Photo added' : 'Photo saved — pick Sidebar, Bold, Elegant or Studio to show it');
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ---- smart fit ------------------------------------------------------- */
  function smartFit() {
    if (!S.pro) { openUpgrade('smartfit'); return; }
    var d = S.doc.design, orig = JSON.stringify(d);
    renderPreview();
    if (S.pages <= 1) { toast('Already fits on one page'); return; }
    var r2 = function (x) { return Math.round(x * 100) / 100; };
    var steps = [
      function () { if (d.spacing > 0.7) { d.spacing = r2(d.spacing - 0.1); return true; } },
      function () { if (d.lineHeight > 1.25) { d.lineHeight = r2(d.lineHeight - 0.05); return true; } },
      function () { if (d.margin > 10) { d.margin -= 1; return true; } },
      function () { if (d.fontSize > 9) { d.fontSize = r2(d.fontSize - 0.25); return true; } }
    ];
    var guard = 0, done = false;
    while (!done && guard++ < 40) {
      var changed = false;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i]()) { changed = true; renderPreview(); if (S.pages <= 1) { done = true; break; } }
      }
      if (!changed) break;
    }
    touch();
    renderDesign();
    var undo = function () { S.doc.design = JSON.parse(orig); touch(); renderDesign(); };
    if (S.pages <= 1) toast('Fitted to one page', 'Undo', undo);
    else toast('Still ' + S.pages + ' pages — trim older roles or bullets', 'Undo', undo, 7000);
  }

  /* ---------------------------------------------------------------------
     Actions (event delegation)
     --------------------------------------------------------------------- */
  function moveIn(arr, i, dir) {
    var j = i + dir; if (j < 0 || j >= arr.length) return false;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t; return true;
  }
  function ctx(el) {
    var card = el.closest('[data-sid]'), item = el.closest('[data-iid]');
    var sec = card ? findSec(card.getAttribute('data-sid')) : null;
    var it = sec && item ? sec.items.find(function (x) { return x.id === item.getAttribute('data-iid'); }) : null;
    return { sec: sec, it: it, card: card, item: item };
  }

  var ACTIONS = {
    'tab': function (el) { setTab(el.getAttribute('data-tab')); },
    'mview': function (el) { setMView(el.getAttribute('data-v')); },
    'zoom-in': function () { S.ui.zoom = Math.min(2, Math.round((S.scale + 0.1) * 10) / 10); layoutZoom(); },
    'zoom-out': function () { S.ui.zoom = Math.max(0.3, Math.round((S.scale - 0.1) * 10) / 10); layoutZoom(); },
    'zoom-fit': function () { S.ui.zoom = 'fit'; layoutZoom(); },
    'theme': function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('rb:theme', next); } catch (e) { /* ignore */ }
      closeMenus(); renderTopbar();
    },
    'upgrade': function (el) { closeMenus(); openUpgrade(el.getAttribute('data-reason') || 'generic'); },
    'open-gallery': function () { closeMenus(); openGallery(); },
    'download-pdf': downloadPDF,
    'menu-doc': function () { toggleMenu($('#docMenu'), docMenuHTML()); },
    'menu-export': function () { toggleMenu($('#exportMenu'), exportMenuHTML()); },
    'menu-addsec': function () { toggleMenu($('#addSecMenu'), addSecMenuHTML()); },

    'open-doc': function (el) {
      closeMenus();
      var id = el.getAttribute('data-id'); if (id === S.doc.id) return;
      saveNow(); if (openDoc(id)) refreshAll();
    },
    'new-doc': function () { closeMenus(); newDocModal(); },
    'dup-doc': function () {
      closeMenus(); if (!canAddDoc()) return;
      saveNow();
      var d = JSON.parse(JSON.stringify(S.doc)); d.id = RB.uid(); d.name = S.doc.name + ' (copy)'; delete d.isSample; d.updatedAt = Date.now();
      addDoc(d); openDoc(d.id); refreshAll(); toast('Duplicated — tailor this copy for your next application');
    },
    'rename-doc': function () {
      closeMenus();
      askText('Rename resume', S.doc.name, 'Resume name').then(function (v) { if (!v) return; S.doc.name = v; saveNow(); renderTopbar(); });
    },
    'del-doc': function () {
      closeMenus();
      confirmBox('Delete “' + S.doc.name + '”?', 'This permanently removes this resume from this browser. Export a backup first if you might need it.', 'Delete', true).then(function (ok) {
        if (!ok) return;
        var id = S.doc.id;
        store.del('rb:doc:' + id);
        S.index = S.index.filter(function (e) { return e.id !== id; });
        if (!S.index.length) addDoc(RB.blankDoc('My resume'));
        store.set('rb:index', S.index);
        openDoc(S.index.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; })[0].id);
        refreshAll(); toast('Resume deleted');
      });
    },

    'dl-txt': function () { closeMenus(); downloadFile(fileBase() + '.txt', RB.docText(S.doc), 'text/plain;charset=utf-8'); },
    'copy-txt': function () {
      closeMenus();
      var txt = RB.docText(S.doc);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Copied to clipboard'); }, function () { downloadFile(fileBase() + '.txt', txt, 'text/plain'); });
    },
    'dl-json': function () { closeMenus(); saveNow(); downloadFile(fileBase() + '.json', JSON.stringify({ app: 'resumeit', version: 1, doc: S.doc }, null, 2), 'application/json'); toast('Backup downloaded'); },
    'import-json': function () { closeMenus(); $('#importFile').click(); },

    'start-blank': function () {
      var keep = S.doc.design, id = S.doc.id;
      var d = RB.blankDoc('My resume'); d.id = id; d.design = keep;
      S.doc = d; S.ui.openSecs = {}; S.ui.openItems = {}; S.ui.basicsOpen = true;
      touch(); saveNow(); renderTopbar(); renderContent();
      var n = $('#b-name'); if (n && !isMobile()) n.focus();
    },
    'keep-sample': function () { delete S.doc.isSample; S.doc.name = 'My resume'; touch(); saveNow(); renderTopbar(); renderContent(); },

    'toggle-basics': function () { S.ui.basicsOpen = !S.ui.basicsOpen; $('[data-card="basics"]').classList.toggle('open', S.ui.basicsOpen); },
    'photo-upload': function () { $('#photoFile').click(); },
    'photo-remove': function () { S.doc.basics.photo = ''; touch(); renderContent(); },

    'toggle-sec': function (el) {
      var c = ctx(el); if (!c.sec) return;
      S.ui.openSecs[c.sec.id] = !S.ui.openSecs[c.sec.id];
      rerenderCard(c.sec.id);
    },
    'vis-sec': function (el) { var c = ctx(el); c.sec.visible = !c.sec.visible; touch(); rerenderCard(c.sec.id); },
    'up-sec': function (el) { var c = ctx(el), a = S.doc.sections; if (moveIn(a, a.indexOf(c.sec), -1)) { touch(); renderContent(); } },
    'down-sec': function (el) { var c = ctx(el), a = S.doc.sections; if (moveIn(a, a.indexOf(c.sec), 1)) { touch(); renderContent(); } },
    'del-sec': function (el) {
      var c = ctx(el);
      withUndo('Deleted “' + c.sec.title + '”', function () { S.doc.sections = S.doc.sections.filter(function (s) { return s !== c.sec; }); });
    },
    'add-sec': function (el) {
      closeMenus();
      var t = el.getAttribute('data-type');
      var s = RB.newSection(t);
      if (s.items) { var it = RB.newItem(t); s.items.push(it); S.ui.openItems[it.id] = true; }
      S.doc.sections.push(s);
      S.ui.openSecs[s.id] = true;
      touch(); renderContent();
      var card = $('[data-sid="' + s.id + '"]');
      if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    },

    'toggle-item': function (el) {
      var c = ctx(el); if (!c.it) return;
      var willOpen = !S.ui.openItems[c.it.id];
      c.sec.items.forEach(function (i) { delete S.ui.openItems[i.id]; });
      if (willOpen) S.ui.openItems[c.it.id] = true;
      rerenderCard(c.sec.id);
      if (willOpen) {
        var it = $('[data-iid="' + c.it.id + '"]');
        if (it) { var r = it.getBoundingClientRect(), pb = $('#panelBody').getBoundingClientRect(); if (r.top < pb.top || r.top > pb.bottom - 120) it.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      }
    },
    'up-item': function (el) { var c = ctx(el); if (moveIn(c.sec.items, c.sec.items.indexOf(c.it), -1)) { touch(); rerenderCard(c.sec.id); } },
    'down-item': function (el) { var c = ctx(el); if (moveIn(c.sec.items, c.sec.items.indexOf(c.it), 1)) { touch(); rerenderCard(c.sec.id); } },
    'dup-item': function (el) {
      var c = ctx(el), copy = Object.assign({}, c.it, { id: RB.uid() });
      c.sec.items.splice(c.sec.items.indexOf(c.it) + 1, 0, copy);
      c.sec.items.forEach(function (i) { delete S.ui.openItems[i.id]; });
      S.ui.openItems[copy.id] = true;
      touch(); rerenderCard(c.sec.id);
    },
    'del-item': function (el) {
      var c = ctx(el), sm = RB.SECTION_TYPES[c.sec.type].sum(c.it);
      if (!U.hasContent(c.it)) { c.sec.items.splice(c.sec.items.indexOf(c.it), 1); touch(); rerenderCard(c.sec.id); return; }
      withUndo('Deleted “' + sm.t + '”', function () { c.sec.items.splice(c.sec.items.indexOf(c.it), 1); });
    },
    'add-item': function (el) {
      var c = ctx(el), it = RB.newItem(c.sec.type);
      c.sec.items.forEach(function (i) { delete S.ui.openItems[i.id]; });
      c.sec.items.push(it);
      S.ui.openItems[it.id] = true;
      touch(); rerenderCard(c.sec.id);
      var f = $('[data-iid="' + it.id + '"] input, [data-iid="' + it.id + '"] select');
      if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (!isMobile()) f.focus({ preventScroll: true }); }
    },
    'verb': function (el) {
      var ta = $('textarea', el.closest('.field')); if (!ta) return;
      var v = el.getAttribute('data-verb') + ' ';
      var pos = ta.selectionStart != null && document.activeElement === ta ? ta.selectionStart : ta.value.length;
      var val = ta.value;
      var ls = val.lastIndexOf('\n', pos - 1) + 1;
      var le = val.indexOf('\n', pos); if (le < 0) le = val.length;
      var line = val.slice(ls, le);
      var insertAt, newVal;
      if (document.activeElement !== ta && line.trim()) { newVal = val + (val.endsWith('\n') || !val ? '' : '\n') + v; insertAt = newVal.length; }
      else { newVal = val.slice(0, ls) + v + line.replace(/^\s+/, '') + val.slice(le); insertAt = ls + v.length; }
      ta.value = newVal;
      ta.focus();
      ta.setSelectionRange(insertAt, insertAt);
      onBind(ta);
    },

    'set-tpl': function (el) { setTemplate(el.getAttribute('data-id')); },
    'set-accent': function (el) { S.doc.design.accent = el.getAttribute('data-color') || null; touch(); renderDesign(); },
    'set-font': function (el) { S.doc.design.font = el.getAttribute('data-font') || null; touch(); renderDesign(); },
    'set-page': function (el) { S.doc.design.pageSize = el.getAttribute('data-v'); touch(); renderDesign(); },
    'set-bullet': function (el) { S.doc.design.bullet = el.getAttribute('data-v'); touch(); renderDesign(); },
    'smart-fit': smartFit,
    'reset-design': function () {
      var orig = JSON.stringify(S.doc.design);
      S.doc.design = Object.assign({}, RB.DEFAULT_DESIGN, { template: S.doc.design.template, pageSize: S.doc.design.pageSize });
      touch(); renderDesign();
      toast('Design reset', 'Undo', function () { S.doc.design = JSON.parse(orig); touch(); renderDesign(); });
    },

    'jump': function (el) {
      var j = el.getAttribute('data-jump');
      if (j === 'design') { setTab('design'); if (isMobile()) setMView('design'); return; }
      if (isMobile()) setMView('content'); else setTab('content');
      var target;
      if (j === 'basics') { S.ui.basicsOpen = true; renderContent(); target = $('[data-card="basics"]'); }
      else { S.ui.openSecs[j] = true; renderContent(); target = $('[data-sid="' + j + '"]'); }
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var inp = $('.card-body input:not([type=checkbox]), .card-body textarea', target);
        var empty = $$('.card-body input, .card-body textarea', target).find(function (x) { return !x.value; });
        if (!isMobile()) setTimeout(function () { (empty || inp) && (empty || inp).focus({ preventScroll: true }); }, 350);
      }
    },
    'analyze-jd': function () {
      var jd = $('#jdInput').value;
      S.doc.jd = jd; touch({ preview: false });
      S.ui.jm = RB.jobMatch(S.doc, jd);
      renderJM();
    }
  };

  /* ---------------------------------------------------------------------
     Wiring
     --------------------------------------------------------------------- */
  function refreshAll() {
    renderTopbar();
    renderTabs();
    renderContent();
    setTab(S.ui.tab);
    if (isMobile()) setMView(S.ui.mview);
    renderPreview();
  }

  function wire() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (openMenuEl && !e.target.closest('.menu') && !(el && /^menu-/.test(el.getAttribute('data-act')))) closeMenus();
      if (!el || el.disabled) return;
      if (el.closest('.overlay') && !el.closest('.menu') && !/^(upgrade|jump)$/.test(el.getAttribute('data-act'))) return;
      var fn = ACTIONS[el.getAttribute('data-act')];
      if (fn) { e.preventDefault(); fn(el, e); }
    });

    var pb = $('#panelBody');
    pb.addEventListener('input', function (e) { if (e.target.hasAttribute('data-bind')) onBind(e.target); });
    pb.addEventListener('change', function (e) {
      var t = e.target;
      if (!t.hasAttribute('data-bind')) return;
      if (t.type === 'checkbox' || t.tagName === 'SELECT') onBind(t);
      if (t.type === 'checkbox' && t.getAttribute('data-bind').indexOf('design.') === 0) renderDesign();
    });
    pb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.classList.contains('item-head')) e.target.click();
    });

    $('#importFile').addEventListener('change', function (e) { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; });
    $('#photoFile').addEventListener('change', function (e) { handlePhoto(e.target.files[0]); e.target.value = ''; });

    document.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'p') { e.preventDefault(); downloadPDF(); }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow(); toast('Saved'); }
      if (e.key === 'Escape') closeMenus();
    });

    window.addEventListener('beforeprint', function () { if (!$('#printRoot').firstChild) preparePrint(); });
    window.addEventListener('afterprint', function () { setTimeout(function () { $('#printRoot').innerHTML = ''; }, 300); });
    window.addEventListener('beforeunload', saveNow);
    document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(); });

    var ro = new ResizeObserver(function () { layoutZoom(); });
    ro.observe($('#previewScroll'));
    var lastMobile = isMobile();
    window.addEventListener('resize', function () {
      var m = isMobile();
      if (m !== lastMobile) { lastMobile = m; closeMenus(); if (!m) { setTab(S.ui.tab === 'preview' ? 'content' : S.ui.tab); } else setMView(S.ui.tab); }
      if (S.ui.tab === 'design') scaleThumbs($('#tab-design'));
    });

    // Re-measure once web fonts arrive so pagination uses real glyph metrics.
    if (document.fonts) {
      document.fonts.ready.then(schedulePreview);
      document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', schedulePreview);
    }
  }

  function boot() {
    S.index = store.get('rb:index', []);
    S.index = S.index.filter(function (e) { return e && e.id && store.get('rb:doc:' + e.id, null); });
    var cur = store.get('rb:current', null);
    var migrated = false;
    if (!S.index.length) {
      var legacy = store.get('cvbuilder', null), doc;
      if (legacy && legacy.basics && String(legacy.basics.name || '').trim()) { doc = RB.migrateLegacy(legacy); migrated = true; }
      else doc = RB.sampleDoc();
      addDoc(doc);
      cur = doc.id;
    }
    if (!cur || !openDoc(cur)) openDoc(S.index[0].id);
    wire();
    refreshAll();
    if (migrated) toast('Imported your resume from the previous version');
  }

  boot();
})();

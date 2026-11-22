/* =========================================================================
   Resume review: ATS / recruiter checks, job-description keyword match,
   and plain-text export.
   ========================================================================= */
(function () {
  var RB = window.RB;
  var U = RB.util;

  var STRONG = ('accelerated achieved advised analyzed analysed architected audited authored automated boosted budgeted built ' +
    'championed coached collaborated conceived conducted consolidated converted coordinated created cut debugged decreased defined ' +
    'delivered deployed designed developed devised directed doubled drove earned eliminated enabled engineered enhanced established ' +
    'evaluated exceeded executed expanded facilitated forecasted formulated founded generated grew guided halved headed identified ' +
    'implemented improved increased influenced initiated innovated integrated introduced invented launched led lowered maintained managed ' +
    'maximized mentored migrated minimized modernized monitored negotiated optimized orchestrated organized overhauled oversaw owned ' +
    'partnered piloted pioneered planned presented prioritized produced programmed prototyped published raised rebuilt recruited redesigned ' +
    'reduced refactored reengineered remodeled reorganized resolved restructured revamped revitalized saved scaled secured shaped shipped ' +
    'simplified slashed solved spearheaded standardized steered streamlined strengthened supervised surpassed tested trained transformed ' +
    'translated tripled unified upgraded won wrote').split(' ');
  var STRONG_SET = {}; STRONG.forEach(function (w) { STRONG_SET[w] = 1; });
  var WEAK = ['responsible', 'worked', 'helped', 'assisted', 'involved', 'participated', 'tasked', 'duties', 'handled', 'did', 'was', 'were', 'in charge', 'various'];

  RB.STRONG_VERBS = STRONG;

  function allBullets(doc) {
    var out = [];
    (doc.sections || []).forEach(function (s) {
      if (!s.visible || !s.items) return;
      if (['experience', 'projects', 'volunteer', 'custom'].indexOf(s.type) < 0) return;
      s.items.forEach(function (i) { U.bulletsOf(i.bullets).forEach(function (b) { out.push(b.replace(/\*/g, '')); }); });
    });
    return out;
  }
  function sec(doc, type) {
    return (doc.sections || []).find(function (s) { return s.type === type && s.visible; });
  }
  function filledItems(s) { return s && s.items ? s.items.filter(U.hasContent) : []; }

  RB.review = function (doc, pages) {
    var b = doc.basics || {};
    var checks = [];
    function add(id, ok, w, title, tip, jump) { checks.push({ id: id, ok: !!ok, w: w, title: title, tip: tip, jump: jump }); }

    var contactMissing = ['name', 'email', 'phone', 'location'].filter(function (k) { return !String(b[k] || '').trim(); });
    add('contact', !contactMissing.length, 10, 'Complete contact details',
      contactMissing.length ? 'Add your ' + contactMissing.join(', ') + '. Recruiters need an easy way to reach you.' : 'Name, email, phone and location are all present.', 'basics');

    add('links', b.linkedin || b.website || b.github, 5, 'Professional link',
      'Add a LinkedIn, portfolio or GitHub URL — most recruiters check one before calling.', 'basics');

    add('title', String(b.title || '').trim(), 5, 'Target job title',
      'Add a headline matching the role you want (e.g. “Senior Product Designer”). ATS systems match on it.', 'basics');

    var sum = sec(doc, 'summary'), sl = sum ? String(sum.content || '').trim().length : 0;
    add('summary', sl >= 150 && sl <= 750, 10, 'Strong summary',
      !sl ? 'Add a 2–4 line summary: who you are, years of experience, and your biggest proof point.'
          : sl < 150 ? 'Your summary is short (' + sl + ' chars). Aim for 150–750 characters with a measurable win.'
          : sl > 750 ? 'Your summary is long (' + sl + ' chars). Trim to under 750 — recruiters skim in seconds.'
          : 'Good length (' + sl + ' characters).', sum && sum.id);

    var exp = sec(doc, 'experience'), expItems = filledItems(exp);
    var undated = expItems.filter(function (i) { return !String(i.start || '').trim() && !String(i.end || '').trim(); }).length;
    add('experience', expItems.length && !undated, 10, 'Experience with dates',
      !expItems.length ? 'Add at least one position — internships and freelance work count.'
        : undated ? undated + ' position(s) are missing dates. Gaps without dates raise red flags.' : expItems.length + ' position(s), all dated.', exp && exp.id);

    var thin = expItems.filter(function (i) { var n = U.bulletsOf(i.bullets).length; return n < 2 || n > 7; }).length;
    add('bullets', expItems.length && !thin, 10, '2–7 achievements per role',
      !expItems.length ? 'Add positions with 2–7 bullet points each.'
        : thin ? thin + ' role(s) have fewer than 2 or more than 7 bullets. Aim for 3–5 focused achievements.' : 'Every role has a focused set of achievements.', exp && exp.id);

    var bullets = allBullets(doc);
    var quant = bullets.filter(function (x) { return /\d/.test(x); }).length;
    var qp = bullets.length ? Math.round(100 * quant / bullets.length) : 0;
    add('quantified', bullets.length && qp >= 40, 15, 'Quantified impact',
      !bullets.length ? 'Add achievements with numbers: %, ₹/$, time saved, users, team size.'
        : qp >= 40 ? qp + '% of bullets include numbers — great.' : 'Only ' + qp + '% of bullets include numbers. Add metrics to at least 40% (e.g. “cut load time 35%”).', exp && exp.id);

    var weakList = [];
    var strong = bullets.filter(function (x) {
      var first = x.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z-]/g, '');
      var low = x.trim().toLowerCase();
      if (WEAK.some(function (w) { return low.indexOf(w) === 0; })) { weakList.push(x); return false; }
      return STRONG_SET[first] || (/ed$/.test(first) && first.length > 4);
    }).length;
    var sp = bullets.length ? Math.round(100 * strong / bullets.length) : 0;
    add('verbs', bullets.length && sp >= 70, 10, 'Action verbs',
      !bullets.length ? 'Start each bullet with a strong verb like Led, Built, Reduced, Launched.'
        : sp >= 70 ? sp + '% of bullets open with a strong action verb.'
        : sp + '% of bullets start with a strong verb.' + (weakList.length ? ' Replace phrases like “' + weakList[0].split(/\s+/).slice(0, 3).join(' ') + '…” with Led, Built, Delivered.' : ' Try Led, Built, Reduced, Launched, Owned.'), exp && exp.id);

    var long = bullets.filter(function (x) { return x.length > 220; }).length;
    var short = bullets.filter(function (x) { return x.length < 25; }).length;
    add('length', bullets.length && !long && !short, 5, 'Scannable bullet length',
      long ? long + ' bullet(s) are over 220 characters. Split them — aim for 1–2 lines each.'
        : short ? short + ' bullet(s) are very short. Add context: what you did, how, and the result.' : 'Bullets are concise and scannable.', exp && exp.id);

    var text = RB.docText(doc).toLowerCase();
    var pron = /\b(i|me|my|myself)\b/.test(bullets.join(' ').toLowerCase() + ' ' + (sum ? String(sum.content || '').toLowerCase() : ''));
    add('pronouns', !pron, 5, 'No first-person pronouns',
      pron ? 'Remove “I”, “me” and “my” — resumes are written in implied first person.' : 'Written in clean, implied first person.', sum && sum.id);

    var sk = sec(doc, 'skills'), skCount = 0;
    filledItems(sk).forEach(function (i) { skCount += U.splitList(i.items).length; });
    add('skills', skCount >= 6, 5, 'Relevant skills',
      skCount >= 6 ? skCount + ' skills listed.' : 'List at least 6 hard skills (tools, languages, methods) — ATS filters on them.', sk && sk.id);

    var edu = sec(doc, 'education');
    add('education', filledItems(edu).length, 5, 'Education',
      'Add your highest degree or relevant certification.', edu && edu.id);

    add('pages', pages <= 2, 5, 'Length: 1–2 pages',
      pages <= 2 ? 'Your resume is ' + pages + ' page' + (pages > 1 ? 's' : '') + '.' : 'Your resume is ' + pages + ' pages. Recruiters expect 1–2 — use Smart Fit or trim older roles.', 'design');

    var total = 0, got = 0;
    checks.forEach(function (c) { total += c.w; if (c.ok) got += c.w; });
    var score = Math.round(100 * got / total);
    void text;
    return { score: score, checks: checks, passed: checks.filter(function (c) { return c.ok; }).length };
  };

  RB.scoreLabel = function (s) {
    if (s >= 90) return 'Interview-ready';
    if (s >= 75) return 'Strong';
    if (s >= 55) return 'Getting there';
    return 'Needs work';
  };

  /* ---- job description keyword match ---------------------------------- */
  var STOP = ('a about above across after again against all also am an and any are as at be because been before being below between ' +
    'both but by can could did do does doing down during each either etc few for from further had has have having he her here hers ' +
    'him his how i if in into is it its itself just like may me might more most must my no nor not now of off on once only or other ' +
    'our ours out over own per same she should so some such than that the their theirs them then there these they this those through ' +
    'to too under until up upon us very via was we were what when where which while who whom why will with within without would you ' +
    'your yours ability able candidate candidates company experience experiences experienced job jobs role roles team teams work working ' +
    'works years year strong skills skill knowledge understanding including include includes requirements required requirement preferred ' +
    'plus responsibilities responsible looking join new well good great excellent opportunity opportunities environment position ' +
    'related relevant using use used across based help helps key make makes need needs one two three etc ideal ideally least minimum ' +
    'qualifications qualification apply benefits salary equal employer every across day days within want wants seeking we\'re you\'ll ' +
    'you\'re who\'s it\'s get gets take takes part full time fast-paced passion passionate thrive degree bachelor\'s master\'s').split(/\s+/);
  var STOP_SET = {}; STOP.forEach(function (w) { STOP_SET[w] = 1; });

  function tokens(s) {
    return (String(s).toLowerCase().match(/[a-z][a-z0-9+#./-]*[a-z0-9+#]|[a-z]/g) || [])
      .map(function (t) { return t.replace(/[./-]+$/, ''); })
      .filter(function (t) { return t.length > 1 && !STOP_SET[t] && !/^\d+$/.test(t); });
  }

  RB.jobMatch = function (doc, jd) {
    var words = tokens(jd);
    var counts = {}, order = [];
    words.forEach(function (w) { if (!counts[w]) { counts[w] = 0; order.push(w); } counts[w]++; });
    // two-word phrases that repeat (e.g. "machine learning", "product management")
    for (var i = 0; i < words.length - 1; i++) {
      var p = words[i] + ' ' + words[i + 1];
      counts[p] = (counts[p] || 0) + 1;
      if (counts[p] === 2) order.push(p);
    }
    var cand = order.filter(function (k) { return k.indexOf(' ') < 0 ? (counts[k] >= 2 || k.length >= 4) : counts[k] >= 2; });
    cand.sort(function (a, b) { return (counts[b] + (b.indexOf(' ') > 0 ? 1 : 0)) - (counts[a] + (a.indexOf(' ') > 0 ? 1 : 0)) || order.indexOf(a) - order.indexOf(b); });
    var picked = [];
    cand.forEach(function (k) {
      if (picked.length >= 24) return;
      if (picked.some(function (p) { return p.indexOf(k) > -1 || k.indexOf(p) > -1; })) return;
      picked.push(k);
    });
    var text = ' ' + RB.docText(doc).toLowerCase().replace(/[^a-z0-9+#./ -]+/g, ' ') + ' ';
    var matched = [], missing = [];
    picked.forEach(function (k) {
      var stem = k.length > 5 && /s$/.test(k) ? k.slice(0, -1) : k;
      (text.indexOf(' ' + stem) > -1 ? matched : missing).push(k);
    });
    var pct = picked.length ? Math.round(100 * matched.length / picked.length) : 0;
    return { pct: pct, matched: matched, missing: missing, total: picked.length };
  };

  /* ---- plain text ------------------------------------------------------ */
  RB.docText = function (doc) {
    var b = doc.basics || {}, L = [];
    if (b.name) L.push(b.name.toUpperCase());
    if (b.title) L.push(b.title);
    var c = [b.email, b.phone, b.location, b.website, b.linkedin, b.github].filter(function (x) { return String(x || '').trim(); });
    if (c.length) L.push(c.join(' | '));
    (doc.sections || []).forEach(function (s) {
      if (!s.visible) return;
      var def = RB.SECTION_TYPES[s.type] || RB.SECTION_TYPES.custom;
      var body = [];
      if (def.kind === 'text') { if (String(s.content || '').trim()) body.push(String(s.content).trim()); }
      else if (def.kind === 'tags') { var t = U.splitList(s.content); if (t.length) body.push(t.join(', ')); }
      else {
        (s.items || []).filter(U.hasContent).forEach(function (i) {
          if (s.type === 'skills') { body.push((i.name ? i.name + ': ' : '') + U.splitList(i.items).join(', ')); return; }
          if (s.type === 'languages') { body.push(i.name + (i.level ? ' (' + i.level + ')' : '')); return; }
          var head = [i.role || i.degree || i.name || i.title, i.company || i.school || i.org || i.issuer || i.publisher || i.tech || i.position || i.subtitle,
            i.location, RB.dateRange(i.start, i.end) || i.date, i.score, i.link].filter(function (x) { return String(x || '').trim(); });
          if (head.length) body.push(head.join(' | '));
          if (i.description) body.push(i.description);
          if (i.contact) body.push(i.contact);
          U.bulletsOf(i.bullets).forEach(function (x) { body.push('• ' + x.replace(/\*\*/g, '')); });
          body.push('');
        });
      }
      while (body.length && body[body.length - 1] === '') body.pop();
      if (body.length) { L.push(''); L.push(String(s.title || def.label).toUpperCase()); L.push.apply(L, body); }
    });
    return L.join('\n');
  };
})();

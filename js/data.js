/* =========================================================================
   Resumeit — configuration, templates, section schemas and sample content
   ========================================================================= */
window.RB = window.RB || {};

/* -------------------------------------------------------------------------
   MONETIZATION CONFIG — edit these to go live.
   ------------------------------------------------------------------------- */
RB.config = {
  brand: 'Resumeit',
  tagline: 'Interview-ready resumes',
  currency: '₹',
  plans: [
    { id: 'monthly',  name: 'Pro Monthly',  price: 199, period: '/ month',  note: 'Cancel anytime' },
    { id: 'lifetime', name: 'Pro Lifetime', price: 999, period: 'one-time', note: 'Best value · pay once', best: true }
  ],
  // Paste a hosted checkout link per plan (Razorpay Payment Page, Stripe Payment Link,
  // Lemon Squeezy, Gumroad…). Leave empty to show the "payments not configured" notice.
  checkoutUrls: { monthly: '', lifetime: '' },
  // Shows an "Unlock demo" button in the upgrade dialog. SET TO false IN PRODUCTION.
  demoUnlock: true,
  // How many resumes a free user can keep.
  freeResumeLimit: 2,
  // Adds a small "Made with Resumeit" line to free exports.
  freeWatermark: false,
  // Verify a license key. Replace with a call to your server / license API.
  // Must resolve to true (valid) or false.
  verifyLicense: function (key) {
    return Promise.resolve(RB.config.demoUnlock && String(key).trim().toUpperCase() === 'DEMO-PRO');
  }
};

/* -------------------------------------------------------------------------
   Font pairings (all loaded from Google Fonts in index.html)
   ------------------------------------------------------------------------- */
RB.FONTS = {
  'inter':        { label: 'Inter',              head: "'Inter', sans-serif",              body: "'Inter', sans-serif" },
  'source-sans':  { label: 'Source Sans',        head: "'Source Sans 3', sans-serif",      body: "'Source Sans 3', sans-serif" },
  'ibm-plex':     { label: 'IBM Plex Sans',      head: "'IBM Plex Sans', sans-serif",      body: "'IBM Plex Sans', sans-serif" },
  'lato':         { label: 'Lato',               head: "'Lato', sans-serif",               body: "'Lato', sans-serif" },
  'dm-sans':      { label: 'DM Sans',            head: "'DM Sans', sans-serif",            body: "'DM Sans', sans-serif" },
  'manrope':      { label: 'Manrope',            head: "'Manrope', sans-serif",            body: "'Manrope', sans-serif" },
  'poppins':      { label: 'Poppins + Inter',    head: "'Poppins', sans-serif",            body: "'Inter', sans-serif" },
  'outfit':       { label: 'Outfit + DM Sans',   head: "'Outfit', sans-serif",             body: "'DM Sans', sans-serif" },
  'source-serif': { label: 'Source Serif',       head: "'Source Serif 4', serif",          body: "'Source Serif 4', serif" },
  'garamond':     { label: 'EB Garamond',        head: "'EB Garamond', serif",             body: "'EB Garamond', serif" },
  'playfair':     { label: 'Playfair + Lato',    head: "'Playfair Display', serif",        body: "'Lato', sans-serif" },
  'lora':         { label: 'Lora + Inter',       head: "'Lora', serif",                    body: "'Inter', sans-serif" },
  'merriweather': { label: 'Merriweather + Source Sans', head: "'Merriweather', serif",    body: "'Source Sans 3', sans-serif" },
  'mono':         { label: 'JetBrains Mono + Plex', head: "'JetBrains Mono', monospace",   body: "'IBM Plex Sans', sans-serif" }
};

RB.ACCENTS = ['#1f3a5f', '#2563eb', '#0e7490', '#0f766e', '#15803d', '#334155',
              '#111827', '#9f1239', '#7c3aed', '#c2410c', '#a16207', '#be185d'];

RB.BULLETS = { disc: '•', dash: '–', arrow: '›', square: '▪', none: '' };

RB.LANG_LEVELS = ['Native', 'Fluent', 'Professional', 'Intermediate', 'Basic'];

/* -------------------------------------------------------------------------
   Templates
   layout   : 'one' | 'two'           header : 'top' | 'main' (inside main column)
   contact  : 'head' | 'side'          photo  : null | 'head' | 'side'
   entry    : 'stack' | 'split' | 'left' | 'inline'
   orgFirst : company/school shown as the bold first line
   ------------------------------------------------------------------------- */
RB.TEMPLATES = [
  { id: 'modern', name: 'Modern', pro: false, ats: true,
    desc: 'Clean, confident and recruiter-friendly. Works for almost every role.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'stack',
    skills: 'rows', langs: 'inline', icons: true, font: 'inter', accent: '#2563eb' },

  { id: 'classic', name: 'Classic', pro: false, ats: true,
    desc: 'The timeless serif format favoured by law, finance and consulting.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'split', orgFirst: true,
    skills: 'rows', langs: 'inline', icons: false, font: 'source-serif', accent: '#111827' },

  { id: 'minimal', name: 'Minimal', pro: false, ats: true,
    desc: 'Swiss-style whitespace with section labels in a quiet left rail.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'stack',
    skills: 'rows', langs: 'inline', icons: false, font: 'dm-sans', accent: '#111827' },

  { id: 'compact', name: 'Compact', pro: false, ats: true,
    desc: 'Dense and efficient — fits a long career on a single page.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'inline',
    skills: 'rows', langs: 'inline', icons: false, font: 'source-sans', accent: '#0f766e' },

  { id: 'executive', name: 'Executive', pro: true, ats: true,
    desc: 'Stately centred headings for senior leadership and director roles.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'split', orgFirst: true,
    skills: 'rows', langs: 'inline', icons: false, font: 'playfair', accent: '#1f3a5f' },

  { id: 'sidebar', name: 'Sidebar', pro: true, ats: false,
    desc: 'Bold colour sidebar with photo, contact and skills at a glance.',
    layout: 'two', sideFirst: true, header: 'main', contact: 'side', photo: 'side', monogram: true,
    side: ['skills', 'languages', 'certifications', 'interests', 'awards', 'references'],
    entry: 'stack', skills: 'rows', sideSkills: 'tags', langs: 'dots', icons: true, font: 'poppins', accent: '#1f3a5f' },

  { id: 'developer', name: 'Developer', pro: true, ats: true,
    desc: 'Monospace accents and skill tags built for engineering roles.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'stack',
    skills: 'tags', langs: 'inline', icons: true, font: 'mono', accent: '#0e7490' },

  { id: 'bold', name: 'Bold', pro: true, ats: false,
    desc: 'A full-width colour header that makes your name impossible to miss.',
    layout: 'one', header: 'top', contact: 'head', photo: 'head', monogram: true, entry: 'stack',
    skills: 'rows', langs: 'inline', icons: true, font: 'manrope', accent: '#4338ca' },

  { id: 'timeline', name: 'Timeline', pro: true, ats: true,
    desc: 'Dates on a vertical timeline to show clear career progression.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'left',
    skills: 'rows', langs: 'inline', icons: true, font: 'ibm-plex', accent: '#c2410c' },

  { id: 'elegant', name: 'Elegant', pro: true, ats: false,
    desc: 'Refined serif typography with a soft tinted side column.',
    layout: 'two', sideFirst: false, header: 'main', contact: 'side', photo: 'side', monogram: true,
    side: ['skills', 'languages', 'certifications', 'interests', 'awards', 'references'],
    entry: 'stack', skills: 'rows', sideSkills: 'stack', langs: 'dots', icons: true, font: 'lora', accent: '#9f1239' },

  { id: 'corporate', name: 'Corporate', pro: true, ats: true,
    desc: 'Structured and polished with a split header — great for business roles.',
    layout: 'one', header: 'top', contact: 'head', photo: null, entry: 'stack',
    skills: 'rows', langs: 'inline', icons: true, font: 'lato', accent: '#1f3a5f' },

  { id: 'studio', name: 'Studio', pro: true, ats: false,
    desc: 'Modern two-column layout with a tinted header for creative and product roles.',
    layout: 'two', sideFirst: true, header: 'top', contact: 'side', photo: 'head', monogram: true,
    side: ['skills', 'languages', 'certifications', 'interests', 'awards', 'references'],
    entry: 'stack', skills: 'rows', sideSkills: 'tags', langs: 'dots', icons: true, font: 'outfit', accent: '#0f766e' }
];

RB.tpl = function (id) {
  return RB.TEMPLATES.find(function (t) { return t.id === id; }) || RB.TEMPLATES[0];
};

/* -------------------------------------------------------------------------
   Section schemas
   ------------------------------------------------------------------------- */
function dr(a, b) { return [a, b].map(function (x) { return (x || '').trim(); }).filter(Boolean).join(' – '); }
RB.dateRange = dr;

RB.SECTION_TYPES = {
  summary: { label: 'Summary', icon: 'text', kind: 'text', single: true,
    ph: 'Senior engineer with 6+ years building high-scale payment systems. Led teams of 8, cut infra costs 38%…' },

  experience: { label: 'Experience', icon: 'briefcase', kind: 'items', single: true, add: 'Add position',
    fields: [
      { k: 'role', label: 'Job title', ph: 'Senior Software Engineer' },
      { k: 'company', label: 'Company', ph: 'Northwind Labs' },
      { k: 'start', label: 'Start date', ph: 'Mar 2021' },
      { k: 'end', label: 'End date', ph: 'Present' },
      { k: 'location', label: 'Location', ph: 'Bengaluru, India · Remote', full: true },
      { k: 'bullets', label: 'Achievements', type: 'bullets', full: true, ph: 'Led migration to Kubernetes, cutting deploy time by 70%\nMentored 4 engineers; 2 promoted within a year' }
    ],
    sum: function (i) { return { t: i.role || 'Untitled position', s: [i.company, dr(i.start, i.end)].filter(Boolean).join(' · ') }; } },

  education: { label: 'Education', icon: 'cap', kind: 'items', single: true, add: 'Add education',
    fields: [
      { k: 'degree', label: 'Degree', ph: 'B.Tech, Computer Science' },
      { k: 'school', label: 'School', ph: 'Westbridge Institute of Technology' },
      { k: 'start', label: 'Start', ph: '2015' },
      { k: 'end', label: 'End', ph: '2019' },
      { k: 'location', label: 'Location', ph: 'Pune, India' },
      { k: 'score', label: 'GPA / Grade', ph: 'CGPA 8.9 / 10' },
      { k: 'bullets', label: 'Details (optional)', type: 'bullets', full: true, ph: 'Top 5% of class\nLead, Coding Club' }
    ],
    sum: function (i) { return { t: i.degree || 'Untitled degree', s: [i.school, dr(i.start, i.end)].filter(Boolean).join(' · ') }; } },

  projects: { label: 'Projects', icon: 'folder', kind: 'items', single: true, add: 'Add project',
    fields: [
      { k: 'name', label: 'Project name', ph: 'Ledgerly' },
      { k: 'tech', label: 'Tech / Role', ph: 'Go, PostgreSQL' },
      { k: 'link', label: 'Link', ph: 'github.com/you/project', full: true },
      { k: 'start', label: 'Start', ph: '2023' },
      { k: 'end', label: 'End', ph: '' },
      { k: 'bullets', label: 'Highlights', type: 'bullets', full: true, ph: '1.2K GitHub stars; used by 3 startups' }
    ],
    sum: function (i) { return { t: i.name || 'Untitled project', s: i.tech || '' }; } },

  skills: { label: 'Skills', icon: 'zap', kind: 'items', single: true, add: 'Add skill group',
    fields: [
      { k: 'name', label: 'Category (optional)', ph: 'Languages', full: true },
      { k: 'items', label: 'Skills — comma separated', ph: 'Python, TypeScript, Go, SQL', full: true }
    ],
    sum: function (i) {
      var n = String(i.items || '').split(',').filter(function (s) { return s.trim(); }).length;
      return { t: i.name || 'Skills', s: n ? n + ' skill' + (n > 1 ? 's' : '') : '' };
    } },

  certifications: { label: 'Certifications', icon: 'award', kind: 'items', single: true, add: 'Add certification',
    fields: [
      { k: 'name', label: 'Certification', ph: 'AWS Solutions Architect – Associate' },
      { k: 'issuer', label: 'Issuer', ph: 'Amazon Web Services' },
      { k: 'date', label: 'Date', ph: '2023' },
      { k: 'link', label: 'Credential link', ph: 'credly.com/…' }
    ],
    sum: function (i) { return { t: i.name || 'Untitled certification', s: [i.issuer, i.date].filter(Boolean).join(' · ') }; } },

  awards: { label: 'Awards', icon: 'trophy', kind: 'items', single: true, add: 'Add award',
    fields: [
      { k: 'title', label: 'Award', ph: 'Engineering Excellence Award' },
      { k: 'issuer', label: 'Issuer', ph: 'Northwind Labs' },
      { k: 'date', label: 'Date', ph: '2024' },
      { k: 'description', label: 'Description (optional)', type: 'textarea', full: true, ph: 'Top 1% of 2,000 engineers' }
    ],
    sum: function (i) { return { t: i.title || 'Untitled award', s: [i.issuer, i.date].filter(Boolean).join(' · ') }; } },

  languages: { label: 'Languages', icon: 'languages', kind: 'items', single: true, add: 'Add language',
    fields: [
      { k: 'name', label: 'Language', ph: 'English' },
      { k: 'level', label: 'Proficiency', type: 'select', options: RB.LANG_LEVELS }
    ],
    sum: function (i) { return { t: i.name || 'Language', s: i.level || '' }; } },

  volunteer: { label: 'Volunteering', icon: 'heart', kind: 'items', single: true, add: 'Add role',
    fields: [
      { k: 'role', label: 'Role', ph: 'Mentor' },
      { k: 'org', label: 'Organisation', ph: 'Code for Good' },
      { k: 'start', label: 'Start', ph: '2022' },
      { k: 'end', label: 'End', ph: 'Present' },
      { k: 'location', label: 'Location', ph: 'Remote', full: true },
      { k: 'bullets', label: 'Highlights', type: 'bullets', full: true, ph: 'Mentored 30+ students into tech roles' }
    ],
    sum: function (i) { return { t: i.role || 'Untitled role', s: i.org || '' }; } },

  publications: { label: 'Publications', icon: 'book', kind: 'items', single: true, add: 'Add publication',
    fields: [
      { k: 'title', label: 'Title', ph: 'Scaling Event-Driven Payments', full: true },
      { k: 'publisher', label: 'Publisher', ph: 'IEEE / Medium' },
      { k: 'date', label: 'Date', ph: '2024' },
      { k: 'link', label: 'Link', ph: 'doi.org/…', full: true }
    ],
    sum: function (i) { return { t: i.title || 'Untitled publication', s: [i.publisher, i.date].filter(Boolean).join(' · ') }; } },

  references: { label: 'References', icon: 'users', kind: 'items', single: true, add: 'Add reference',
    fields: [
      { k: 'name', label: 'Name', ph: 'Priya Nair' },
      { k: 'position', label: 'Position', ph: 'VP Engineering, Northwind' },
      { k: 'contact', label: 'Contact', ph: 'priya@email.com · +91 …', full: true }
    ],
    sum: function (i) { return { t: i.name || 'Reference', s: i.position || '' }; } },

  interests: { label: 'Interests', icon: 'star', kind: 'tags', single: true,
    ph: 'Trail running, Chess, Open-source, Photography' },

  custom: { label: 'Custom section', icon: 'layers', kind: 'items', single: false, add: 'Add entry',
    fields: [
      { k: 'title', label: 'Title', ph: 'Title' },
      { k: 'subtitle', label: 'Subtitle', ph: 'Organisation' },
      { k: 'start', label: 'Start', ph: '' },
      { k: 'end', label: 'End', ph: '' },
      { k: 'location', label: 'Location', ph: '', full: true },
      { k: 'bullets', label: 'Details', type: 'bullets', full: true, ph: 'One point per line' }
    ],
    sum: function (i) { return { t: i.title || 'Untitled entry', s: i.subtitle || '' }; } }
};

/* -------------------------------------------------------------------------
   Document factories
   ------------------------------------------------------------------------- */
RB.uid = function () { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); };

RB.DEFAULT_DESIGN = {
  template: 'modern', accent: null, font: null,
  fontSize: 10, lineHeight: 1.4, margin: 15, spacing: 1,
  pageSize: 'a4', showPhoto: true, icons: null, bullet: 'disc'
};

RB.newSection = function (type, extra) {
  var def = RB.SECTION_TYPES[type];
  var s = { id: RB.uid(), type: type, title: def.label, visible: true };
  if (def.kind === 'items') s.items = [];
  else s.content = '';
  return Object.assign(s, extra || {});
};

RB.newItem = function (type, data) {
  return Object.assign({ id: RB.uid() }, data || {});
};

RB.blankDoc = function (name) {
  var exp = RB.newSection('experience'); exp.items.push(RB.newItem('experience'));
  var edu = RB.newSection('education');  edu.items.push(RB.newItem('education'));
  var sk  = RB.newSection('skills');     sk.items.push(RB.newItem('skills'));
  return {
    id: RB.uid(), name: name || 'My resume', updatedAt: Date.now(),
    design: Object.assign({}, RB.DEFAULT_DESIGN),
    basics: { name: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '' },
    sections: [RB.newSection('summary'), exp, edu, sk]
  };
};

RB.sampleDoc = function () {
  function items(type, arr) { return arr.map(function (x) { return RB.newItem(type, x); }); }
  return {
    id: RB.uid(), name: 'Software Engineer — Sample', updatedAt: Date.now(), isSample: true,
    design: Object.assign({}, RB.DEFAULT_DESIGN),
    basics: {
      name: 'Aarav Mehta', title: 'Senior Software Engineer',
      email: 'aarav.mehta@email.com', phone: '+91 98765 43210', location: 'Bengaluru, India',
      website: 'aaravmehta.dev', linkedin: 'linkedin.com/in/aaravmehta', github: 'github.com/aaravm', photo: ''
    },
    sections: [
      RB.newSection('summary', { content: 'Senior software engineer with 6+ years building high-scale payment and logistics platforms. Led teams of up to 8 engineers, shipped systems processing 12M+ transactions a month, and cut infrastructure costs by 38%. Known for pragmatic system design, strong ownership and mentoring.' }),
      RB.newSection('experience', { items: items('experience', [
        { role: 'Senior Software Engineer', company: 'Northwind Labs', location: 'Bengaluru, India', start: 'Apr 2022', end: 'Present',
          bullets: 'Led a team of 6 engineers to rebuild the payments reconciliation engine, cutting settlement time from 48 hours to 15 minutes.\nArchitected an event-driven order pipeline on Kafka and Go handling **12M+ transactions per month** at 99.99% uptime.\nReduced AWS spend by **38% ($420K per year)** through rightsizing, spot instances and Redis caching of hot paths.\nMentored 5 junior engineers through structured 1:1s and design reviews; 3 were promoted within 18 months.' },
        { role: 'Software Engineer II', company: 'Brightpath Fintech', location: 'Pune, India', start: 'Jul 2019', end: 'Mar 2022',
          bullets: 'Built a real-time fraud scoring service in Python that blocked $1.8M in fraudulent transactions in its first year.\nMigrated a legacy monolith to 14 containerised microservices on Kubernetes, raising deploy frequency from weekly to 20+ per day.\nIntroduced contract testing and CI quality gates, lowering production incidents by 45%.' },
        { role: 'Software Engineering Intern', company: 'Kestrel Systems', location: 'Hyderabad, India', start: 'Jan 2019', end: 'Jun 2019',
          bullets: 'Developed React analytics dashboards used daily by 200+ operations staff.\nAutomated weekly reporting with Python and SQL, saving the operations team 10 hours per week.' }
      ]) }),
      RB.newSection('projects', { items: items('projects', [
        { name: 'Ledgerly', tech: 'Go, PostgreSQL', link: 'github.com/aaravm/ledgerly', start: '2023', end: '',
          bullets: 'Open-source double-entry ledger with 1.2K+ GitHub stars, adopted by 3 fintech startups for audit-ready bookkeeping.' },
        { name: 'Shipwise', tech: 'Python, OR-Tools', link: '', start: '2021', end: '',
          bullets: 'Route-optimisation API that cut last-mile delivery distance by 17% in a pilot with a regional courier.' }
      ]) }),
      RB.newSection('skills', { items: items('skills', [
        { name: 'Languages', items: 'Go, Python, TypeScript, Java, SQL' },
        { name: 'Backend & Data', items: 'Kafka, PostgreSQL, Redis, gRPC, Elasticsearch' },
        { name: 'Cloud & DevOps', items: 'AWS, Kubernetes, Docker, Terraform, GitHub Actions' }
      ]) }),
      RB.newSection('education', { items: items('education', [
        { degree: 'B.Tech, Computer Science and Engineering', school: 'Westbridge Institute of Technology', location: 'Pune, India',
          start: '2015', end: '2019', score: 'CGPA 8.9 / 10', bullets: '' }
      ]) }),
      RB.newSection('certifications', { items: items('certifications', [
        { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', date: '2023', link: '' },
        { name: 'Certified Kubernetes Application Developer', issuer: 'CNCF', date: '2022', link: '' }
      ]) }),
      RB.newSection('languages', { items: items('languages', [
        { name: 'English', level: 'Fluent' }, { name: 'Hindi', level: 'Native' }, { name: 'Kannada', level: 'Intermediate' }
      ]) })
    ]
  };
};

/* Convert the data saved by the original (2025) version of this app. */
RB.migrateLegacy = function (s) {
  var d = RB.blankDoc('Imported resume');
  var b = s.basics || {};
  d.basics = Object.assign(d.basics, { name: b.name || '', title: b.role || '', email: b.email || '', phone: b.phone || '',
    location: b.location || '', website: b.website || '', linkedin: b.linkedin || '', github: b.github || '' });
  d.sections = [];
  d.sections.push(RB.newSection('summary', { content: b.summary || '' }));
  d.sections.push(RB.newSection('experience', { items: (s.experience || []).map(function (e) {
    return RB.newItem('experience', { role: e.role, company: e.company, location: e.location, start: e.start, end: e.end, bullets: (e.highlights || []).join('\n') });
  }) }));
  d.sections.push(RB.newSection('education', { items: (s.education || []).map(function (e) {
    return RB.newItem('education', { degree: e.degree, school: e.school, start: e.years, score: e.notes });
  }) }));
  d.sections.push(RB.newSection('skills', { items: [RB.newItem('skills', { name: '', items: (s.skills || []).join(', ') })] }));
  return d;
};

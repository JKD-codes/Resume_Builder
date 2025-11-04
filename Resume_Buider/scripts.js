'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel, ctx = document) => (ctx || document).querySelector(sel);

  //  STATE 
  const state = {
    template: 'modern',
    accent: '#46a6ff',
    font: 'Inter',
    background: 'white',
    basics: { name:'', role:'', summary:'', email:'', phone:'', location:'', website:'', linkedin:'', github:'' },
    skills: [],
    experience: [],
    education: []
  };

  //  DOM ELEMENTS 
  const sheet   = $('#sheet');
  const resume  = $('#resume');

  const templateSelect = $('#templateSelect');
  const accentColor    = $('#accentColor');
  const fontSelect     = $('#fontSelect');
  const bgSelect       = $('#bgSelect');

  const skillsInput = $('#skillsInput');
  const skillsChips = $('#skillsChips');

  const nameEl     = $('#name');
  const roleEl     = $('#role');
  const summaryEl  = $('#summary');
  const emailEl    = $('#email');
  const phoneEl    = $('#phone');
  const locationEl = $('#location');
  const websiteEl  = $('#website');
  const linkedinEl = $('#linkedin');
  const githubEl   = $('#github');

  const expList = $('#expList');
  const eduList = $('#eduList');

  const addExpBtn = $('#addExp');
  const addEduBtn = $('#addEdu');
  const printBtn  = $('#printBtn');
  const pdfBtn    = $('#pdfBtn');
  const resetBtn  = $('#resetBtn');

  //  HELPERS 
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function splitSkills(val) {
    return (val || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);
  }

  function chipify(list, el) {
    el.innerHTML = '';
    list.forEach(s => {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = s;
      el.appendChild(c);
    });
  }

  function applyBackgroundClass(bg) {
    sheet.classList.remove('white','calm','softgray','mutedblue');
    sheet.classList.add(bg);
  }

  //  EXPERIENCE / EDUCATION FORM ITEMS 
  function experienceItem(data = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'item';
    wrap.innerHTML = `
      <label>Company</label>
      <input type="text" class="company" placeholder="Marvel Corp" value="${escapeHtml(data.company||'')}">
      <div class="row">
        <div>
          <label>Role</label>
          <input type="text" class="role" placeholder="Senior Developer" value="${escapeHtml(data.role||'')}">
        </div>
        <div>
          <label>Location</label>
          <input type="text" class="loc" placeholder="City, Country" value="${escapeHtml(data.location||'')}">
        </div>
      </div>
      <div class="row">
        <div>
          <label>Start</label>
          <input type="text" class="start" placeholder="Jan 2022" value="${escapeHtml(data.start||'')}">
        </div>
        <div>
          <label>End</label>
          <input type="text" class="end" placeholder="Present" value="${escapeHtml(data.end||'')}">
        </div>
      </div>
      <label>Highlights (one per line)</label>
      <textarea class="highlights" placeholder="Shipped X…\nImproved Y…">${(data.highlights||[]).map(escapeHtml).join('\n')}</textarea>
      <div class="actions"><button class="btn remove" type="button">Remove</button></div>
    `;
    wrap.querySelector('.remove').onclick = () => { wrap.remove(); syncFromForm(); };
    ['company','role','loc','start','end','highlights'].forEach(cls => {
      wrap.querySelector('.'+cls).addEventListener('input', syncFromForm);
    });
    return wrap;
  }

  function educationItem(data = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'item';
    wrap.innerHTML = `
      <label>Institution</label>
      <input type="text" class="school" placeholder="University of …" value="${escapeHtml(data.school||'')}">
      <div class="row">
        <div>
          <label>Degree</label>
          <input type="text" class="degree" placeholder="B.Sc. Computer Science" value="${escapeHtml(data.degree||'')}">
        </div>
        <div>
          <label>Years</label>
          <input type="text" class="years" placeholder="2018 – 2022" value="${escapeHtml(data.years||'')}">
        </div>
      </div>
      <label>Notes (optional)</label>
      <input type="text" class="notes" placeholder="GPA, honors, activities" value="${escapeHtml(data.notes||'')}">
      <div class="actions"><button class="btn remove" type="button">Remove</button></div>
    `;
    wrap.querySelector('.remove').onclick = () => { wrap.remove(); syncFromForm(); };
    ['school','degree','years','notes'].forEach(cls => {
      wrap.querySelector('.'+cls).addEventListener('input', syncFromForm);
    });
    return wrap;
  }

  // FORM EVENT WIRING 
  [templateSelect, accentColor, fontSelect, bgSelect,
   nameEl, roleEl, summaryEl, emailEl, phoneEl, locationEl,
   websiteEl, linkedinEl, githubEl].forEach(el => {
    if (el) el.addEventListener('input', syncFromForm);
  });

  addExpBtn.onclick = () => { expList.appendChild(experienceItem()); syncFromForm(); };
  addEduBtn.onclick = () => { eduList.appendChild(educationItem()); syncFromForm(); };

  skillsInput.addEventListener('input', () => {
    state.skills = splitSkills(skillsInput.value);
    chipify(state.skills, skillsChips);
    render();
  });

  printBtn.onclick = () => window.print();

  pdfBtn.onclick = () => {
    const opt = {
      margin: 0,
      filename: `${(state.basics.name||'resume').toLowerCase().replace(/\s+/g,'_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(sheet).set(opt).save();
  };

  resetBtn.onclick = () => {
    if (!confirm('Reset all fields?')) return;
    localStorage.removeItem('cvbuilder');
    window.location.reload();
  };

  // SYNC & RENDER 
  function syncFromForm() {
    state.template   = templateSelect.value;
    state.accent     = accentColor.value;
    state.font       = fontSelect.value;
    state.background = bgSelect.value;

    state.basics = {
      name: nameEl.value, role: roleEl.value, summary: summaryEl.value,
      email: emailEl.value, phone: phoneEl.value, location: locationEl.value,
      website: websiteEl.value, linkedin: linkedinEl.value, github: githubEl.value
    };

    state.experience = Array.from(expList.children).map(el => ({
      company: $('.company', el).value,
      role: $('.role', el).value,
      location: $('.loc', el).value,
      start: $('.start', el).value,
      end: $('.end', el).value,
      highlights: $('.highlights', el).value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,6)
    }));

    state.education = Array.from(eduList.children).map(el => ({
      school: $('.school', el).value,
      degree: $('.degree', el).value,
      years: $('.years', el).value,
      notes: $('.notes', el).value
    }));

    save();
    render();
  }

  function render() {
    document.documentElement.style.setProperty('--accent', state.accent);
    resume.className = `sheet-inner ${state.template}`;
    resume.style.fontFamily = state.font;
    applyBackgroundClass(state.background);

    const b = state.basics;
    const contactParts = [
      b.email && `<strong>Email:</strong> ${escapeHtml(b.email)}`,
      b.phone && `<strong>Phone:</strong> ${escapeHtml(b.phone)}`,
      b.location && `<strong>Location:</strong> ${escapeHtml(b.location)}`,
      b.website && `<strong>Website:</strong> <a href="${escapeHtml(b.website)}" target="_blank">${escapeHtml(b.website)}</a>`,
      b.linkedin && `<strong>LinkedIn:</strong> <a href="${escapeHtml(b.linkedin)}" target="_blank">${escapeHtml(b.linkedin)}</a>`,
      b.github && `<strong>GitHub:</strong> <a href="${escapeHtml(b.github)}" target="_blank">${escapeHtml(b.github)}</a>`
    ].filter(Boolean).join(' • ');

    const skillsHtml = state.skills.length
      ? `<div class="section"><h4>Skills</h4><div>${state.skills.map(s=>`<span class="chip" style="border-color:#e5ecf3;background:#f6f9fc;color:#23303f">${escapeHtml(s)}</span>`).join(' ')}</div></div>`
      : '';

    const expHtml = state.experience.length
      ? `<div class="section"><h4>Experience</h4>
          ${state.experience.map(e=>`
              <div class="item">
                <h5>${escapeHtml(e.role)} • ${escapeHtml(e.company)}</h5>
                <div class="meta">${escapeHtml(e.location)} • ${escapeHtml(e.start)} – ${escapeHtml(e.end)}</div>
                ${e.highlights?.length ? `<ul>${e.highlights.map(h=>`<li>${escapeHtml(h)}</li>`).join('')}</ul>` : ''}
              </div>
          `).join('')}
         </div>`
      : '';

    const eduHtml = state.education.length
      ? `<div class="section"><h4>Education</h4>
          ${state.education.map(ed=>`
              <div class="item">
                <h5>${escapeHtml(ed.degree)} • ${escapeHtml(ed.school)}</h5>
                <div class="meta">${escapeHtml(ed.years)} ${ed.notes? '• '+escapeHtml(ed.notes):''}</div>
              </div>
          `).join('')}
         </div>`
      : '';

    resume.innerHTML = `
      <header>
        <div class="name">${escapeHtml(b.name) || 'Your Name'}</div>
        <div class="headline" style="color: var(--accent)">${escapeHtml(b.role) || 'Your Role / Headline'}</div>
        <div class="meta" style="color:#536579">${contactParts || 'Add your contact info →'}</div>
      </header>
      ${b.summary ? `<div class="section"><h4>Summary</h4><div>${escapeHtml(b.summary)}</div></div>` : ''}
      ${skillsHtml}
      ${expHtml}
      ${eduHtml}
    `;
  }

  //  PERSISTENCE 
  function save() {
    localStorage.setItem('cvbuilder', JSON.stringify(state));
  }

  function load() {
    const raw = localStorage.getItem('cvbuilder');
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      Object.assign(state, s);

      nameEl.value = s.basics?.name || '';
      roleEl.value = s.basics?.role || '';
      summaryEl.value = s.basics?.summary || '';
      emailEl.value = s.basics?.email || '';
      phoneEl.value = s.basics?.phone || '';
      locationEl.value = s.basics?.location || '';
      websiteEl.value = s.basics?.website || '';
      linkedinEl.value = s.basics?.linkedin || '';
      githubEl.value = s.basics?.github || '';

      templateSelect.value = s.template || 'modern';
      accentColor.value = s.accent || '#46a6ff';
      fontSelect.value = s.font || 'Inter';
      bgSelect.value = s.background || 'white';

      skillsInput.value = (s.skills||[]).join(', ');
      chipify(s.skills||[], skillsChips);

      expList.innerHTML = '';
      (s.experience||[]).forEach(e => expList.appendChild(experienceItem(e)));

      eduList.innerHTML = '';
      (s.education||[]).forEach(ed => eduList.appendChild(educationItem(ed)));
    } catch (e) { console.warn('Failed to load state', e); }
  }

  //  BOOT 
  load();
  if (expList && expList.children.length === 0) {
  expList.appendChild(experienceItem({
    company: 'Marvel Studios',
    role: 'Senior Developer',
    location: 'Remote',
    start: 'Jan 2024',
    end: 'Present',
    highlights: [
      'Managed Windows/Linux server infrastructure supporting 500+ users',
      'Deployed and maintained cloud resources (AWS, Azure)',
      'Optimized database queries'
    ]
  }));
}
if (eduList.children.length === 0) {
  eduList.appendChild(educationItem({
    school: 'TCSC',
    degree: 'B.Sc. Information Technology',
    years: '2024 - 2027',
    notes: 'Distinction'
  }));
}
  if (state.skills.length === 0) {
    state.skills = ['JavaScript','React','Node.js','SQL'];
    skillsInput.value = state.skills.join(', ');
    chipify(state.skills, skillsChips);
  }
  syncFromForm();
});

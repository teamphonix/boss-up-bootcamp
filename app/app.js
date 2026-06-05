const data = window.BOSS_UP_DATA || { learn: [], projects: [], process: [] };
const learnGrid = document.querySelector('#learn-grid');
const showcaseGrid = document.querySelector('#showcase-grid');
const tabs = document.querySelector('#showcase-tabs');
const timeline = document.querySelector('#timeline');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderLearn() {
  learnGrid.innerHTML = data.learn.map((item) => `
    <article class="learn-card">
      <div class="icon" aria-hidden="true">${escapeHtml(item.icon)}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
    </article>
  `).join('');
}

function categories() {
  return ['All', ...Array.from(new Set(data.projects.map((project) => project.category)))];
}

function renderTabs(active = 'All') {
  tabs.innerHTML = categories().map((category) => `
    <button class="tab-button ${category === active ? 'active' : ''}" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>
  `).join('');
  tabs.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      renderTabs(button.dataset.category);
      renderProjects(button.dataset.category);
    });
  });
}

function renderProjects(active = 'All') {
  const projects = active === 'All' ? data.projects : data.projects.filter((project) => project.category === active);
  showcaseGrid.innerHTML = projects.map((project) => `
    <article class="project-card">
      <div class="project-visual" style="--accent:${escapeHtml(project.accent)}"><span>${escapeHtml(project.initials)}</span></div>
      <div class="project-body">
        <span class="badge">${escapeHtml(project.status)}</span>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
      </div>
    </article>
  `).join('');
}

function renderTimeline() {
  timeline.innerHTML = data.process.map((step, index) => `
    <article class="timeline-step">
      <span class="number">Step ${index + 1}</span>
      <h3>${escapeHtml(step)}</h3>
      <p>${index === 0 ? 'Start with what you want to create.' : 'Use AI tools and guided workflows to move the idea forward.'}</p>
    </article>
  `).join('');
}

function bindForm() {
  const form = document.querySelector('.waitlist-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.textContent = 'Saved Locally For Skeleton';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = 'Join The Waitlist';
      button.disabled = false;
    }, 2200);
  });
}

renderLearn();
renderTabs();
renderProjects();
renderTimeline();
bindForm();

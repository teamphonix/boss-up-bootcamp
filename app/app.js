const data = window.BOSS_UP_DATA || { slides: [], learn: [], projects: [], process: [] };
const learnGrid = document.querySelector('#learn-grid');
const showcaseGrid = document.querySelector('#showcase-grid');
const tabs = document.querySelector('#showcase-tabs');
const timeline = document.querySelector('#timeline');
const slidesEl = document.querySelector('#slides');
const dotsEl = document.querySelector('#carousel-dots');
let activeSlide = 0;
let slideTimer;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderSlides() {
  if (!slidesEl || !dotsEl || !data.slides?.length) return;
  slidesEl.innerHTML = data.slides.map((slide, index) => `
    <article class="slide ${index === activeSlide ? 'active' : ''}" aria-hidden="${index === activeSlide ? 'false' : 'true'}">
      <span class="slide-label">${escapeHtml(slide.label)}</span>
      <h3>${escapeHtml(slide.title)}</h3>
      <p>${escapeHtml(slide.body)}</p>
      ${slide.meta ? `<span class="slide-meta">${escapeHtml(slide.meta)}</span>` : ''}
    </article>
  `).join('');
  dotsEl.innerHTML = data.slides.map((_, index) => `
    <button class="dot ${index === activeSlide ? 'active' : ''}" type="button" aria-label="Show slide ${index + 1}" data-slide="${index}"></button>
  `).join('');
  dotsEl.querySelectorAll('[data-slide]').forEach((dot) => {
    dot.addEventListener('click', () => setSlide(Number(dot.dataset.slide)));
  });
}

function setSlide(index) {
  activeSlide = (index + data.slides.length) % data.slides.length;
  renderSlides();
  restartSlideTimer();
}

function restartSlideTimer() {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => {
    activeSlide = (activeSlide + 1) % data.slides.length;
    renderSlides();
  }, 5200);
}

function bindCarousel() {
  if (!data.slides?.length) return;
  renderSlides();
  document.querySelector('#prev-slide')?.addEventListener('click', () => setSlide(activeSlide - 1));
  document.querySelector('#next-slide')?.addEventListener('click', () => setSlide(activeSlide + 1));
  restartSlideTimer();
}

function bindDropdowns() {
  document.querySelectorAll('.has-menu > button').forEach((button) => {
    const item = button.closest('.has-menu');
    item.addEventListener('mouseenter', () => button.setAttribute('aria-expanded', 'true'));
    item.addEventListener('mouseleave', () => button.setAttribute('aria-expanded', 'false'));
    button.addEventListener('focus', () => button.setAttribute('aria-expanded', 'true'));
  });
}

function renderLearn() {
  if (!learnGrid) return;
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
      <span class="number">Phase ${index + 1}</span>
      <h3>${escapeHtml(step.title || step)}</h3>
      <p>${escapeHtml(step.body || '')}</p>
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

bindCarousel();
bindDropdowns();
renderLearn();
renderTabs();
renderProjects();
renderTimeline();
bindForm();

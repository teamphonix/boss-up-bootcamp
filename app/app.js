const data = window.BOSS_UP_DATA || { slides: [], learn: [], projects: [], process: [] };
const learnGrid = document.querySelector('#learn-grid');
const showcaseGrid = document.querySelector('#showcase-grid');
const tabs = document.querySelector('#showcase-tabs');
const timeline = document.querySelector('#timeline');
const slidesEl = document.querySelector('#slides');
const dotsEl = document.querySelector('#carousel-dots');
const musicPlaylist = document.querySelector('#music-playlist');
let activeSlide = 0;
let slideTimer;
let activeAudio;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderSlides() {
  if (!slidesEl || !dotsEl || !data.slides?.length) return;
  slidesEl.innerHTML = data.slides.map((slide, index) => {
    const imageMarkup = slide.image
      ? `<img class="slide-image" src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.alt || slide.title)}" loading="${index === 0 ? 'eager' : 'lazy'}" />`
      : `
      <span class="slide-label">${escapeHtml(slide.label)}</span>
      <h3>${escapeHtml(slide.title)}</h3>
      <p>${escapeHtml(slide.body)}</p>
      ${slide.meta ? `<span class="slide-meta">${escapeHtml(slide.meta)}</span>` : ''}
    `;
    return `
    <article class="slide ${slide.image ? 'has-image' : ''} ${index === activeSlide ? 'active' : ''}" aria-hidden="${index === activeSlide ? 'false' : 'true'}">
      ${imageMarkup}
    </article>
  `;
  }).join('');
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

function formatTrackStatus(track, index) {
  return track.status || `Track ${String(index + 1).padStart(2, '0')}`;
}

function renderMusicPlaylist() {
  if (!musicPlaylist) return;
  const tracks = data.musicTracks || [];
  musicPlaylist.innerHTML = tracks.map((track, index) => {
    const hasAudio = Boolean(track.src);
    return `
      <article class="track-card ${hasAudio ? '' : 'is-placeholder'}">
        <div class="track-info">
          <span class="track-status">${escapeHtml(formatTrackStatus(track, index))}</span>
          <h3>${escapeHtml(track.title)}</h3>
        </div>
        ${hasAudio ? `<audio preload="metadata" src="${escapeHtml(track.src)}"></audio>` : ''}
        <div class="track-actions">
          <button class="track-button play-toggle" type="button" ${hasAudio ? '' : 'disabled'}>${hasAudio ? 'Play' : 'Add MP3'}</button>
          <button class="track-button restart-track" type="button" ${hasAudio ? '' : 'disabled'}>From Beginning</button>
        </div>
      </article>
    `;
  }).join('');

  musicPlaylist.querySelectorAll('.track-card').forEach((card) => {
    const audio = card.querySelector('audio');
    const toggle = card.querySelector('.play-toggle');
    const restart = card.querySelector('.restart-track');
    if (!audio || !toggle || !restart) return;

    toggle.addEventListener('click', () => {
      if (!audio.paused) {
        audio.pause();
        return;
      }
      if (activeAudio && activeAudio !== audio) activeAudio.pause();
      activeAudio = audio;
      audio.play();
    });

    restart.addEventListener('click', () => {
      if (activeAudio && activeAudio !== audio) activeAudio.pause();
      audio.currentTime = 0;
      activeAudio = audio;
      audio.play();
    });

    audio.addEventListener('play', () => { toggle.textContent = 'Pause'; });
    audio.addEventListener('pause', () => { toggle.textContent = 'Play'; });
    audio.addEventListener('ended', () => { toggle.textContent = 'Play'; });
  });
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

function bindRevealCards() {
  const cards = document.querySelectorAll('.reveal-card');
  if (!cards.length) return;
  if (!('IntersectionObserver' in window)) {
    cards.forEach((card) => card.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -10% 0px' });
  cards.forEach((card) => observer.observe(card));
}

bindCarousel();
bindDropdowns();
renderLearn();
renderTabs();
renderProjects();
renderTimeline();
renderMusicPlaylist();
bindForm();
bindRevealCards();

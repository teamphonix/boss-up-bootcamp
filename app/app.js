const data = window.BOSS_UP_DATA || { slides: [], learn: [], projects: [], process: [], portfolioGallery: [] };
const learnGrid = document.querySelector('#learn-grid');
const showcaseGrid = document.querySelector('#showcase-grid');
const tabs = document.querySelector('#showcase-tabs');
const timeline = document.querySelector('#timeline');
const slidesEl = document.querySelector('#slides');
const dotsEl = document.querySelector('#carousel-dots');
const musicPlaylist = document.querySelector('#music-playlist');
const websiteShowcaseTrack = document.querySelector('#website-showcase-track');
let activeSlide = 0;
let slideTimer;
let activeAudio;
let floatingSiteAudio;
let floatingSiteAudioButton;
let floatingAutoplayPending = false;
let activeGalleryIndex = 0;
let activeGalleryCategory = 'All';
let activeCompareSide = 'after';
let touchStartX = 0;

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function driveId(url) {
  const match = String(url || '').match(/\/d\/([^/]+)|[?&]id=([^&]+)/);
  return match ? (match[1] || match[2]) : '';
}

function drivePreview(url, size = 1600) {
  const id = driveId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${size}` : url;
}

function driveDirect(url) {
  const id = driveId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

function itemCurrentMediaType(item) {
  if (item.mediaType === 'video') return 'video';
  if (item.mediaType === 'beforeAfterImage' && activeCompareSide === 'after' && item.afterMediaType === 'video') return 'video';
  if (item.mediaType === 'beforeAfterImage' && activeCompareSide === 'before' && item.beforeMediaType === 'video') return 'video';
  return 'image';
}

function itemDefaultCompareSide(item) {
  return item?.defaultCompareSide === 'before' ? 'before' : 'after';
}

function itemCompareLabel(item, side) {
  if (side === 'before') return item.beforeLabel || 'Before';
  return item.afterLabel || 'After';
}

function galleryItems() {
  return data.portfolioGallery || [];
}

function galleryCategories() {
  return ['All', ...Array.from(new Set(galleryItems().map((item) => item.category)))];
}

function filteredGalleryItems() {
  const items = galleryItems();
  return activeGalleryCategory === 'All' ? items : items.filter((item) => item.category === activeGalleryCategory);
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

function pageFromHash() {
  const page = (window.location.hash || '#home').replace('#', '') || 'home';
  return document.querySelector(`[data-page="${CSS.escape(page)}"]`) ? page : 'home';
}

function closeMobileMenu() {
  const menu = document.querySelector('#mobile-menu');
  const toggle = document.querySelector('#menu-toggle');
  if (!menu || !toggle) return;
  menu.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
}

function renderRoute() {
  const page = pageFromHash();
  document.querySelectorAll('[data-page]').forEach((panel) => {
    panel.classList.toggle('active-page', panel.dataset.page === page);
  });
  document.querySelectorAll('[data-route-link]').forEach((link) => {
    link.classList.toggle('active-route', link.getAttribute('href') === `#${page}`);
  });
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  bindRevealCards();
}

function bindNavigation() {
  const toggle = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    if (menu) menu.hidden = open;
  });
  document.querySelectorAll('[data-route-link]').forEach((link) => link.addEventListener('click', closeMobileMenu));
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

function bindDropdowns() {}

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
  const portfolio = galleryItems();
  return portfolio.length ? galleryCategories() : ['All', ...Array.from(new Set(data.projects.map((project) => project.category)))];
}

function renderTabs(active = 'All') {
  if (!tabs) return;
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

function renderProjectPlaceholders(active = 'All') {
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

function itemThumb(item) {
  const thumbnailLink = item.afterMediaType === 'video'
    ? (item.beforeLink || item.link || item.afterLink)
    : (item.afterLink || item.link || item.beforeLink);
  return drivePreview(thumbnailLink, 900);
}

function portfolioCategoryDescription(active) {
  if (active === 'Photo Edits') {
    return 'Explore AI-enhanced photo restorations, quality upgrades, family portraits brought to life, and creative before-and-after transformations.';
  }
  if (active === 'All') {
    return 'Explore AI-enhanced photo restorations, quality upgrades, family portraits brought to life, and creative before-and-after transformations.';
  }
  return `This cover updates to the first piece in ${active}. Tap the image or button to open that full-screen category gallery. The gallery includes full-size vertical, landscape, video, and before/after pieces.`;
}

function renderPortfolioCards(active = 'All') {
  const items = active === 'All' ? galleryItems() : galleryItems().filter((item) => item.category === active);
  if (!items.length) {
    showcaseGrid.innerHTML = '';
    return;
  }
  const holdingItem = active === 'All' ? (galleryItems()[0] || items[0]) : items[0];
  showcaseGrid.innerHTML = `
    <article class="project-card portfolio-launch-card portfolio-carousel-cell portfolio-holding-cell reveal-card">
      <button class="portfolio-carousel-preview" type="button" data-open-gallery-category="${escapeHtml(active)}" aria-label="Open portfolio gallery">
        <img src="${escapeHtml(itemThumb(holdingItem))}" alt="${escapeHtml(holdingItem.title)} gallery cover" loading="lazy" />
        <span class="portfolio-preview-overlay">
          <span>Tap to open</span>
          <strong>${escapeHtml(holdingItem.title)}</strong>
        </span>
      </button>
      <div class="project-body portfolio-body">
        <span class="badge">${escapeHtml(active === 'All' ? 'Creative Portfolio' : active)}</span>
        <h3>${escapeHtml(active === 'All' ? 'Portfolio Gallery' : `${active} Gallery`)}</h3>
        <p>${escapeHtml(portfolioCategoryDescription(active))}</p>
        <button class="button button-dark portfolio-gallery-cta" type="button" data-open-gallery-category="${escapeHtml(active)}">Open Gallery</button>
      </div>
    </article>
  `;
  showcaseGrid.querySelectorAll('[data-open-gallery-category]').forEach((button) => {
    button.addEventListener('click', () => openGalleryCategory(active));
  });
  bindRevealCards();
}

function renderProjects(active = 'All') {
  if (!showcaseGrid) return;
  activeGalleryCategory = active;
  if (galleryItems().length) renderPortfolioCards(active);
  else renderProjectPlaceholders(active);
}

function renderTimeline() {
  if (!timeline) return;
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

function pauseFloatingSiteAudio() {
  if (!floatingSiteAudio) return;
  floatingSiteAudio.pause();
}

function updateFloatingSiteAudioButton(isPlaying = false, isAutoplayPending = false) {
  if (!floatingSiteAudioButton) return;
  floatingSiteAudioButton.classList.toggle('is-playing', isPlaying);
  floatingSiteAudioButton.classList.toggle('is-autoplay-pending', isAutoplayPending && !isPlaying);
  floatingSiteAudioButton.setAttribute('aria-label', isPlaying ? 'Pause site music' : 'Play site music from the beginning');
  floatingSiteAudioButton.setAttribute('aria-pressed', String(isPlaying));
  floatingSiteAudioButton.innerHTML = `
    <span class="floating-music-icon" aria-hidden="true">${isPlaying ? '❚❚' : '▶'}</span>
    <span class="floating-music-label">${isPlaying ? 'Pause' : (isAutoplayPending ? 'Tap for Sound' : 'Play')}</span>
  `;
}

async function playFloatingSiteAudio({ restart = true, markPendingOnBlock = false } = {}) {
  if (!floatingSiteAudio) return false;
  if (activeAudio && activeAudio !== floatingSiteAudio) activeAudio.pause();
  if (restart) floatingSiteAudio.currentTime = 0;
  activeAudio = floatingSiteAudio;
  try {
    await floatingSiteAudio.play();
    floatingAutoplayPending = false;
    updateFloatingSiteAudioButton(true);
    return true;
  } catch (error) {
    floatingAutoplayPending = Boolean(markPendingOnBlock);
    updateFloatingSiteAudioButton(false, floatingAutoplayPending);
    console.warn('Site music autoplay was blocked or failed.', error);
    return false;
  }
}

function bindFloatingAutoplayFallback() {
  const startAfterFirstGesture = async (event) => {
    if (!floatingAutoplayPending || !floatingSiteAudio?.paused) return;
    if (event.target?.closest?.('.floating-music-button')) return;
    await playFloatingSiteAudio({ restart: true, markPendingOnBlock: false });
    if (!floatingAutoplayPending) {
      ['pointerdown', 'touchstart', 'keydown'].forEach((type) => document.removeEventListener(type, startAfterFirstGesture, true));
    }
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach((type) => document.addEventListener(type, startAfterFirstGesture, true));
}

function initFloatingSiteAudio() {
  if (floatingSiteAudio || floatingSiteAudioButton) return;
  floatingSiteAudio = new Audio('./assets/audio/floating-site-theme.mp3');
  floatingSiteAudio.loop = true;
  floatingSiteAudio.preload = 'auto';

  floatingSiteAudioButton = document.createElement('button');
  floatingSiteAudioButton.className = 'floating-music-button';
  floatingSiteAudioButton.type = 'button';
  document.body.appendChild(floatingSiteAudioButton);
  updateFloatingSiteAudioButton(false, true);

  floatingSiteAudioButton.addEventListener('click', async () => {
    if (!floatingSiteAudio.paused) {
      floatingAutoplayPending = false;
      floatingSiteAudio.pause();
      return;
    }
    await playFloatingSiteAudio({ restart: true, markPendingOnBlock: false });
  });

  floatingSiteAudio.addEventListener('play', () => updateFloatingSiteAudioButton(true));
  floatingSiteAudio.addEventListener('pause', () => updateFloatingSiteAudioButton(false, floatingAutoplayPending));
  floatingSiteAudio.addEventListener('ended', () => updateFloatingSiteAudioButton(false, floatingAutoplayPending));
  bindFloatingAutoplayFallback();
  window.setTimeout(() => playFloatingSiteAudio({ restart: true, markPendingOnBlock: true }), 350);
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
      pauseFloatingSiteAudio();
      activeAudio = audio;
      audio.play();
    });

    restart.addEventListener('click', () => {
      if (activeAudio && activeAudio !== audio) activeAudio.pause();
      pauseFloatingSiteAudio();
      audio.currentTime = 0;
      activeAudio = audio;
      audio.play();
    });

    audio.addEventListener('play', () => { toggle.textContent = 'Pause'; });
    audio.addEventListener('pause', () => { toggle.textContent = 'Play'; });
    audio.addEventListener('ended', () => { toggle.textContent = 'Play'; });
  });
}

function renderGalleryMedia(item) {
  const isBeforeAfter = item.mediaType === 'beforeAfterImage';
  const currentLink = isBeforeAfter && activeCompareSide === 'before' ? item.beforeLink : (item.afterLink || item.link);
  const label = isBeforeAfter ? itemCompareLabel(item, activeCompareSide) : item.category;
  const currentMediaType = itemCurrentMediaType(item);
  const posterLink = currentMediaType === 'video' && isBeforeAfter ? item.beforeLink : currentLink;
  const mediaMarkup = currentMediaType === 'video'
    ? `<video class="gallery-full-media gallery-video" poster="${escapeHtml(drivePreview(posterLink, 1600))}" playsinline webkit-playsinline controls preload="metadata"><source src="${escapeHtml(driveDirect(currentLink))}" type="video/mp4" /></video>`
    : `<img class="gallery-full-media" src="${escapeHtml(drivePreview(currentLink, 2200))}" alt="${escapeHtml(item.title)} ${escapeHtml(label)}" />`;
  return `
    <div class="gallery-media-frame">
      <span class="gallery-side-label">${escapeHtml(label)}${currentMediaType === 'video' ? ' · VIDEO' : ''}</span>
      ${mediaMarkup}
    </div>
  `;
}

function renderGallery() {
  const lightbox = document.querySelector('#portfolio-lightbox');
  if (!lightbox) return;
  const items = filteredGalleryItems();
  if (!items.length) return;
  activeGalleryIndex = (activeGalleryIndex + items.length) % items.length;
  const item = items[activeGalleryIndex];
  const isBeforeAfter = item.mediaType === 'beforeAfterImage';
  lightbox.innerHTML = `
    <div class="gallery-shell" role="dialog" aria-modal="true" aria-label="Portfolio gallery">
      <div class="gallery-topbar">
        <button class="gallery-close" type="button" aria-label="Close gallery">×</button>
        <div class="gallery-title-block">
          <span>${escapeHtml(item.category)}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </div>
        <label class="gallery-category-menu">
          <span class="sr-only">Gallery category</span>
          <select class="gallery-category-select" aria-label="Choose gallery category">
            ${galleryCategories().map((category) => `<option value="${escapeHtml(category)}" ${category === activeGalleryCategory ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="gallery-stage">
        <button class="gallery-nav gallery-prev" type="button" aria-label="Previous item">‹</button>
        ${renderGalleryMedia(item)}
        <button class="gallery-nav gallery-next" type="button" aria-label="Next item">›</button>
      </div>
      <div class="gallery-caption-bar">
        ${isBeforeAfter ? `
          <div class="compare-toggle" role="group" aria-label="Before after toggle">
            <button class="${activeCompareSide === 'before' ? 'active' : ''}" type="button" data-compare-side="before">${escapeHtml(itemCompareLabel(item, 'before'))}</button>
            <button class="${activeCompareSide === 'after' ? 'active' : ''}" type="button" data-compare-side="after">${escapeHtml(itemCompareLabel(item, 'after'))}</button>
          </div>
        ` : ''}
        <p>${escapeHtml(item.caption)}</p>
        <span>${activeGalleryIndex + 1} of ${items.length}</span>
      </div>
    </div>
  `;
  bindGalleryControls();
  startGalleryVideo();
}

function openGallery(globalIndex) {
  const item = galleryItems()[globalIndex];
  activeGalleryCategory = item?.category || 'All';
  activeCompareSide = item?.mediaType === 'beforeAfterImage' ? itemDefaultCompareSide(item) : 'after';
  const items = filteredGalleryItems();
  activeGalleryIndex = Math.max(0, items.findIndex((entry) => entry === item));
  document.body.classList.add('gallery-open');
  document.querySelector('#portfolio-lightbox')?.removeAttribute('hidden');
  renderGallery();
}

function openGalleryCategory(category = 'All') {
  activeGalleryCategory = category;
  activeGalleryIndex = 0;
  const firstItem = filteredGalleryItems()[0];
  activeCompareSide = firstItem?.mediaType === 'beforeAfterImage' ? itemDefaultCompareSide(firstItem) : 'after';
  document.body.classList.add('gallery-open');
  document.querySelector('#portfolio-lightbox')?.removeAttribute('hidden');
  renderGallery();
}

function closeGallery() {
  stopGalleryMedia();
  document.body.classList.remove('gallery-open');
  document.querySelector('#portfolio-lightbox')?.setAttribute('hidden', '');
}

function stopGalleryMedia() {
  document.querySelectorAll('#portfolio-lightbox video').forEach((video) => {
    video.pause();
    video.removeAttribute('src');
    video.querySelectorAll('source').forEach((source) => source.removeAttribute('src'));
    video.load();
  });
}

function startGalleryVideo() {
  const video = document.querySelector('#portfolio-lightbox video');
  if (!video) return;
  video.pause();
  video.currentTime = 0;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.load();
}

function moveGallery(direction) {
  stopGalleryMedia();
  const items = filteredGalleryItems();
  activeGalleryIndex = (activeGalleryIndex + direction + items.length) % items.length;
  const nextItem = items[activeGalleryIndex];
  activeCompareSide = nextItem?.mediaType === 'beforeAfterImage' ? itemDefaultCompareSide(nextItem) : 'after';
  renderGallery();
}

function renderWebsiteShowcase() {
  if (!websiteShowcaseTrack) return;
  const sites = data.websiteShowcase || [];
  websiteShowcaseTrack.innerHTML = sites.map((site, index) => `
    <article class="website-card" aria-label="${escapeHtml(site.title)} website preview">
      <a class="website-shot" href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeHtml(site.title)} live website">
        <img src="${escapeHtml(site.image)}" alt="Mobile screenshot of ${escapeHtml(site.title)}" loading="${index === 0 ? 'eager' : 'lazy'}" />
      </a>
      <div class="website-card-body">
        <span class="badge">${escapeHtml(site.tag || 'Live Website')}</span>
        <h3>${escapeHtml(site.title)}</h3>
        <p>${escapeHtml(site.description)}</p>
        <a class="button button-dark website-link" href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer">View Live Site</a>
      </div>
    </article>
  `).join('');
}

function bindGalleryControls() {
  const lightbox = document.querySelector('#portfolio-lightbox');
  lightbox.querySelector('.gallery-close')?.addEventListener('click', closeGallery);
  lightbox.querySelector('.gallery-prev')?.addEventListener('click', () => moveGallery(-1));
  lightbox.querySelector('.gallery-next')?.addEventListener('click', () => moveGallery(1));
  lightbox.querySelectorAll('[data-compare-side]').forEach((button) => {
    button.addEventListener('click', () => {
      activeCompareSide = button.dataset.compareSide;
      renderGallery();
    });
  });
  lightbox.querySelector('.gallery-category-select')?.addEventListener('change', (event) => {
    stopGalleryMedia();
    activeGalleryCategory = event.target.value;
    activeGalleryIndex = 0;
    const firstItem = filteredGalleryItems()[0];
    activeCompareSide = firstItem?.mediaType === 'beforeAfterImage' ? itemDefaultCompareSide(firstItem) : 'after';
    renderGallery();
  });
  lightbox.querySelector('.gallery-stage')?.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  lightbox.querySelector('.gallery-stage')?.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) > 50) moveGallery(delta > 0 ? -1 : 1);
  }, { passive: true });
}

function ensureLightbox() {
  if (!galleryItems().length || document.querySelector('#portfolio-lightbox')) return;
  const lightbox = document.createElement('div');
  lightbox.id = 'portfolio-lightbox';
  lightbox.className = 'portfolio-lightbox';
  lightbox.hidden = true;
  document.body.appendChild(lightbox);
  document.addEventListener('keydown', (event) => {
    if (!document.body.classList.contains('gallery-open')) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'ArrowLeft') moveGallery(-1);
    if (event.key === 'ArrowRight') moveGallery(1);
  });
}

function setCheckoutMessage(message, isError = false) {
  const messageEl = document.querySelector('#checkout-message');
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.classList.toggle('is-error', isError);
}

function setNotifyMessage(message, isError = false) {
  const messageEl = document.querySelector('#notify-message');
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.classList.toggle('is-error', isError);
}

function formatEventDate(value) {
  if (!value) return 'Date/time TBA';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date(value));
}

function formatEventPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency || 'usd').toUpperCase() }).format(Number(cents || 0) / 100);
}

function renderAvailableDates(events = []) {
  const panel = document.querySelector('#date-picker-panel');
  const form = document.querySelector('#checkout-form');
  const notifyForm = document.querySelector('#notify-form');
  const eventIdInput = document.querySelector('#event-id');
  if (!panel || !form || !notifyForm || !eventIdInput) return;

  const availableEvents = events.filter((event) => !event.is_sold_out && Number(event.seats_remaining || 0) > 0);
  if (!availableEvents.length) {
    panel.innerHTML = `
      <h3>No current date has been set yet.</h3>
      <p>Please come back again, or select <strong>Notify Me</strong> and leave your email address to receive a notification once a date has been arranged.</p>
    `;
    form.hidden = true;
    notifyForm.hidden = false;
    eventIdInput.value = '';
    return;
  }

  form.hidden = false;
  notifyForm.hidden = true;
  eventIdInput.value = availableEvents[0].id;
  panel.innerHTML = `
    <h3>Choose your session date</h3>
    <div class="date-picker-list">
      ${availableEvents.map((event, index) => `
        <label class="date-option">
          <input type="radio" name="selected_event" value="${escapeHtml(event.id)}" ${index === 0 ? 'checked' : ''} />
          <span>
            <strong>${escapeHtml(event.title || 'Boss Up Bootcamp')}</strong>
            <span>${escapeHtml(formatEventDate(event.starts_at))}</span>
            <span>${escapeHtml(event.location || 'Location TBA')} · ${escapeHtml(formatEventPrice(event.price_cents, event.currency))}</span>
            <small>${escapeHtml(event.seats_remaining)} seat${Number(event.seats_remaining) === 1 ? '' : 's'} left</small>
          </span>
        </label>
      `).join('')}
    </div>
  `;
  panel.querySelectorAll('input[name="selected_event"]').forEach((input) => {
    input.addEventListener('change', () => { eventIdInput.value = input.value; });
  });
}

async function loadAvailableDates() {
  const panel = document.querySelector('#date-picker-panel');
  if (!panel) return;
  try {
    const response = await fetch('/api/create-checkout-session');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Unable to load available dates');
    renderAvailableDates(body.events || []);
  } catch (error) {
    panel.innerHTML = '<p class="form-note is-error">Available dates could not load right now. Please try again shortly.</p>';
  }
}

function checkoutPayload(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function bindForm() {
  const form = document.querySelector('#checkout-form');
  const notifyForm = document.querySelector('#notify-form');
  if (notifyForm) {
    notifyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = notifyForm.querySelector('button[type="submit"]');
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = 'Saving...';
      setNotifyMessage('Adding you to the notification list...');
      try {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'notify-date', ...Object.fromEntries(new FormData(notifyForm).entries()) }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Unable to save notification request');
        notifyForm.reset();
        setNotifyMessage('You are on the list. We will notify you once a date is arranged.');
      } catch (error) {
        setNotifyMessage(error.message || 'Unable to save your email. Please try again.', true);
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.event_id?.value) {
      setCheckoutMessage('Please choose an available session date before checkout.', true);
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>Opening Stripe...</span><small>Secure checkout</small>';
    setCheckoutMessage('Creating your secure checkout session...');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload(form)),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.url) throw new Error(body.error || 'Unable to start checkout');
      window.location.href = body.url;
    } catch (error) {
      setCheckoutMessage(error.message || 'Unable to start checkout. Please try again.', true);
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  });
}

function bindRevealCards() {
  const cards = document.querySelectorAll('.reveal-card:not(.is-visible)');
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

ensureLightbox();
initFloatingSiteAudio();
bindCarousel();
bindDropdowns();
bindNavigation();
renderLearn();
renderTabs();
renderProjects();
renderTimeline();
renderMusicPlaylist();
renderWebsiteShowcase();
loadAvailableDates();
bindForm();
bindRevealCards();

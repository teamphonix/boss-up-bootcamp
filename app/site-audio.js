(() => {
  const AUDIO_SRC = './assets/audio/floating-site-theme.mp3';
  const STORAGE_KEY = 'bossUpFloatingSiteAudioState';
  const SAVE_INTERVAL_MS = 750;

  if (window.BossUpFloatingSiteAudio?.initialized) return;

  let audio;
  let button;
  let autoplayPending = false;
  let saveTimer;
  let restoredState = null;

  function safeParseState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveState(overrides = {}) {
    if (!audio) return;
    const state = {
      src: AUDIO_SRC,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      playing: !audio.paused && !audio.ended,
      updatedAt: Date.now(),
      ...overrides,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function savedPlaybackPosition(state) {
    const duration = Number(state.duration) || Number(audio?.duration) || 0;
    let nextTime = Number(state.currentTime) || 0;
    if (state.playing && state.updatedAt) {
      nextTime += Math.max(0, Date.now() - Number(state.updatedAt)) / 1000;
    }
    if (duration > 0) return nextTime % duration;
    return Math.max(0, nextTime);
  }

  function updateButton(isPlaying = false, isPending = false) {
    if (!button) return;
    button.classList.toggle('is-playing', isPlaying);
    button.classList.toggle('is-autoplay-pending', isPending && !isPlaying);
    button.setAttribute('aria-label', isPlaying ? 'Pause site music' : 'Play site music');
    button.setAttribute('aria-pressed', String(isPlaying));
    button.innerHTML = `
      <span class="floating-music-icon" aria-hidden="true">${isPlaying ? '❚❚' : '▶'}</span>
      <span class="floating-music-label">${isPlaying ? 'Pause' : (isPending ? 'Tap for Sound' : 'Play')}</span>
    `;
  }

  async function play({ restart = false, markPendingOnBlock = false } = {}) {
    if (!audio) return false;
    if (restart) audio.currentTime = 0;
    try {
      await audio.play();
      autoplayPending = false;
      updateButton(true);
      saveState({ playing: true });
      return true;
    } catch (error) {
      autoplayPending = Boolean(markPendingOnBlock);
      updateButton(false, autoplayPending);
      saveState({ playing: false });
      console.warn('Site music autoplay was blocked or failed.', error);
      return false;
    }
  }

  function pause() {
    if (!audio) return;
    autoplayPending = false;
    audio.pause();
    saveState({ playing: false });
    updateButton(false);
  }

  function bindAutoplayFallback() {
    const startAfterFirstGesture = async (event) => {
      if (!autoplayPending || !audio?.paused) return;
      if (event.target?.closest?.('.floating-music-button')) return;
      await play({ markPendingOnBlock: false });
      if (!autoplayPending) {
        ['pointerdown', 'touchstart', 'keydown'].forEach((type) => document.removeEventListener(type, startAfterFirstGesture, true));
      }
    };
    ['pointerdown', 'touchstart', 'keydown'].forEach((type) => document.addEventListener(type, startAfterFirstGesture, true));
  }

  function restorePosition() {
    if (!restoredState || restoredState.src !== AUDIO_SRC) return;
    const nextTime = savedPlaybackPosition(restoredState);
    if (Number.isFinite(nextTime) && nextTime >= 0) {
      try { audio.currentTime = nextTime; } catch (error) {}
    }
  }

  function init() {
    if (audio || button) return;
    restoredState = safeParseState();
    audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = 'auto';

    button = document.createElement('button');
    button.className = 'floating-music-button';
    button.type = 'button';
    document.body.appendChild(button);

    const shouldResume = Boolean(restoredState.playing && restoredState.src === AUDIO_SRC);
    updateButton(false, shouldResume);

    button.addEventListener('click', async () => {
      if (!audio.paused) {
        pause();
        return;
      }
      await play({ restart: false, markPendingOnBlock: false });
    });

    audio.addEventListener('loadedmetadata', () => {
      restorePosition();
      if (shouldResume) play({ markPendingOnBlock: true });
    }, { once: true });
    audio.addEventListener('play', () => {
      updateButton(true);
      saveTimer = window.setInterval(saveState, SAVE_INTERVAL_MS);
      saveState({ playing: true });
    });
    audio.addEventListener('pause', () => {
      window.clearInterval(saveTimer);
      updateButton(false, autoplayPending);
      saveState({ playing: false });
    });
    audio.addEventListener('timeupdate', () => saveState());
    audio.addEventListener('ended', () => {
      window.clearInterval(saveTimer);
      updateButton(false, autoplayPending);
      saveState({ playing: false, currentTime: 0 });
    });

    window.addEventListener('pagehide', () => saveState());
    window.addEventListener('beforeunload', () => saveState());
    bindAutoplayFallback();

    if (!shouldResume && !restoredState.src) {
      window.setTimeout(() => play({ restart: false, markPendingOnBlock: true }), 350);
    }
  }

  window.BossUpFloatingSiteAudio = {
    initialized: true,
    init,
    play,
    pause,
    saveState,
    get audio() { return audio; },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

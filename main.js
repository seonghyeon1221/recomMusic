import './style.css';

// --- State ---
let player;
let currentMode = localStorage.getItem('yt_mode') || 'focus';

let playlists = JSON.parse(localStorage.getItem('yt_playlists')) || { focus: [], gaming: [], mix: [] };

// Initialize Playlists: Only keep pinned items across reloads
for (let key in playlists) {
  if (Array.isArray(playlists[key])) {
    playlists[key] = playlists[key].filter(item => item.pinned === true);
  }
}

let playlist = playlists[currentMode] || [];
let currentIndices = JSON.parse(localStorage.getItem('yt_indices')) || { focus: 0, gaming: 0, mix: 0 };
let currentIndex = currentIndices[currentMode] || 0;

let isPlaying = false;
let progressInterval = null;
let repeatMode = 0; 
let playbackSpeed = 1;

// Timer & XP State
let timerSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

let focusXP = parseInt(localStorage.getItem('yt_focus_xp_v2') || '0');
let focusLevel = parseInt(localStorage.getItem('yt_focus_level_v2') || '1');
if (focusLevel > 60) focusLevel = 60; // Max 60 stacks

// --- Elements ---
const ytLinkInput = document.getElementById('yt-link-input');
const btnAdd = document.getElementById('btn-add');
const playlistEl = document.getElementById('playlist');
const btnClearAll = document.getElementById('btn-clear-all');
const btnRecommend = document.getElementById('btn-recommend');
const btnOriginal = document.getElementById('btn-original');

const btnPlay = document.getElementById('btn-play');
const playIcon = document.getElementById('play-icon');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnRepeat = document.getElementById('btn-repeat');
const repeatIcon = document.getElementById('repeat-icon');
const btnStop = document.getElementById('btn-stop');
const btnRewind = document.getElementById('btn-rewind');
const btnForward = document.getElementById('btn-forward');
const btnSpeed = document.getElementById('btn-speed');
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');

const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const progressWrapper = document.getElementById('progress-wrapper');
const progressFill = document.getElementById('progress-fill');

const modeBtns = document.querySelectorAll('.mode-btn');

// Mixer & Audio
const btnToggleMixer = document.getElementById('btn-toggle-mixer');
const mixerHotbar = document.getElementById('mixer-hotbar');
const btnRain = document.getElementById('btn-ambient-rain');
const volRain = document.getElementById('ambient-volume-rain');
const audioRain = document.getElementById('audio-rain');
const btnFire = document.getElementById('btn-ambient-fire');
const volFire = document.getElementById('ambient-volume-fire');
const audioFire = document.getElementById('audio-fire');
const btnWind = document.getElementById('btn-ambient-wind');
const volWind = document.getElementById('ambient-volume-wind');
const audioWind = document.getElementById('audio-wind');

// Focus & Timer
const appContainer = document.getElementById('main-ui') || document.getElementById('app-container');
const focusOverlay = document.getElementById('focus-overlay');
const btnLock = document.getElementById('btn-lock-screen');


const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerReset = document.getElementById('btn-timer-reset');
const focusOrbBtn = document.getElementById('focus-orb-btn');
const xpLevel = document.getElementById('xp-level');
const xpPercentage = document.getElementById('xp-percentage');
const xpBarFill = document.getElementById('xp-bar-fill');
const levelUpToast = document.getElementById('level-up-toast');

const searchModal = document.getElementById('search-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const searchLoading = document.getElementById('search-loading');
const searchResultsList = document.getElementById('search-results');

// --- Initialization ---
// Inject YT API dynamically to avoid race conditions with module defer
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('player', {
    height: '100', width: '100', videoId: '',
    playerVars: { 'playsinline': 1, 'controls': 0, 'disablekb': 1, 'fs': 0, 'rel': 0 },
    events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError }
  });
};

function onPlayerReady(event) {
  if (player && typeof player.setVolume === 'function') player.setVolume(volumeSlider.value);
  applyMode(currentMode);
  updateDashboardText();
  applyVisualRewards();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true; updatePlayPauseUI(); startProgressBar(); updateSongInfoFromPlayer();
    if (player && typeof player.setPlaybackRate === 'function') player.setPlaybackRate(playbackSpeed);
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false; updatePlayPauseUI(); stopProgressBar();

    if (event.data === YT.PlayerState.ENDED) {
      if (repeatMode === 2) { player.seekTo(0); player.playVideo(); } else { playNext(true); }
    }
  }
}
function onPlayerError(event) {
  console.error("YouTube Player Error", event.data);
  setTimeout(() => playNext(true), 2000);
}

// --- Mode Logic ---
function savePlaylists() {
  playlists[currentMode] = playlist;
  currentIndices[currentMode] = currentIndex;
  localStorage.setItem('yt_playlists', JSON.stringify(playlists));
  localStorage.setItem('yt_indices', JSON.stringify(currentIndices));
}

function applyMode(mode) {
  currentMode = mode;
  localStorage.setItem('yt_mode', mode);
  document.body.setAttribute('data-theme', mode);
  modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

  playlist = playlists[currentMode] || [];
  currentIndex = currentIndices[currentMode] || 0;
  if (currentIndex >= playlist.length) currentIndex = 0;

  renderPlaylist();
  
  if (mode === 'gaming') {
    btnLock.style.display = 'none'; waves = [];
    appContainer.style.display = 'flex'; focusOverlay.style.display = 'none'; document.querySelector('.top-nav').style.display = 'flex';
  } else if (mode === 'focus') {
    btnLock.style.display = 'flex'; waves = waveProfiles.focus;
    appContainer.style.display = 'flex'; focusOverlay.style.display = 'none'; document.querySelector('.top-nav').style.display = 'flex';
  } else if (mode === 'mix') {
    btnLock.style.display = 'none'; waves = waveProfiles.mix;
    appContainer.style.display = 'flex'; focusOverlay.style.display = 'none'; document.querySelector('.top-nav').style.display = 'flex';
  }
  
  initializeParticles();
  
  if (player && player.loadVideoById) {
    if (playlist.length > 0 && playlist[currentIndex]) {
      player.loadVideoById(playlist[currentIndex].id);
      updateSongInfoFallback(); player.pauseVideo();
      isPlaying = false; updatePlayPauseUI();
    } else {
      player.stopVideo(); songTitle.innerText = 'Awaiting Track'; songArtist.innerText = 'Add a URL to start';
    }
  }
}
modeBtns.forEach(btn => btn.addEventListener('click', (e) => applyMode(e.currentTarget.dataset.mode)));

// --- Timer, XP & Progressive Rewards Logic ---
function formatTimer(sec) {
  let h = Math.floor(sec / 3600); let m = Math.floor((sec % 3600) / 60); let s = Math.floor(sec % 60);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateDashboardText() {
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  const timerStr = `${m}:${s}`;
  const xpStr = focusXP.toFixed(2);
  const displayEl = document.getElementById('xp-text-display');
  if (displayEl) {
    displayEl.textContent = `LV.${focusLevel}(${xpStr}%) / ${timerStr}`;
  }
  const overlayEl = document.getElementById('overlay-timer');
  if (overlayEl) overlayEl.textContent = `Lv.${focusLevel} (${timerStr})`;
  
  const xpBarFill = document.getElementById('xp-bar-fill');
  if (xpBarFill) xpBarFill.style.width = `${focusXP}%`;
}

// 60-stack Reward System Config
let snowParticlesCount = 0;
let orbParticlesCount = 0;

function applyVisualRewards() {
  // Reset states
  document.documentElement.style.setProperty('--glow-opacity', '0');
  document.body.classList.remove('hue-shifted');
  appContainer.classList.remove('floating-ui');
  document.body.classList.remove('vignette-pulse');
  snowParticlesCount = 0;
  orbParticlesCount = 0;

  // Stacks 1-10: Snow particles
  if (focusLevel >= 1) {
    snowParticlesCount = Math.min(focusLevel * 10, 100);
  }
  // Stacks 11-20: Subtle glowing background
  if (focusLevel >= 11) {
    const glowLevel = Math.min(focusLevel - 10, 10);
    document.documentElement.style.setProperty('--glow-opacity', (glowLevel * 0.1).toString());
  }
  // Stacks 21-30: Glowing Orbs
  if (focusLevel >= 21) {
    orbParticlesCount = Math.min((focusLevel - 20) * 3, 30);
  }
  // Stacks 31-40: Hue shift on background
  if (focusLevel >= 31) {
    const shift = Math.min((focusLevel - 30) * 10, 100);
    document.documentElement.style.setProperty('--hue-shift', `${shift}deg`);
    document.body.classList.add('hue-shifted');
  }
  // Stacks 41-50: UI float animation
  if (focusLevel >= 41) {
    appContainer.classList.add('floating-ui');
  }
  // Stacks 51-60: Pulse vignette
  if (focusLevel >= 51) {
    document.body.classList.add('vignette-pulse');
  }
  
  initializeParticles();
}

function addXP(amount) {
  if (focusLevel >= 60) {
    focusXP = 100; updateDashboardText(); return;
  }
  focusXP += amount;
  if (focusXP >= 100) {
    const levelsGained = Math.floor(focusXP / 100);
    focusLevel = Math.min(focusLevel + levelsGained, 60);
    focusXP = focusXP % 100;
    
    levelUpToast.classList.add('show');
    setTimeout(() => levelUpToast.classList.remove('show'), 3000);
    
    applyVisualRewards();
  }
  updateDashboardText();
  localStorage.setItem('yt_focus_xp_v2', focusXP);
  localStorage.setItem('yt_focus_level_v2', focusLevel);
}

function toggleTimer() {
  if (isTimerRunning) {
    clearInterval(timerInterval); isTimerRunning = false; timerInterval = null;
    btnTimerToggle.innerHTML = '<i class="ph-fill ph-play"></i> 시작/멈춤'; focusOrbBtn.classList.add('paused');
  } else {
    isTimerRunning = true; btnTimerToggle.innerHTML = '<i class="ph-fill ph-pause"></i> 시작/멈춤'; focusOrbBtn.classList.remove('paused');
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateDashboardText();
      addXP(100 / 300); // 5 minutes per level
    }, 1000);
  }
}
btnTimerToggle.addEventListener('click', toggleTimer);
btnTimerReset.addEventListener('click', () => { 
  timerSeconds = 0; 
  focusXP = 0;
  updateDashboardText(); 
  updateDashboardText();
  localStorage.setItem('yt_focus_xp_v2', focusXP);
});
btnLock.addEventListener('click', () => {
  if (!player || typeof player.getPlayerState !== 'function' || player.getPlayerState() !== YT.PlayerState.PLAYING) {
    alert("음악을 먼저 재생해주세요! (재생 중일 때만 집중모드 진입이 가능합니다)");
    return;
  }
  appContainer.style.display = 'none'; focusOverlay.style.display = 'flex'; document.querySelector('.top-nav').style.display = 'none';
});
focusOrbBtn.addEventListener('click', () => {
  appContainer.style.display = 'flex'; focusOverlay.style.display = 'none'; document.querySelector('.top-nav').style.display = 'flex';
});

// --- Audio Mixer Logic ---
btnToggleMixer.addEventListener('click', () => { mixerHotbar.classList.toggle('show'); });
function setupAudioToggle(btn, vol, audio) {
  let isActive = false;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isActive) { 
      audio.pause(); 
      isActive = false; 
      btn.classList.remove('active'); 
    } else { 
      audio.volume = vol.value / 100; 
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.error("Audio play error:", err));
      }
      isActive = true; 
      btn.classList.add('active'); 
    }
  });
  vol.addEventListener('input', (e) => {
    audio.volume = e.target.value / 100;
  });
}
setupAudioToggle(btnRain, volRain, audioRain);
setupAudioToggle(btnFire, volFire, audioFire);
setupAudioToggle(btnWind, volWind, audioWind);

// --- Playlist Operations ---
function extractVideoId(urlOrId) {
  if (!urlOrId) return null;
  if (urlOrId.length === 11 && !urlOrId.includes('http')) return urlOrId;
  const match = urlOrId.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
}
btnAdd.addEventListener('click', () => {
  const videoId = extractVideoId(ytLinkInput.value.trim());
  if (videoId) { addVideoToPlaylist(videoId); ytLinkInput.value = ''; }
  else alert("올바르지 않은 URL입니다.");
});
ytLinkInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnAdd.click(); });
btnClearAll.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (confirm("정말 전체 삭제하시겠습니까? 고정된 곡도 삭제됩니다.")) {
    playlist = []; currentIndex = 0; savePlaylists(); renderPlaylist();
    if (player && typeof player.stopVideo === 'function') player.stopVideo();
    isPlaying = false; updatePlayPauseUI(); updateSongInfoFallback();
    timeCurrent.innerText = "-:--"; progressFill.style.width = "0%";
  }
});
async function addVideoToPlaylist(videoId, initialTitle = null) {
  const newItem = { id: videoId, title: initialTitle || `Track ${videoId}`, pinned: false };
  playlist.push(newItem); savePlaylists(); renderPlaylist();
  if (!initialTitle) {
    try {
      const response = await fetch(`/api/info?id=${videoId}`); const data = await response.json();
      if (data && data.title) {
        const itemInList = playlist.find(i => i === newItem);
        if (itemInList) { itemInList.title = data.title; savePlaylists(); renderPlaylist(); }
      }
    } catch (err) {}
  }
  if (!isPlaying) {
    const pinnedIndex = playlist.findIndex(i => i.pinned);
    currentIndex = pinnedIndex !== -1 ? pinnedIndex : 0;
    playCurrentItem();
  }
}
function renderPlaylist() {
  playlistEl.innerHTML = '';
  playlist.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = `playlist-item ${index === currentIndex ? 'active' : ''} ${item.pinned ? 'is-pinned' : ''}`;
    const num = (index + 1).toString().padStart(2, '0');
    li.innerHTML = `<div class="item-num">${num}</div><div class="item-title" title="${item.title}">${item.title}</div>
      <div class="item-actions">
        <button class="action-btn pin-btn ${item.pinned ? 'active' : ''}" data-index="${index}" title="현재 모드에 영구 고정"><i class="ph ph-push-pin"></i></button>
        <button class="action-btn up" data-index="${index}"><i class="ph ph-caret-up"></i></button>
        <button class="action-btn down" data-index="${index}"><i class="ph ph-caret-down"></i></button>
        <button class="action-btn delete" data-index="${index}"><i class="ph ph-trash"></i></button>
      </div>`;
    li.addEventListener('click', (e) => {
      if(e.target.closest('.item-actions')) return;
      currentIndex = index; playCurrentItem();
    });
    li.querySelector('.pin-btn').addEventListener('click', (e) => {
      e.stopPropagation(); playlist[index].pinned = !playlist[index].pinned; savePlaylists(); renderPlaylist();
    });
    li.querySelector('.up').addEventListener('click', (e) => { e.stopPropagation(); moveItem(index, -1); });
    li.querySelector('.down').addEventListener('click', (e) => { e.stopPropagation(); moveItem(index, 1); });
    li.querySelector('.delete').addEventListener('click', (e) => { e.stopPropagation(); deleteItem(index); });
    playlistEl.appendChild(li);
  });
}
function moveItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= playlist.length) return;
  [playlist[index], playlist[newIndex]] = [playlist[newIndex], playlist[index]];
  if (currentIndex === index) currentIndex = newIndex; else if (currentIndex === newIndex) currentIndex = index;
  savePlaylists(); renderPlaylist();
}
function deleteItem(index) {
  playlist.splice(index, 1);
  if (currentIndex === index) {
    if (playlist.length > 0) { currentIndex = currentIndex % playlist.length; playCurrentItem(); }
    else { currentIndex = 0; if (player && player.stopVideo) player.stopVideo(); isPlaying = false; updatePlayPauseUI(); updateSongInfoFallback(); }
  } else if (currentIndex > index) currentIndex--;
  savePlaylists(); renderPlaylist();
}

// --- Player Controls ---
function playCurrentItem() {
  if (currentIndex < 0 || currentIndex >= playlist.length) return;
  if (player && player.loadVideoById) {
    player.loadVideoById(playlist[currentIndex].id);
    isPlaying = true; updatePlayPauseUI(); renderPlaylist(); savePlaylists();
  }
}
function playNext(auto = false) {
  if (playlist.length === 0) return;
  if (auto && repeatMode === 0 && currentIndex === playlist.length - 1) {
    if (player && player.stopVideo) player.stopVideo();
    isPlaying = false; updatePlayPauseUI(); currentIndex = 0; savePlaylists(); updateSongInfoFallback(); renderPlaylist();
    return;
  }
  currentIndex = (currentIndex + 1) % playlist.length; playCurrentItem();
}
function playPrev() {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length; playCurrentItem();
}
btnPlay.addEventListener('click', () => {
  if (!player || typeof player.getPlayerState !== 'function' || playlist.length === 0) return;
  if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});
btnNext.addEventListener('click', () => playNext(false));
btnPrev.addEventListener('click', playPrev);
btnStop.addEventListener('click', () => {
  if (player && player.stopVideo) { player.stopVideo(); isPlaying = false; updatePlayPauseUI(); if (player.seekTo) player.seekTo(0, true); }
});
btnRewind.addEventListener('click', () => { if (player && player.seekTo) player.seekTo(Math.max(0, player.getCurrentTime() - 10), true); });
btnForward.addEventListener('click', () => { if (player && player.seekTo) player.seekTo(Math.min(player.getDuration(), player.getCurrentTime() + 10), true); });
btnSpeed.addEventListener('click', () => {
  playbackSpeed = playbackSpeed === 1 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
  btnSpeed.innerText = playbackSpeed.toFixed(1) + 'x';
  if (player && player.setPlaybackRate) player.setPlaybackRate(playbackSpeed);
});
btnRepeat.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  if (repeatMode === 0) { repeatIcon.className = 'ph ph-repeat'; btnRepeat.style.opacity = '0.5'; btnRepeat.style.color = ''; }
  else if (repeatMode === 1) { repeatIcon.className = 'ph ph-repeat'; btnRepeat.style.opacity = '1'; btnRepeat.style.color = 'var(--accent)'; }
  else { repeatIcon.className = 'ph ph-repeat-once'; btnRepeat.style.opacity = '1'; btnRepeat.style.color = 'var(--accent)'; }
});
volumeSlider.addEventListener('input', (e) => {
  const val = e.target.value; if (player && player.setVolume) player.setVolume(val);
  volumeIcon.className = val == 0 ? 'ph ph-speaker-none' : val < 50 ? 'ph ph-speaker-low' : 'ph ph-speaker-high';
});
progressWrapper.addEventListener('click', (e) => {
  if (!player || !player.getDuration) return;
  const rect = progressWrapper.getBoundingClientRect(); const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const seekTime = percent * player.getDuration();
  player.seekTo(seekTime, true); progressFill.style.width = `${percent * 100}%`; timeCurrent.innerText = formatTime(seekTime);
});
function startProgressBar() {
  stopProgressBar();
  progressInterval = setInterval(() => {
    if (player && player.getCurrentTime && player.getDuration) {
      const cur = player.getCurrentTime(); const tot = player.getDuration();
      if (tot > 0) { timeCurrent.innerText = formatTimer(cur); timeTotal.innerText = formatTimer(tot); progressFill.style.width = `${(cur / tot) * 100}%`; }
      else { timeCurrent.innerText = "0:00"; timeTotal.innerText = "0:00"; }
    }
  }, 1000);
}
function stopProgressBar() { if (progressInterval) { clearInterval(progressInterval); progressInterval = null; } }
function updatePlayPauseUI() { playIcon.className = isPlaying ? 'ph-fill ph-pause' : 'ph-fill ph-play'; }
function updateSongInfoFromPlayer() {
  if (!player || !player.getVideoData) return;
  const data = player.getVideoData();
  if (data && data.title) {
    songTitle.innerText = data.title; songArtist.innerText = data.author || 'YouTube Audio';
    if (currentIndex >= 0 && currentIndex < playlist.length) { playlist[currentIndex].title = data.title; savePlaylists(); renderPlaylist(); }
  }
}
function updateSongInfoFallback() {
  if (currentIndex >= 0 && playlist[currentIndex]) { songTitle.innerText = playlist[currentIndex].title || 'Unknown Title'; songArtist.innerText = 'YouTube Audio'; }
  else { songTitle.innerText = 'Awaiting Track'; songArtist.innerText = 'Paste a YouTube link to begin'; }
}
btnCloseModal.addEventListener('click', () => searchModal.style.display = 'none');
btnOriginal.addEventListener('click', () => {
  if (currentIndex >= 0 && playlist[currentIndex]) window.open(`https://www.youtube.com/watch?v=${playlist[currentIndex].id}`, '_blank');
  else alert("먼저 노래를 재생해 주세요!");
});
btnRecommend.addEventListener('click', async () => {
  if (currentIndex >= 0 && playlist[currentIndex]) {
    let title = playlist[currentIndex].title.replace(/\[.*?\]|\(.*?\)/g, '').replace(/MV|Music Video|Lyrics|Audio|Official/gi, '').trim();
    if (!title) title = 'music';
    searchModal.style.display = 'flex'; searchLoading.style.display = 'flex'; searchResultsList.style.display = 'none'; searchResultsList.innerHTML = '';
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(title + " 비슷한 노래")}`); const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.length === 0) { searchLoading.innerHTML = "검색 결과가 없습니다."; return; }
      data.forEach(item => {
        const li = document.createElement('li'); li.className = 'search-result-item';
        li.innerHTML = `<div class="search-result-title">${item.title}</div><div class="search-result-author">${item.author}</div>`;
        li.addEventListener('click', () => { addVideoToPlaylist(item.id, item.title); searchModal.style.display = 'none'; });
        searchResultsList.appendChild(li);
      });
      searchLoading.style.display = 'none'; searchResultsList.style.display = 'flex';
    } catch (err) { searchLoading.innerHTML = "검색 중 오류가 발생했습니다."; }
  } else alert("먼저 노래를 재생해 주세요!");
});

// --- Ocean Wave & Particle Engine ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initializeParticles(); }
window.addEventListener('resize', resizeCanvas); 

let time = 0;
const waveProfiles = {
  focus: [
    { amplitude: 120, wavelength: 0.001, speed: 0.008, color: 'rgba(0, 100, 150, 0.05)', offsetRatio: 0.3 },
    { amplitude: 80, wavelength: 0.002, speed: 0.012, color: 'rgba(0, 150, 200, 0.05)', offsetRatio: 0.5 },
    { amplitude: 50, wavelength: 0.003, speed: 0.015, color: 'rgba(0, 200, 255, 0.04)', offsetRatio: 0.7 },
    { amplitude: 30, wavelength: 0.004, speed: 0.02, color: 'rgba(0, 255, 255, 0.03)', offsetRatio: 0.85 }
  ],
  gaming: [
    { amplitude: 180, wavelength: 0.005, speed: 0.05, color: 'rgba(255, 0, 255, 0.05)', offsetRatio: 0.4 },
    { amplitude: 120, wavelength: 0.008, speed: 0.08, color: 'rgba(138, 43, 226, 0.06)', offsetRatio: 0.6 },
    { amplitude: 80, wavelength: 0.01, speed: 0.12, color: 'rgba(255, 20, 147, 0.04)', offsetRatio: 0.75 },
    { amplitude: 40, wavelength: 0.02, speed: 0.15, color: 'rgba(0, 255, 255, 0.04)', offsetRatio: 0.9 }
  ],
  mix: [
    { amplitude: 100, wavelength: 0.0005, speed: 0.003, color: 'rgba(255, 69, 0, 0.03)', offsetRatio: 0.5 },
    { amplitude: 70, wavelength: 0.0008, speed: 0.005, color: 'rgba(255, 140, 0, 0.04)', offsetRatio: 0.7 },
    { amplitude: 40, wavelength: 0.001, speed: 0.007, color: 'rgba(255, 105, 180, 0.03)', offsetRatio: 0.85 }
  ]
};
let waves = waveProfiles.focus;

let particlesArray = [];
function initializeParticles() {
  particlesArray = [];
  const pType = currentMode === 'focus' ? 'firefly' : (currentMode === 'gaming' ? 'spark' : 'snow');
  let count = snowParticlesCount;
  if (pType === 'spark') count = Math.max(snowParticlesCount * 2, 120); 
  if (pType === 'firefly') count = Math.max(snowParticlesCount, 40);
  
  // Base particles
  for(let i = 0; i < count; i++) {
    let speedY, speedX, radius;
    if (pType === 'firefly') {
      speedY = -(Math.random() * 1 + 0.5); speedX = Math.random() * 1 - 0.5; radius = Math.random() * 2 + 1.5;
    } else if (pType === 'spark') {
      speedY = -(Math.random() * 2 + 0.5); speedX = (Math.random() - 0.5) * 1.5; radius = Math.random() * 3 + 1;
    } else {
      speedY = Math.random() * 2 + 0.5; speedX = Math.random() * 1 - 0.5; radius = Math.random() * 2 + 1;
    }
    
    particlesArray.push({
      type: pType,
      x: Math.random() * canvas.width,
      y: pType === 'spark' ? Math.random() * canvas.height : Math.random() * canvas.height,
      radius: radius, speedX: speedX, speedY: speedY,
      opacity: pType === 'spark' ? Math.random() * 0.7 + 0.3 : Math.random() * 0.5 + 0.3,
      life: pType === 'spark' ? Math.random() * 100 : 0
    });
  }
  // Orb particles
  for(let i = 0; i < orbParticlesCount; i++) {
    particlesArray.push({
      type: 'orb',
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 5 + 3,
      speedX: Math.random() * 0.5 - 0.25,
      speedY: -(Math.random() * 1.5 + 0.5), // going up
      opacity: Math.random() * 0.6 + 0.4
    });
  }
}

function drawParticles() {
  particlesArray.forEach(p => {
    let fillStr = '';
    let glowStr = '';
    if (p.type === 'snow') {
      fillStr = `rgba(255, 255, 255, ${p.opacity})`;
    } else if (p.type === 'firefly') {
      fillStr = `rgba(255, 220, 100, ${p.opacity})`; 
      glowStr = `rgba(255, 200, 50, ${p.opacity * 0.3})`;
    } else if (p.type === 'spark') {
      const colors = ['rgba(255, 69, 0, ', 'rgba(255, 140, 0, ', 'rgba(255, 215, 0, '];
      const colorPrefix = colors[Math.floor((p.x + p.y) % 3)]; 
      fillStr = `${colorPrefix}${p.opacity})`;
      glowStr = `${colorPrefix}${p.opacity * 0.3})`;
    } else {
      fillStr = `rgba(255, 235, 59, ${p.opacity})`; 
      glowStr = `rgba(255, 235, 59, ${p.opacity * 0.3})`;
    }
    
    // Performance optimized glow (Draw larger faint circle behind)
    if (glowStr) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowStr;
      ctx.fill();
    }
    
    // Main particle
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = fillStr;
    ctx.fill();
    
    // Update position
    p.x += p.speedX; p.y += p.speedY;
    
    if (p.type === 'spark') {
      p.life += 1;
      p.x += Math.sin(p.life * 0.05) * 0.5; // Wavering motion
      p.opacity -= 0.002; // slow fade out
      if (p.opacity <= 0 || p.y < -10) {
        p.y = canvas.height + 10; p.x = Math.random() * canvas.width;
        p.speedY = -(Math.random() * 2 + 0.5); p.speedX = (Math.random() - 0.5) * 1.5;
        p.opacity = Math.random() * 0.7 + 0.3;
        p.life = Math.random() * 100;
      }
    }
    
    // Boundary check
    if (p.type === 'snow' && p.y > canvas.height) { p.y = 0; p.x = Math.random() * canvas.width; }
    if (p.type === 'firefly' && p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
    if (p.type === 'orb' && p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
  });
}

let lastFrameTime = 0;
const fpsInterval = 1000 / 30; // Cap to 30 FPS

function animateEngine(currentTime) {
  requestAnimationFrame(animateEngine);
  
  if (!currentTime) currentTime = 0;
  const elapsed = currentTime - lastFrameTime;
  if (elapsed < fpsInterval) return; // Skip frame
  lastFrameTime = currentTime - (elapsed % fpsInterval);
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Draw Waves (Optimized path drawing)
  if (waves && waves.length > 0) {
    waves.forEach(wave => {
      ctx.beginPath(); ctx.moveTo(0, canvas.height);
      for (let x = 0; x <= canvas.width; x += 30) { // Increased step size for performance
        const offset = canvas.height * wave.offsetRatio;
        const y = Math.sin(x * wave.wavelength + time * wave.speed) * wave.amplitude + offset;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, canvas.height); ctx.fillStyle = wave.color; ctx.fill(); ctx.closePath();
    });
  }
  
  // 2. Draw Particles
  if (particlesArray.length > 0) drawParticles();
  
  time += 1; 
}
resizeCanvas();
animateEngine();

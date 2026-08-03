import './style.css';

// --- State ---
let player;
let playlist = []; // Array of { id, title }
let currentIndex = -1;
let isPlaying = false;
let progressInterval = null;
let repeatMode = 0; // 0: off, 1: all, 2: one
let playbackSpeed = 1;

// --- Elements ---
const ytLinkInput = document.getElementById('yt-link-input');
const btnAdd = document.getElementById('btn-add');
const playlistEl = document.getElementById('playlist');
const btnClearAll = document.getElementById('btn-clear-all');
const btnRecommend = document.getElementById('btn-recommend');

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
const equalizer = document.getElementById('equalizer');

// --- Initialization ---

window.onYouTubeIframeAPIReady = function() {
  player = new YT.Player('player', {
    height: '100',
    width: '100',
    videoId: '',
    playerVars: {
      'playsinline': 1,
      'controls': 0,
      'disablekb': 1,
      'fs': 0,
      'rel': 0
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
};

function onPlayerReady(event) {
  if (player && typeof player.setVolume === 'function') {
    player.setVolume(volumeSlider.value);
  }
  loadPlaylistFromStorage();
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayPauseUI();
    startProgressBar();
    updateSongInfoFromPlayer();
    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(playbackSpeed);
    }
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updatePlayPauseUI();
    stopProgressBar();
    if (event.data === YT.PlayerState.ENDED) {
      if (repeatMode === 2) {
        player.seekTo(0);
        player.playVideo();
      } else {
        playNext(true); 
      }
    }
  }
}

function onPlayerError(event) {
  console.error("YouTube Player Error", event.data);
  setTimeout(() => playNext(true), 2000);
}

// --- Helpers ---

function extractVideoId(urlOrId) {
  if (!urlOrId) return null;
  if (urlOrId.length === 11 && !urlOrId.includes('http')) return urlOrId;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "-:--";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' + sec : sec}`;
}

// --- Playlist Management ---

function savePlaylist() {
  localStorage.setItem('yt_playlist', JSON.stringify(playlist));
}

function loadPlaylistFromStorage() {
  const saved = localStorage.getItem('yt_playlist');
  if (saved) {
    try {
      playlist = JSON.parse(saved);
      renderPlaylist();
      if (playlist.length > 0) {
        currentIndex = 0;
        updateSongInfoFallback();
      }
    } catch (e) {
      console.error(e);
    }
  }
}

btnAdd.addEventListener('click', () => {
  const input = ytLinkInput.value.trim();
  const videoId = extractVideoId(input);
  if (videoId) {
    addVideoToPlaylist(videoId);
    ytLinkInput.value = '';
  } else {
    alert("Invalid YouTube URL or ID");
  }
});
ytLinkInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') btnAdd.click();
});

btnClearAll.addEventListener('click', () => {
  if (playlist.length === 0) return;
  if (confirm("정말 플레이리스트를 전체 삭제하시겠습니까?")) {
    playlist = [];
    currentIndex = -1;
    savePlaylist();
    renderPlaylist();
    if (player && typeof player.stopVideo === 'function') {
      player.stopVideo();
    }
    isPlaying = false;
    updatePlayPauseUI();
    updateSongInfoFallback();
    timeCurrent.innerText = "-:--";
    progressFill.style.width = "0%";
  }
});

// Modal Elements
const searchModal = document.getElementById('search-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const searchLoading = document.getElementById('search-loading');
const searchResultsList = document.getElementById('search-results');
const btnOriginal = document.getElementById('btn-original');

btnCloseModal.addEventListener('click', () => {
  searchModal.style.display = 'none';
});

btnOriginal.addEventListener('click', () => {
  if (currentIndex >= 0 && playlist[currentIndex]) {
    const videoId = playlist[currentIndex].id;
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  } else {
    alert("먼저 노래를 재생해 주세요!");
  }
});

btnRecommend.addEventListener('click', async () => {
  if (currentIndex >= 0 && playlist[currentIndex]) {
    let title = playlist[currentIndex].title;
    // Clean up title (remove 'MV', 'Lyrics', brackets, etc.)
    title = title.replace(/\[.*?\]|\(.*?\)/g, '').replace(/MV|Music Video|Lyrics|Audio|Official/gi, '').trim();
    if (!title) title = 'music';
    const query = encodeURIComponent(title + " 비슷한 노래");
    
    // Open modal
    searchModal.style.display = 'flex';
    searchLoading.style.display = 'flex';
    searchResultsList.style.display = 'none';
    searchResultsList.innerHTML = '';
    
    try {
      const response = await fetch(`/api/search?q=${query}`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      if (data.length === 0) {
        searchLoading.innerHTML = "검색 결과가 없습니다.";
        return;
      }
      
      data.forEach(item => {
        const li = document.createElement('li');
        li.className = 'search-result-item';
        li.innerHTML = `
          <div class="search-result-title">${item.title}</div>
          <div class="search-result-author">${item.author}</div>
        `;
        li.addEventListener('click', () => {
          addVideoToPlaylist(item.id, item.title);
          searchModal.style.display = 'none';
        });
        searchResultsList.appendChild(li);
      });
      
      searchLoading.style.display = 'none';
      searchResultsList.style.display = 'flex';
      
    } catch (err) {
      console.error(err);
      searchLoading.innerHTML = "검색 중 오류가 발생했습니다.";
    }
    
  } else {
    alert("먼저 노래를 재생해 주세요!");
  }
});

async function addVideoToPlaylist(videoId, initialTitle = null) {
  const newItem = {
    id: videoId,
    title: initialTitle || `Track ${videoId}`
  };
  playlist.push(newItem);
  savePlaylist();
  renderPlaylist();

  if (!initialTitle) {
    // Fetch real title from backend
    try {
      const response = await fetch(`/api/info?id=${videoId}`);
      const data = await response.json();
      if (data && !data.error && data.title) {
        // Find item and update
        const itemInList = playlist.find(i => i === newItem);
        if (itemInList) {
          itemInList.title = data.title;
          savePlaylist();
          renderPlaylist();
        }
      }
    } catch (err) {
      console.error("Failed to fetch title:", err);
    }
  }

  if (playlist.length === 1 && !isPlaying) {
    currentIndex = 0;
    playCurrentItem();
  }
}

function renderPlaylist() {
  playlistEl.innerHTML = '';
  playlist.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
    
    // Format track number as 01, 02, etc.
    const num = (index + 1).toString().padStart(2, '0');
    
    li.innerHTML = `
      <div class="item-num">${num}</div>
      <div class="item-title" title="${item.title}">${item.title}</div>
      <div class="item-actions">
        <button class="action-btn up" data-index="${index}"><i class="ph ph-caret-up"></i></button>
        <button class="action-btn down" data-index="${index}"><i class="ph ph-caret-down"></i></button>
        <button class="action-btn delete" data-index="${index}"><i class="ph ph-trash"></i></button>
      </div>
    `;

    li.addEventListener('click', (e) => {
      // Prevent double triggering if clicked on action buttons
      if(e.target.closest('.item-actions')) return;
      currentIndex = index;
      playCurrentItem();
    });

    li.querySelector('.up').addEventListener('click', (e) => {
      e.stopPropagation();
      moveItem(index, -1);
    });
    li.querySelector('.down').addEventListener('click', (e) => {
      e.stopPropagation();
      moveItem(index, 1);
    });
    li.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteItem(index);
    });

    playlistEl.appendChild(li);
  });
}

function moveItem(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= playlist.length) return;
  
  const temp = playlist[index];
  playlist[index] = playlist[newIndex];
  playlist[newIndex] = temp;
  
  if (currentIndex === index) {
    currentIndex = newIndex;
  } else if (currentIndex === newIndex) {
    currentIndex = index;
  }
  
  savePlaylist();
  renderPlaylist();
}

function deleteItem(index) {
  playlist.splice(index, 1);
  if (currentIndex === index) {
    if (playlist.length > 0) {
      currentIndex = currentIndex % playlist.length;
      playCurrentItem();
    } else {
      currentIndex = -1;
      if (player && typeof player.stopVideo === 'function') player.stopVideo();
      isPlaying = false;
      updatePlayPauseUI();
      updateSongInfoFallback();
    }
  } else if (currentIndex > index) {
    currentIndex--;
  }
  savePlaylist();
  renderPlaylist();
}

// --- Player Controls ---

function playCurrentItem() {
  if (currentIndex < 0 || currentIndex >= playlist.length) return;
  const item = playlist[currentIndex];
  
  if (player && player.loadVideoById) {
    player.loadVideoById(item.id);
    isPlaying = true;
    updatePlayPauseUI();
    renderPlaylist();
  }
}

function playNext(auto = false) {
  if (playlist.length === 0) return;
  if (auto && repeatMode === 0 && currentIndex === playlist.length - 1) {
    if (player && typeof player.stopVideo === 'function') player.stopVideo();
    isPlaying = false;
    updatePlayPauseUI();
    currentIndex = 0;
    updateSongInfoFallback();
    renderPlaylist();
    timeCurrent.innerText = "-:--";
    progressFill.style.width = "0%";
    return;
  }
  currentIndex = (currentIndex + 1) % playlist.length;
  playCurrentItem();
}

function playPrev() {
  if (playlist.length === 0) return;
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  playCurrentItem();
}

btnPlay.addEventListener('click', () => {
  if (!player || typeof player.getPlayerState !== 'function') return;
  if (playlist.length === 0) return;
  
  if (player.getPlayerState() === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    if (player.getPlayerState() === YT.PlayerState.CUED || player.getPlayerState() === YT.PlayerState.UNSTARTED) {
      if (currentIndex >= 0) {
        player.playVideo();
      } else {
        currentIndex = 0;
        playCurrentItem();
      }
    } else {
      player.playVideo();
    }
  }
});

btnNext.addEventListener('click', () => playNext(false));
btnPrev.addEventListener('click', playPrev);

btnStop.addEventListener('click', () => {
  if (player && typeof player.stopVideo === 'function') {
    player.stopVideo();
    isPlaying = false;
    updatePlayPauseUI();
    timeCurrent.innerText = "-:--";
    progressFill.style.width = "0%";
    if (typeof player.seekTo === 'function') {
      player.seekTo(0, true);
    }
  }
});

btnRewind.addEventListener('click', () => {
  if (player && typeof player.getCurrentTime === 'function') {
    let t = player.getCurrentTime();
    player.seekTo(Math.max(0, t - 10), true);
  }
});

btnForward.addEventListener('click', () => {
  if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
    let t = player.getCurrentTime();
    player.seekTo(Math.min(player.getDuration(), t + 10), true);
  }
});

btnSpeed.addEventListener('click', () => {
  if (playbackSpeed === 1) playbackSpeed = 1.25;
  else if (playbackSpeed === 1.25) playbackSpeed = 1.5;
  else if (playbackSpeed === 1.5) playbackSpeed = 2;
  else playbackSpeed = 1;
  
  btnSpeed.innerText = playbackSpeed.toFixed(1) + 'x';
  if (player && typeof player.setPlaybackRate === 'function') {
    player.setPlaybackRate(playbackSpeed);
  }
});

btnRepeat.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  updateRepeatUI();
});

function updateRepeatUI() {
  if (repeatMode === 0) {
    repeatIcon.className = 'ph ph-repeat';
    btnRepeat.style.opacity = '0.5';
    btnRepeat.style.color = '';
  } else if (repeatMode === 1) {
    repeatIcon.className = 'ph ph-repeat';
    btnRepeat.style.opacity = '1';
    btnRepeat.style.color = 'var(--accent)';
  } else if (repeatMode === 2) {
    repeatIcon.className = 'ph ph-repeat-once';
    btnRepeat.style.opacity = '1';
    btnRepeat.style.color = 'var(--accent)';
  }
}

volumeSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  if (player && typeof player.setVolume === 'function') {
    player.setVolume(val);
  }
  updateVolumeIcon(val);
});

function updateVolumeIcon(val) {
  if (val == 0) {
    volumeIcon.className = 'ph ph-speaker-none';
  } else if (val < 50) {
    volumeIcon.className = 'ph ph-speaker-low';
  } else {
    volumeIcon.className = 'ph ph-speaker-high';
  }
}

// Progress seeking
progressWrapper.addEventListener('click', (e) => {
  if (!player || typeof player.getDuration !== 'function') return;
  const duration = player.getDuration();
  if (!duration) return;

  const rect = progressWrapper.getBoundingClientRect();
  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const seekTime = percent * duration;
  
  player.seekTo(seekTime, true);
  progressFill.style.width = `${percent * 100}%`;
  timeCurrent.innerText = formatTime(seekTime);
});

function startProgressBar() {
  stopProgressBar();
  progressInterval = setInterval(() => {
    if (player && player.getCurrentTime && player.getDuration) {
      const cur = player.getCurrentTime();
      const tot = player.getDuration();
      if (tot > 0) {
        timeCurrent.innerText = formatTime(cur);
        timeTotal.innerText = formatTime(tot);
        progressFill.style.width = `${(cur / tot) * 100}%`;
      }
    }
  }, 1000);
}

function stopProgressBar() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// --- UI Updates ---

function updatePlayPauseUI() {
  if (isPlaying) {
    playIcon.className = 'ph ph-pause-fill';
  } else {
    playIcon.className = 'ph ph-play-fill';
  }
}

function updateSongInfoFromPlayer() {
  if (!player || !player.getVideoData) return;
  const data = player.getVideoData();
  if (data && data.title) {
    songTitle.innerText = data.title;
    songArtist.innerText = data.author || 'YouTube Audio';
    
    if (currentIndex >= 0 && currentIndex < playlist.length) {
      playlist[currentIndex].title = data.title;
      savePlaylist();
      renderPlaylist();
    }
  }
}

function updateSongInfoFallback() {
  if (currentIndex >= 0 && playlist[currentIndex]) {
    songTitle.innerText = playlist[currentIndex].title || 'Unknown Title';
    songArtist.innerText = 'YouTube Audio';
  } else {
    songTitle.innerText = 'Awaiting Track';
    songArtist.innerText = 'Paste a YouTube link to begin';
  }
}

// --- Ocean Wave Background Animation ---
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let time = 0;

// Deep sea waves
const waves = [
  { amplitude: 120, wavelength: 0.001, speed: 0.008, color: 'rgba(0, 100, 150, 0.05)', offsetRatio: 0.3 },
  { amplitude: 80, wavelength: 0.002, speed: 0.012, color: 'rgba(0, 150, 200, 0.05)', offsetRatio: 0.5 },
  { amplitude: 50, wavelength: 0.003, speed: 0.015, color: 'rgba(0, 200, 255, 0.04)', offsetRatio: 0.7 },
  { amplitude: 30, wavelength: 0.004, speed: 0.02, color: 'rgba(0, 255, 255, 0.03)', offsetRatio: 0.85 }
];

function animateWaves() {
  // Clear the canvas to the dark ocean color
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  waves.forEach(wave => {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    // Draw sine wave
    for (let x = 0; x <= canvas.width; x += 15) {
      const offset = canvas.height * wave.offsetRatio;
      const y = Math.sin(x * wave.wavelength + time * wave.speed) * wave.amplitude + offset;
      ctx.lineTo(x, y);
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fillStyle = wave.color;
    ctx.fill();
    ctx.closePath();
  });
  
  time += 1;
  requestAnimationFrame(animateWaves);
}
animateWaves();

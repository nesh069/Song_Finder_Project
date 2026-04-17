const API_KEY = '0e68bf1b61df246bcfd6b8bac456cf13';
const LASTFM_URL = 'https://ws.audioscrobbler.com/2.0/';
const DEEZER_URL = 'https://api.deezer.com/';
// This proxy helps bypass CORS issues for audio previews and API calls
const PROXY = 'https://corsproxy.io/?';

let allSongs = [];
let activeGenre = 'all';
let currentAudio = null;

// Deezer Genre IDs for regional music
const REGIONAL_GENRES = {
  'african': 2,
  'asian': 16,
  'latin': 197,
  'brazilian': 75,
  'indian': 81,
  'reggae': 144,
  'pop': 132,
  'hip-hop': 116,
  'rock': 152,
  'rnb': 165
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const sortSelect = document.getElementById('sort-select');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const spinner = document.getElementById('spinner');
  const resultsGrid = document.getElementById('results-grid');
  const emptyMsg = document.getElementById('empty-msg');
  const regionSelect = document.getElementById('region-select');

  // Load popular songs on start
  fetchSongs('', spinner, resultsGrid, emptyMsg, sortSelect, true);

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      if (query.length > 2) {
        fetchSongs(query, spinner, resultsGrid, emptyMsg, sortSelect);
      } else if (query.length === 0) {
        fetchSongs('', spinner, resultsGrid, emptyMsg, sortSelect, true);
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      fetchSongs(query || '', spinner, resultsGrid, emptyMsg, sortSelect, !query);
    });
  }

  if (regionSelect) {
    regionSelect.addEventListener('change', () => {
      const region = regionSelect.value;
      if (region) {
        fetchByRegion(region, spinner, resultsGrid, emptyMsg, sortSelect);
      } else {
        fetchSongs('', spinner, resultsGrid, emptyMsg, sortSelect, true);
      }
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGenre = btn.dataset.genre;
      applyFilters(sortSelect, resultsGrid, emptyMsg);
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      applyFilters(sortSelect, resultsGrid, emptyMsg);
    });
  }

  // Close modal when clicking outside
  window.onclick = (event) => {
    const modal = document.getElementById('song-modal');
    if (event.target == modal) {
      closeModal();
    }
  };
});

async function fetchByRegion(region, spinner, resultsGrid, emptyMsg, sortSelect) {
  const genreId = REGIONAL_GENRES[region];
  if (!genreId) return;

  // Use proxy for Deezer API call
  const url = `${PROXY}${encodeURIComponent(`${DEEZER_URL}editorial/${genreId}/charts`)}`;
  
  if (spinner) spinner.classList.remove('hidden');
  if (emptyMsg) emptyMsg.classList.add('hidden');

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.tracks?.data) {
      allSongs = [];
      renderCards([], resultsGrid, emptyMsg);
      return;
    }

    allSongs = data.tracks.data.map((track, index) => ({
      title: track.title,
      artist: track.artist.name,
      genre: region === 'african' ? 'afrobeats' : 'pop', 
      popularity: Math.floor(track.rank / 1000) || index + 1,
      previewUrl: track.preview,
      albumCover: track.album?.cover_medium,
      duration: track.duration,
      albumName: track.album?.title
    }));

    renderCards(allSongs, resultsGrid, emptyMsg);
  } catch (error) {
    console.error('Regional fetch error:', error);
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
}

async function fetchSongs(query, spinner, resultsGrid, emptyMsg, sortSelect, usePopular = false) {
  let url = usePopular 
    ? `${LASTFM_URL}?method=chart.getTopTracks&api_key=${API_KEY}&format=json&limit=20`
    : `${LASTFM_URL}?method=track.search&track=${encodeURIComponent(query)}&api_key=${API_KEY}&format=json&limit=20`;

  if (spinner) spinner.classList.remove('hidden');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    let tracksArray = usePopular ? data.tracks?.track : data.results?.trackmatches?.track;

    if (!tracksArray) {
      allSongs = [];
      renderCards([], resultsGrid, emptyMsg);
      return;
    }

    allSongs = (Array.isArray(tracksArray) ? tracksArray : [tracksArray]).map((track, index) => ({
      title: track.name,
      artist: typeof track.artist === 'string' ? track.artist : track.artist.name,
      genre: 'loading...',
      popularity: Math.floor(parseInt(track.listeners || 0) / 1000) || index + 1,
      previewUrl: null
    }));

    renderCards(allSongs, resultsGrid, emptyMsg);

    for (let i = 0; i < allSongs.length; i++) {
      const deezerData = await fetchDeezerData(allSongs[i].artist, allSongs[i].title);
      if (deezerData) {
        allSongs[i] = { ...allSongs[i], ...deezerData };
        updateCard(i, allSongs[i], resultsGrid);
      }
      await delay(200); // Prevent hitting rate limits
    }
  } catch (error) {
    console.error('Fetch error:', error);
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
}

async function fetchDeezerData(artist, title) {
  try {
    const url = `${PROXY}${encodeURIComponent(`${DEEZER_URL}search?q=${artist} ${title}&limit=1`)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.data && data.data[0]) {
      const track = data.data[0];
      return {
        previewUrl: track.preview,
        albumCover: track.album?.cover_medium,
        duration: track.duration,
        albumName: track.album?.title
      };
    }
  } catch (e) { return null; }
}

function playPreview(url, button) {
  // If clicking a playing song, pause it
  if (currentAudio && currentAudio.src === url && !currentAudio.paused) {
    currentAudio.pause();
    button.innerHTML = '▶ Play Preview';
    return;
  }

  // Stop any existing audio
  if (currentAudio) {
    currentAudio.pause();
    document.querySelectorAll('.play-btn').forEach(btn => btn.innerHTML = '▶ Play Preview');
  }

  currentAudio = new Audio(url);
  currentAudio.play().catch(err => console.error("Playback error:", err));
  button.innerHTML = '⏸ Pause';

  currentAudio.onended = () => {
    button.innerHTML = '▶ Play Preview';
    currentAudio = null;
  };
}

// Ensure global access for inline onclick handlers
window.playPreview = playPreview;
window.closeModal = closeModal;
window.playPreviewFromModal = playPreviewFromModal;

function openModal(song) {
  const modal = document.createElement('div');
  modal.id = 'song-modal';
  modal.className = 'modal';
  modal.style.display = 'flex';
  
  const duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'N/A';

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn" onclick="closeModal()">&times;</span>
      ${song.albumCover ? `<img src="${song.albumCover}" class="modal-cover">` : ''}
      <h2>${song.title}</h2>
      <p>${song.artist}</p>
      <div class="modal-details">
        <p>Album: ${song.albumName || 'N/A'}</p>
        <p>Duration: ${duration}</p>
      </div>
      ${song.previewUrl ? `<button class="modal-play-btn" onclick="playPreviewFromModal('${song.previewUrl}')">▶ Play Preview</button>` : ''}
    </div>`;
  document.body.appendChild(modal);
}

function closeModal() {
  const modal = document.getElementById('song-modal');
  if (modal) modal.remove();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

function playPreviewFromModal(url) {
  const btn = document.querySelector('.modal-play-btn');
  playPreview(url, btn);
}

function updateCard(index, song, resultsGrid) {
  const card = resultsGrid.children[index];
  if (!card) return;
  if (song.previewUrl && !card.querySelector('.play-btn')) {
    const btn = document.createElement('button');
    btn.className = 'play-btn';
    btn.innerHTML = '▶ Play Preview';
    btn.onclick = (e) => {
      e.stopPropagation();
      playPreview(song.previewUrl, btn);
    };
    card.appendChild(btn);
  }
}

function renderCards(songs, resultsGrid, emptyMsg) {
  resultsGrid.innerHTML = '';
  if (songs.length === 0) {
    emptyMsg?.classList.remove('hidden');
    return;
  }
  emptyMsg?.classList.add('hidden');
  songs.forEach(song => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3 class="card__title">${song.title}</h3>
      <p class="card__artist">${song.artist}</p>
      <span class="card__popularity">Hot: ${song.popularity}</span>
    `;
    card.onclick = () => openModal(song);
    resultsGrid.appendChild(card);
  });
}

function applyFilters(sortSelect, resultsGrid, emptyMsg) {
  let filtered = [...allSongs];
  if (activeGenre !== 'all') {
    filtered = filtered.filter(s => s.genre === activeGenre);
  }
  if (sortSelect.value === 'popularity') {
    filtered.sort((a, b) => b.popularity - a.popularity);
  }
  renderCards(filtered, resultsGrid, emptyMsg);
}



// ===== Config =====
const CONFIG = {
  LASTFM_API_KEY: '0e68bf1b61df246bcfd6b8bac456cf13',
  LASTFM_URL: 'https://ws.audioscrobbler.com/2.0/',
  DEEZER_URL: 'https://api.deezer.com/',
  PROXY: 'https://corsproxy.io/?',
  LIMIT: 20,
}

const REGIONAL_GENRES = {
  african: 2, asian: 16, latin: 197,
  brazilian: 75, indian: 81, reggae: 144,
  pop: 132, 'hip-hop': 116, rock: 152, rnb: 165,
}

// ===== State =====
const state = {
  allSongs: [],
  activeGenre: 'all',
  currentAudio: null,
  currentPage: 1,
  isFetching: false,
  currentQuery: '',
  usePopular: true,
  activeTab: 'search',
  favorites: JSON.parse(localStorage.getItem('sf_fav') || '[]'),
  recentlyViewed: JSON.parse(localStorage.getItem('sf_recent') || '[]'),
}

// ===== Utils =====
function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function debounce(fn, ms) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

function saveFavorites() {
  localStorage.setItem('sf_fav', JSON.stringify(state.favorites))
}

function saveRecent() {
  localStorage.setItem('sf_recent', JSON.stringify(state.recentlyViewed))
}

// ===== Toast =====
function showToast(message, type) {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  const t = document.createElement('div')
  t.className = `toast toast--${type}`
  t.textContent = message
  t.setAttribute('role', 'alert')
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 4500)
}

// ===== API =====
async function fetchSongs(query, page, usePopular) {
  let url
  if (usePopular) {
    url = `${CONFIG.LASTFM_URL}?method=chart.getTopTracks&api_key=${CONFIG.LASTFM_API_KEY}&format=json&limit=${CONFIG.LIMIT}&page=${page}`
  } else {
    url = `${CONFIG.LASTFM_URL}?method=track.search&track=${encodeURIComponent(query)}&api_key=${CONFIG.LASTFM_API_KEY}&format=json&limit=${CONFIG.LIMIT}&page=${page}`
  }
  const res = await fetch(url)
  const data = await res.json()
  const tracksArray = usePopular ? data.tracks?.track : data.results?.trackmatches?.track
  return tracksArray ? (Array.isArray(tracksArray) ? tracksArray : [tracksArray]) : []
}

async function fetchDeezerData(artist, title) {
  try {
    const url = `${CONFIG.PROXY}${encodeURIComponent(`${CONFIG.DEEZER_URL}search?q=${artist} ${title}&limit=1`)}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.data && data.data[0]) {
      const t = data.data[0]
      return {
        previewUrl: t.preview,
        albumCover: t.album?.cover_medium,
        duration: t.duration,
        albumName: t.album?.title,
        genre: DEEZER_GENRE_MAP[t.genre_id] || null,
      }
    }
  } catch (_) {}
  return null
}

async function fetchByRegion(region) {
  const genreId = REGIONAL_GENRES[region]
  if (!genreId) return []
  const url = `${CONFIG.PROXY}${encodeURIComponent(`${CONFIG.DEEZER_URL}editorial/${genreId}/charts`)}`
  const res = await fetch(url)
  const data = await res.json()
  if (!data.tracks?.data) return []
  return data.tracks.data.map((track, index) => ({
    title: track.title,
    artist: track.artist.name,
    genre: region === 'african' ? 'afrobeats' : track.genre_id ? (DEEZER_GENRE_MAP[track.genre_id] || 'other') : 'other',
    popularity: Math.floor(track.rank / 1000) || index + 1,
    previewUrl: track.preview,
    albumCover: track.album?.cover_medium,
    duration: track.duration,
    albumName: track.album?.title,
    deezerId: track.id,
  }))
}

function cleanLyricsQuery(str) {
  return str.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*feat\.?\s*.*/i, '').replace(/\s*ft\.?\s*.*/i, '').trim()
}

async function fetchLyrics(artist, title) {
  const cleanArtist = cleanLyricsQuery(artist)
  const cleanTitle = cleanLyricsQuery(title)

  const tryApi = async (art, tit) => {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(art)}/${encodeURIComponent(tit)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data.lyrics || null
  }

  const lyrics = await tryApi(cleanArtist, cleanTitle)
  if (lyrics) return lyrics

  if (cleanArtist !== artist || cleanTitle !== title) {
    const fallback = await tryApi(artist, title)
    if (fallback) return fallback
  }

  return null
}

// ===== Audio Player =====
function playPreview(url, button) {
  if (state.currentAudio && state.currentAudio.src === url && !state.currentAudio.paused) {
    state.currentAudio.pause()
    updatePlayBtn(button, 'stopped')
    state.currentAudio = null
    hideVisualizer()
    return
  }
  if (state.currentAudio) {
    state.currentAudio.pause()
    document.querySelectorAll('.play-btn').forEach(b => updatePlayBtn(b, 'stopped'))
    hideVisualizer()
  }
  const audio = new Audio(url)
  audio.play().catch(e => showToast('Preview unavailable', 'error'))
  state.currentAudio = audio
  updatePlayBtn(button, 'playing')
  showVisualizer(button)
  audio.onended = () => {
    updatePlayBtn(button, 'stopped')
    state.currentAudio = null
    hideVisualizer()
  }
}

function updatePlayBtn(btn, status) {
  if (!btn) return
  if (status === 'playing') {
    btn.innerHTML = '<span class="vis-bars"><span></span><span></span><span></span><span></span></span> Pause'
    btn.classList.add('is-playing')
  } else {
    btn.innerHTML = '▶ Play Preview'
    btn.classList.remove('is-playing')
  }
}

function showVisualizer(btn) {
  hideVisualizer()
  const viz = document.createElement('div')
  viz.className = 'vis-global'
  viz.innerHTML = '<span></span><span></span><span></span><span></span><span></span>'
  document.body.appendChild(viz)
}

function hideVisualizer() {
  const v = document.querySelector('.vis-global')
  if (v) v.remove()
}

function stopAudio() {
  if (state.currentAudio) {
    state.currentAudio.pause()
    state.currentAudio = null
    document.querySelectorAll('.play-btn').forEach(b => updatePlayBtn(b, 'stopped'))
    hideVisualizer()
  }
}

// ===== Favorites =====
function toggleFavorite(song) {
  const key = `${song.artist}|${song.title}`
  const idx = state.favorites.findIndex(f => `${f.artist}|${f.title}` === key)
  if (idx > -1) {
    state.favorites.splice(idx, 1)
    showToast(`Removed "${song.title}" from favorites`, 'info')
  } else {
    state.favorites.unshift(song)
    showToast(`Added "${song.title}" to favorites`, 'success')
  }
  saveFavorites()
  updateFavButtons()
  renderRecentFavSection()
}

function isFav(song) {
  const key = `${song.artist}|${song.title}`
  return state.favorites.some(f => `${f.artist}|${f.title}` === key)
}

function updateFavButtons() {
  document.querySelectorAll('.card__fav').forEach(btn => {
    const idx = btn.dataset.index
    if (idx !== undefined && state.allSongs[idx]) {
      btn.textContent = isFav(state.allSongs[idx]) ? '❤' : '♡'
      btn.setAttribute('aria-label', isFav(state.allSongs[idx]) ? 'Remove from favorites' : 'Add to favorites')
    }
  })
}

// ===== Recently Viewed =====
function addRecentlyViewed(song) {
  const key = `${song.artist}|${song.title}`
  state.recentlyViewed = state.recentlyViewed.filter(r => `${r.artist}|${r.title}` !== key)
  state.recentlyViewed.unshift(song)
  if (state.recentlyViewed.length > 6) state.recentlyViewed.pop()
  saveRecent()
  renderRecentFavSection()
}

function renderRecentFavSection() {
  const section = document.getElementById('recent-fav-section')
  if (!section) return

  const hasRecent = state.recentlyViewed.length > 0
  const hasFavs = state.favorites.length > 0

  if (!hasRecent && !hasFavs) {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  let html = ''
  if (hasFavs) {
    html += '<div class="rf-section"><h3 class="rf-title">⭐ Favorites</h3><div class="rf-grid">'
    state.favorites.slice(0, 6).forEach(song => {
      html += `<div class="rf-chip" onclick="openModalBySong('${encodeURIComponent(song.artist)}','${encodeURIComponent(song.title)}')">
        ${song.albumCover ? `<img src="${song.albumCover}" alt="" class="rf-img">` : ''}
        <div><strong>${escHtml(song.title)}</strong><br><small>${escHtml(song.artist)}</small></div>
      </div>`
    })
    html += '</div></div>'
  }
  if (hasRecent) {
    html += '<div class="rf-section"><h3 class="rf-title">🕐 Recently Viewed</h3><div class="rf-grid">'
    state.recentlyViewed.slice(0, 6).forEach(song => {
      const previewBtn = song.previewUrl
        ? `<button class="rf-play" onclick="event.stopPropagation();playPreviewFromChip('${encodeURIComponent(song.artist)}','${encodeURIComponent(song.title)}',this)" aria-label="Play ${song.title} preview">▶</button>`
        : ''
      html += `<div class="rf-chip" onclick="openModalBySong('${encodeURIComponent(song.artist)}','${encodeURIComponent(song.title)}')">
        ${song.albumCover ? `<img src="${song.albumCover}" alt="" class="rf-img">` : ''}
        <div><strong>${escHtml(song.title)}</strong><br><small>${escHtml(song.artist)}</small></div>
        ${previewBtn}
      </div>`
    })
    html += '</div></div>'
  }
  section.innerHTML = html
}

// ===== Tabs =====
function switchTab(tab) {
  state.activeTab = tab
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('tab--active', t.dataset.tab === tab)
    t.setAttribute('aria-selected', t.dataset.tab === tab)
  })
  const searchSection = document.querySelector('.search-section')
  const loadMore = document.getElementById('load-more-container')

  const recentFav = document.getElementById('recent-fav-section')

  if (tab === 'history') {
    searchSection.classList.add('hidden')
    loadMore.classList.add('hidden')
    if (recentFav) recentFav.classList.add('hidden')
    renderHistoryTab()
  } else {
    searchSection.classList.remove('hidden')
    if (recentFav) recentFav.classList.remove('hidden')
    const emptyMsg = document.getElementById('empty-msg')
    emptyMsg.textContent = 'No songs found. Try a different search.'
    applyFilters()
    if (state.allSongs.length >= 20) loadMore.classList.remove('hidden')
  }
}

function renderHistoryTab() {
  const grid = document.getElementById('results-grid')
  const emptyMsg = document.getElementById('empty-msg')
  grid.innerHTML = ''
  emptyMsg.classList.add('hidden')

  const hasFavs = state.favorites.length > 0
  const hasRecent = state.recentlyViewed.length > 0

  if (!hasFavs && !hasRecent) {
    emptyMsg.textContent = 'No history yet. Start searching for songs!'
    emptyMsg.classList.remove('hidden')
    return
  }

  if (hasFavs) {
    const header = document.createElement('div')
    header.className = 'section-header'
    header.innerHTML = '⭐ Favorites'
    grid.appendChild(header)
    state.favorites.forEach(song => grid.appendChild(createCardElement(song)))
  }

  if (hasRecent) {
    const header = document.createElement('div')
    header.className = 'section-header'
    header.innerHTML = '🕐 Recently Viewed'
    grid.appendChild(header)
    state.recentlyViewed.slice(0, 10).forEach(song => grid.appendChild(createCardElement(song)))
  }
}

function escHtml(str) {
  const d = document.createElement('div')
  d.textContent = str
  return d.innerHTML
}

window.openModalBySong = function(artistEnc, titleEnc) {
  const artist = decodeURIComponent(artistEnc)
  const title = decodeURIComponent(titleEnc)
  const song = state.allSongs.find(s => s.artist === artist && s.title === title) ||
               state.favorites.find(s => s.artist === artist && s.title === title) ||
               state.recentlyViewed.find(s => s.artist === artist && s.title === title)
  if (song) openModal(song)
}

window.playPreviewFromChip = function(artistEnc, titleEnc, btn) {
  const artist = decodeURIComponent(artistEnc)
  const title = decodeURIComponent(titleEnc)
  const song = state.allSongs.find(s => s.artist === artist && s.title === title) ||
               state.favorites.find(s => s.artist === artist && s.title === title) ||
               state.recentlyViewed.find(s => s.artist === artist && s.title === title)
  if (song && song.previewUrl) {
    playPreview(song.previewUrl, btn)
  }
}

// ===== Skeleton =====
function renderSkeletons(count) {
  const grid = document.getElementById('results-grid')
  grid.innerHTML = ''
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div')
    s.className = 'skeleton'
    s.setAttribute('aria-hidden', 'true')
    s.innerHTML = '<div class="skeleton__img"></div><div class="skeleton__line skeleton__line--title"></div><div class="skeleton__line skeleton__line--artist"></div><div class="skeleton__line skeleton__line--meta"></div>'
    grid.appendChild(s)
  }
}

// ===== Card Factory =====
function createCardElement(song, index) {
  const card = document.createElement('div')
  card.className = 'card'
  card.setAttribute('tabindex', '0')
  card.setAttribute('role', 'button')
  card.setAttribute('aria-label', `View details for ${song.title} by ${song.artist}`)

  const coverHtml = song.albumCover
    ? `<img src="${song.albumCover}" alt="${song.title} cover" class="card__img" loading="lazy">`
    : `<div class="card__img card__img--placeholder">🎵</div>`

  const genreHtml = song.genre && song.genre !== 'loading...' && song.genre !== 'unknown'
    ? `<span class="card__genre">${song.genre}</span>`
    : ''

  const idxAttr = index !== undefined ? ` data-index="${index}"` : ''
  const previewHtml = song.previewUrl
    ? `<button class="play-btn"${idxAttr} aria-label="Play preview of ${song.title}">▶ Play Preview</button>`
    : `<span class="no-preview">No preview</span>`

  card.innerHTML = `
    <div class="card__cover">
      ${coverHtml}
      <button class="card__fav" aria-label="${isFav(song) ? 'Remove from' : 'Add to'} favorites">${isFav(song) ? '❤' : '♡'}</button>
    </div>
    <div class="card__body">
      ${genreHtml}
      <h3 class="card__title">${escHtml(song.title)}</h3>
      <p class="card__artist">${escHtml(song.artist)}</p>
      <div class="card__footer">
        <span class="card__popularity">${song.popularity}</span>
        ${previewHtml}
      </div>
    </div>
  `

  card.querySelector('.play-btn')?.addEventListener('click', e => {
    e.stopPropagation()
    playPreview(song.previewUrl, e.currentTarget)
  })

  card.querySelector('.card__fav').addEventListener('click', e => {
    e.stopPropagation()
    toggleFavorite(song)
  })

  card.addEventListener('click', () => openModal(song))
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(song) } })

  return card
}

// ===== Render Cards =====
function renderCards(songs) {
  const grid = document.getElementById('results-grid')
  const emptyMsg = document.getElementById('empty-msg')
  grid.innerHTML = ''
  if (!songs.length) {
    emptyMsg.classList.remove('hidden')
    return
  }
  emptyMsg.classList.add('hidden')

  songs.forEach((song, i) => {
    grid.appendChild(createCardElement(song, i))
  })
}

function updateCard(index) {
  const grid = document.getElementById('results-grid')
  const card = grid.children[index]
  if (!card) return
  const song = state.allSongs[index]
  if (!song) return

  // Update genre badge if it was "loading..."
  if (song.genre && song.genre !== 'loading...' && song.genre !== 'unknown') {
    let existing = card.querySelector('.card__genre')
    if (!existing) {
      const body = card.querySelector('.card__body')
      if (body) {
        const genreBadge = document.createElement('span')
        genreBadge.className = 'card__genre'
        genreBadge.textContent = song.genre
        body.insertBefore(genreBadge, body.firstChild)
      }
    }
  }

  // Add album cover if we got it from Deezer
  if (song.albumCover) {
    const cover = card.querySelector('.card__img')
    if (cover && cover.classList.contains('card__img--placeholder')) {
      cover.outerHTML = `<img src="${song.albumCover}" alt="${song.title} cover" class="card__img" loading="lazy">`
    }
  }

  // Add play button if preview is now available
  if (song.previewUrl && !card.querySelector('.play-btn')) {
    const footer = card.querySelector('.card__footer')
    if (footer) {
      const noPrev = footer.querySelector('.no-preview')
      if (noPrev) noPrev.remove()
      const btn = document.createElement('button')
      btn.className = 'play-btn'
      btn.setAttribute('aria-label', `Play preview of ${song.title}`)
      btn.innerHTML = '▶ Play Preview'
      btn.addEventListener('click', e => { e.stopPropagation(); playPreview(song.previewUrl, btn) })
      footer.appendChild(btn)
    }
  }
}

// ===== Modal =====
function openModal(song) {
  stopAudio()
  addRecentlyViewed(song)
  const existing = document.getElementById('song-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'song-modal'
  modal.className = 'modal'
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.setAttribute('aria-label', `Details for ${song.title}`)

  const duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'N/A'
  const genre = song.genre && song.genre !== 'loading...' && song.genre !== 'unknown' ? song.genre : 'Various'

  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" aria-label="Close modal">&times;</button>
      ${song.albumCover ? `<img src="${song.albumCover}" alt="${song.title} album art" class="modal-cover">` : ''}
      <span class="modal-genre">${genre}</span>
      <h2 class="modal-title">${escHtml(song.title)}</h2>
      <p class="modal-artist">${escHtml(song.artist)}</p>
      <div class="modal-details">
        <p>💿 ${song.albumName || 'Unknown album'}</p>
        <p>⏱ ${duration}</p>
        <p>🔥 Popularity: ${song.popularity}</p>
      </div>
      <div class="modal-actions">
        ${song.previewUrl ? `<button class="modal-play-btn" aria-label="Play preview">▶ Play Preview</button>` : '<p class="no-preview">No preview available</p>'}
        <button class="modal-fav-btn" aria-label="${isFav(song) ? 'Remove from' : 'Add to'} favorites">${isFav(song) ? '❤' : '♡'} Favorites</button>
        <button class="modal-share-btn" aria-label="Share song">↗ Share</button>
      </div>
      <div class="modal-lyrics">
        <h4>Lyrics</h4>
        <div class="modal-lyrics__content" aria-live="polite"><em>Loading lyrics...</em></div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // --- Event wiring ---
  const closeBtn = modal.querySelector('.close-btn')
  closeBtn.addEventListener('click', closeModal)

  modal.addEventListener('click', e => { if (e.target === modal) closeModal() })

  document.addEventListener('keydown', modalEscHandler)

  const playBtn = modal.querySelector('.modal-play-btn')
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      playPreview(song.previewUrl, playBtn)
      if (state.currentAudio && state.currentAudio.src === song.previewUrl && !state.currentAudio.paused) {
        playBtn.innerHTML = '<span class="vis-bars"><span></span><span></span><span></span><span></span></span> Pause'
      }
    })
  }

  modal.querySelector('.modal-fav-btn').addEventListener('click', () => {
    toggleFavorite(song)
    const btn = modal.querySelector('.modal-fav-btn')
    btn.innerHTML = `${isFav(song) ? '❤' : '♡'} Favorites`
    btn.setAttribute('aria-label', isFav(song) ? 'Remove from favorites' : 'Add to favorites')
  })

  modal.querySelector('.modal-share-btn').addEventListener('click', () => shareSong(song))

  // Focus close button
  setTimeout(() => closeBtn.focus(), 100)

  // Fetch lyrics
  fetchLyrics(song.artist, song.title).then(lyrics => {
    const container = modal.querySelector('.modal-lyrics__content')
    if (container) {
      if (lyrics) {
        container.textContent = lyrics
      } else {
        container.innerHTML = '<em>No lyrics found for this song.</em>'
      }
    }
  })
}

function modalEscHandler(e) {
  if (e.key === 'Escape') closeModal()
}

function closeModal() {
  const modal = document.getElementById('song-modal')
  if (modal) modal.remove()
  stopAudio()
  document.removeEventListener('keydown', modalEscHandler)
}

// ===== Share =====
function shareSong(song) {
  const data = { title: song.title, text: `Check out "${song.title}" by ${song.artist}`, url: window.location.href }
  if (navigator.share) {
    navigator.share(data).catch(() => {})
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(`"${song.title}" by ${song.artist}`).then(() => {
      showToast('Copied to clipboard!', 'success')
    }).catch(() => {})
  } else {
    showToast('Sharing not supported on this browser', 'error')
  }
}

// ===== Filters =====
function applyFilters() {
  const sortSelect = document.getElementById('sort-select')
  const resultsGrid = document.getElementById('results-grid')
  const emptyMsg = document.getElementById('empty-msg')

  let filtered = [...state.allSongs]
  if (state.activeGenre !== 'all') {
    filtered = filtered.filter(s => s.genre?.toLowerCase() === state.activeGenre)
  }
  if (sortSelect && sortSelect.value === 'popularity') {
    filtered.sort((a, b) => b.popularity - a.popularity)
  }
  renderCards(filtered)
}

// ===== Load More =====
async function loadMore() {
  if (state.isFetching) return
  state.isFetching = true
  state.currentPage++

  const btn = document.getElementById('load-more-btn')
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...' }

  try {
    let raw
    if (state.currentQuery) {
      raw = await fetchSongs(state.currentQuery, state.currentPage, false)
    } else {
      raw = await fetchSongs('', state.currentPage, true)
    }

    const newSongs = raw.map((track, idx) => ({
      title: track.name,
      artist: typeof track.artist === 'string' ? track.artist : track.artist.name,
      genre: guessGenre(typeof track.artist === 'string' ? track.artist : track.artist.name, track.name),
      popularity: Math.floor(parseInt(track.listeners || 0) / 1000) || state.allSongs.length + idx + 1,
      previewUrl: null,
    }))

    state.allSongs = state.allSongs.concat(newSongs)
    applyFilters()

    // Enrich with Deezer
    for (let i = state.allSongs.length - newSongs.length; i < state.allSongs.length; i++) {
      const deezerData = await fetchDeezerData(state.allSongs[i].artist, state.allSongs[i].title)
      if (deezerData) {
        state.allSongs[i] = { ...state.allSongs[i], ...deezerData }
        if (!state.allSongs[i].genre || state.allSongs[i].genre === 'other') {
          state.allSongs[i].genre = deezerData.genre || guessGenre(state.allSongs[i].artist, state.allSongs[i].title)
        }
        updateCard(i)
      }
      await delay(200)
    }
  } catch (e) {
    showToast('Failed to load more songs', 'error')
  } finally {
    state.isFetching = false
    if (btn) { btn.disabled = false; btn.textContent = 'Load More ↓' }
  }
}

// ===== App =====
async function fetchAndRender(query, page, usePopular, append) {
  const spinner = document.getElementById('spinner')
  const loadMoreContainer = document.getElementById('load-more-container')

  if (!append) renderSkeletons(8)

  try {
    const raw = await fetchSongs(query, page, usePopular)
    const songs = raw.map((track, idx) => ({
      title: track.name,
      artist: typeof track.artist === 'string' ? track.artist : track.artist.name,
      genre: 'loading...',
      popularity: Math.floor(parseInt(track.listeners || 0) / 1000) || idx + 1,
      previewUrl: null,
    }))

    if (append) {
      state.allSongs = state.allSongs.concat(songs)
    } else {
      state.allSongs = songs
    }

    applyFilters()
    state.currentPage = page

    // Enrich with Deezer data
    const startIdx = append ? state.allSongs.length - songs.length : 0
    for (let i = startIdx; i < state.allSongs.length; i++) {
      const deezerData = await fetchDeezerData(state.allSongs[i].artist, state.allSongs[i].title)
      if (deezerData) {
        state.allSongs[i] = { ...state.allSongs[i], ...deezerData }
        if (deezerData.genre) {
          state.allSongs[i].genre = deezerData.genre
        } else {
          state.allSongs[i].genre = guessGenre(state.allSongs[i].artist, state.allSongs[i].title)
        }
        updateCard(i)
      }
      await delay(200)
    }
    showLoadMoreBtn()
    renderRecentFavSection()
  } catch (e) {
    showToast('Failed to fetch songs. Try again.', 'error')
    renderCards([])
  }
}

function showLoadMoreBtn() {
  const container = document.getElementById('load-more-container')
  if (!container) return
  if (state.allSongs.length >= 20) {
    container.classList.remove('hidden')
  } else {
    container.classList.add('hidden')
  }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input')
  const searchBtn = document.getElementById('search-btn')
  const sortSelect = document.getElementById('sort-select')
  const filterBtns = document.querySelectorAll('.filter-btn')
  const regionSelect = document.getElementById('region-select')

  // Initial load
  fetchAndRender('', 1, true, false)

  // Search with debounce
  const debouncedSearch = debounce(value => {
    if (value.length > 2) {
      state.currentQuery = value
      state.usePopular = false
      fetchAndRender(value, 1, false, false)
    } else if (value.length === 0) {
      state.currentQuery = ''
      state.usePopular = true
      fetchAndRender('', 1, true, false)
    }
  }, 300)

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim()
    document.getElementById('load-more-container')?.classList.add('hidden')
    debouncedSearch(query)
  })

  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim()
    state.currentQuery = query
    state.usePopular = !query
    document.getElementById('load-more-container')?.classList.add('hidden')
    fetchAndRender(query || '', 1, !query, false)
  })

  regionSelect.addEventListener('change', async () => {
    const region = regionSelect.value
    document.getElementById('load-more-container')?.classList.add('hidden')
    if (region) {
      renderSkeletons(8)
      try {
        const songs = await fetchByRegion(region)
        state.allSongs = songs
        applyFilters()
        showLoadMoreBtn()
        renderRecentFavSection()
      } catch (e) {
        showToast('Failed to load regional music', 'error')
      }
    } else {
      state.currentQuery = ''
      searchInput.value = ''
      fetchAndRender('', 1, true, false)
    }
  })

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      state.activeGenre = btn.dataset.genre
      applyFilters()
    })
  })

  sortSelect.addEventListener('change', () => applyFilters())

  document.getElementById('load-more-btn')?.addEventListener('click', loadMore)

  // Tab switching
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })

  // Keyboard shortcut: Enter from search input
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchBtn.click()
    }
  })

  renderRecentFavSection()
})

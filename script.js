const API_KEY = '0e68bf1b61df246bcfd6b8bac456cf13'
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/'

let allSongs = []
let activeGenre = 'all'

// Get DOM elements
const searchInput = document.getElementById('search-input')
const searchBtn = document.getElementById('search-btn')
const sortSelect = document.getElementById('sort-select')
const filterBtns = document.querySelectorAll('.filter-btn')
const spinner = document.getElementById('spinner')
const resultsGrid = document.getElementById('results-grid')
const emptyMsg = document.getElementById('empty-msg')

// Event Listeners
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim()
    if (query.length > 2) {
      fetchSongs(query)
    } else if (query.length === 0) {
      fetchSongs('love')
    }
  })
}

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim()
    if (query) fetchSongs(query)
  })
}

if (filterBtns) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeGenre = btn.dataset.genre
      applyFilters()
    })
  })
}

if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    applyFilters()
  })
}

async function fetchSongs(query = 'love') {
  const url = `${BASE_URL}?method=track.search&track=${encodeURIComponent(query)}&api_key=${API_KEY}&format=json&limit=20`

  spinner.classList.remove('hidden')
  emptyMsg.classList.add('hidden')

  try {
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('API Response:', data)

    if (!data.results || !data.results.trackmatches || !data.results.trackmatches.track) {
      allSongs = []
      renderCards([])
      return
    }

    const tracks = data.results.trackmatches.track
    const tracksArray = Array.isArray(tracks) ? tracks : [tracks]

    allSongs = tracksArray.map((track, index) => ({
      title: track.name,
      artist: typeof track.artist === 'string' ? track.artist : track.artist.name,
      genre: 'pop',
      popularity: Math.floor(parseInt(track.listeners || 0) / 1000) || index + 1
    }))

    applyFilters()

  } catch (error) {
    console.error('Failed to fetch songs:', error)
    allSongs = []
    renderCards([])
  } finally {
    spinner.classList.add('hidden')
  }
}

function applyFilters() {
  let filtered = [...allSongs]

  if (activeGenre !== 'all') {
    filtered = filtered.filter(song =>
      song.genre.toLowerCase() === activeGenre.toLowerCase()
    )
  }

  if (sortSelect && sortSelect.value === 'popularity') {
    filtered = filtered.sort((a, b) => b.popularity - a.popularity)
  }

  renderCards(filtered)
}

function renderCards(songs) {
  resultsGrid.innerHTML = ''

  if (songs.length === 0) {
    emptyMsg.classList.remove('hidden')
    return
  }

  emptyMsg.classList.add('hidden')

  songs.forEach(song => {
    const card = document.createElement('div')
    card.className = 'card'
    card.innerHTML = `
      <div class="card__genre">${song.genre}</div>
      <h3 class="card__title">${song.title}</h3>
      <p class="card__artist">${song.artist}</p>
      <span class="card__popularity">${song.popularity}</span>
    `
    resultsGrid.appendChild(card)
  })
}

// Initial load
fetchSongs('love')


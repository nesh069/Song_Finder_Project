const API_KEY = '0e68bf1b61df246bcfd6b8bac456cf13'
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/'

let allSongs = []

async function fetchSongs(query = 'love') {
  const spinner = document.getElementById('spinner')
  const url = `${BASE_URL}?method=track.search&track=${query}&api_key=${API_KEY}&format=json&limit=20`

  spinner.classList.remove('hidden')

  try {
    const response = await fetch(url)
    const data = await response.json()
    const tracks = data.results.trackmatches.track

    allSongs = tracks.map((track, index) => ({
      title: track.name,
      artist: track.artist,
      genre: 'pop',
      popularity: Math.floor(parseInt(track.listeners) / 100000) || index + 1
    }))

    renderCards(allSongs)
  } catch (error) {
    console.error('Failed to fetch songs:', error)
  } finally {
    spinner.classList.add('hidden')
  }
}

function renderCards(songs) {
  const grid = document.getElementById('results-grid')
  const emptyMsg = document.getElementById('empty-msg')

  grid.innerHTML = ''

  if (songs.length === 0) {
    emptyMsg.classList.remove('hidden')
    return
  }

  emptyMsg.classList.add('hidden')

  songs.forEach(song => {
    const card = document.createElement('div')
    card.classList.add('card')
    card.innerHTML = `
      <div class="card__genre">${song.genre}</div>
      <h2 class="card__title">${song.title}</h2>
      <p class="card__artist">${song.artist}</p>
      <span class="card__popularity">${song.popularity}</span>
    `
    grid.appendChild(card)
  })
}

fetchSongs()

const searchInput = document.getElementById('search-input')
const searchBtn = document.getElementById('search-btn')

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim()
  if (query.length > 2) {
    fetchSongs(query)
  }
})

searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim()
  if (query) fetchSongs(query)
})

const filterBtns = document.querySelectorAll('.filter-btn')
let activeGenre = 'all'

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeGenre = btn.dataset.genre
    applyFilters()
  })
})

function applyFilters() {
  let filtered = [...allSongs]

  if (activeGenre !== 'all') {
    filtered = filtered.filter(song =>
      song.genre.toLowerCase() === activeGenre.toLowerCase()
    )
  }

  if (sortSelect.value === 'popularity') {
    filtered = filtered.sort((a, b) => b.popularity - a.popularity)
  }

  renderCards(filtered)
}

const sortSelect = document.getElementById('sort-select')

sortSelect.addEventListener('change', () => {
  applyFilters()
})


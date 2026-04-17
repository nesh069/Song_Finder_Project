const API_KEY = '0e68bf1b61df246bcfd6b8bac456cf13'
const LASTFM_URL = 'https://ws.audioscrobbler.com/2.0/'

let allSongs = []
let activeGenre = 'all'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input')
  const searchBtn = document.getElementById('search-btn')
  const sortSelect = document.getElementById('sort-select')
  const filterBtns = document.querySelectorAll('.filter-btn')
  const spinner = document.getElementById('spinner')
  const resultsGrid = document.getElementById('results-grid')
  const emptyMsg = document.getElementById('empty-msg')

  // Load popular songs on initial load (empty query = chart top tracks)
  fetchSongs('', spinner, resultsGrid, emptyMsg, sortSelect, true)

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim()
      if (query.length > 2) {
        fetchSongs(query, spinner, resultsGrid, emptyMsg, sortSelect)
      } else if (query.length === 0) {
        // When search is cleared, go back to popular songs
        fetchSongs('', spinner, resultsGrid, emptyMsg, sortSelect, true)
      }
    })
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim()
      if (query) {
        fetchSongs(query, spinner, resultsGrid, emptyMsg, sortSelect)
      } else {
        // If search is empty, show popular songs
        fetchSongs('', spinner, resultsGrid, emptyMsg, sortSelect, true)
      }
    })
  }

  if (filterBtns) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        activeGenre = btn.dataset.genre
        applyFilters(sortSelect, resultsGrid, emptyMsg)
      })
    })
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      applyFilters(sortSelect, resultsGrid, emptyMsg)
    })
  }
})

async function fetchSongs(query, spinner, resultsGrid, emptyMsg, sortSelect, usePopular = false) {
  let url
  
  if (usePopular || !query) {
    // Fetch popular/top tracks when no search query
    url = `${LASTFM_URL}?method=chart.getTopTracks&api_key=${API_KEY}&format=json&limit=20`
  } else {
    // Search for specific query
    url = `${LASTFM_URL}?method=track.search&track=${encodeURIComponent(query)}&api_key=${API_KEY}&format=json&limit=20`
  }

  if (spinner) spinner.classList.remove('hidden')
  if (emptyMsg) emptyMsg.classList.add('hidden')

  try {
    const response = await fetch(url)
    const data = await response.json()

    let tracksArray = []
    
    if (usePopular || !query) {
      // chart.getTopTracks returns data differently
      if (!data.tracks?.track) {
        allSongs = []
        renderCards([], resultsGrid, emptyMsg)
        return
      }
      tracksArray = Array.isArray(data.tracks.track) ? data.tracks.track : [data.tracks.track]
    } else {
      // track.search returns data differently
      if (!data.results?.trackmatches?.track) {
        allSongs = []
        renderCards([], resultsGrid, emptyMsg)
        return
      }
      const tracks = data.results.trackmatches.track
      tracksArray = Array.isArray(tracks) ? tracks : [tracks]
    }

    // Step 1 — render songs immediately with 'loading' genre
    allSongs = tracksArray.map((track, index) => ({
      title: track.name,
      artist: typeof track.artist === 'string' ? track.artist : track.artist.name,
      genre: 'loading...',
      popularity: Math.floor(parseInt(track.listeners || track.playcount || 0) / 1000) || index + 1
    }))

    // Auto-sort by popularity if showing popular songs
    if (usePopular || !query) {
      allSongs.sort((a, b) => b.popularity - a.popularity)
    }

    renderCards(allSongs, resultsGrid, emptyMsg)

    // Step 2 — fetch genres one at a time in the background
    let rateLimitHit = false
    
    for (let i = 0; i < allSongs.length; i++) {
      if (rateLimitHit) {
        allSongs[i].genre = 'other'
        continue
      }
      
      const genre = await fetchGenre(allSongs[i].artist, allSongs[i].title)
      allSongs[i].genre = genre

      const cards = resultsGrid.querySelectorAll('.card')
      if (cards[i]) {
        const genreEl = cards[i].querySelector('.card__genre')
        if (genreEl) genreEl.textContent = genre
      }

      if (activeGenre !== 'all' && genre !== 'loading...') {
        const genreMatch = genre.toLowerCase() === activeGenre.toLowerCase()
        if (cards[i]) {
          cards[i].style.display = genreMatch ? 'flex' : 'none'
        }
      }

      await delay(300)
    }

    if (activeGenre !== 'all') {
      applyFilters(sortSelect, resultsGrid, emptyMsg)
    }

  } catch (error) {
    console.error('Failed to fetch songs:', error)
    allSongs = []
    renderCards([], resultsGrid, emptyMsg)
  } finally {
    if (spinner) spinner.classList.add('hidden')
  }
}

async function fetchGenre(artist, title) {
  try {
    const url = `${LASTFM_URL}?method=track.getInfo&track=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json`
    
    const response = await fetch(url)
    
    if (response.status === 429) {
      console.warn('Rate limit hit for:', artist, '-', title)
      return 'other'
    }
    
    if (!response.ok) {
      return 'other'
    }
    
    const data = await response.json()

    if (!data.track) {
      return 'other'
    }

    const tags = data.track.toptags?.tag
    if (!tags || tags.length === 0) {
      return 'other'
    }

    const tagList = Array.isArray(tags) ? tags : [tags]

    for (const tag of tagList) {
      const name = tag.name.toLowerCase()
      if (name.includes('hip-hop') || name.includes('rap') || name.includes('hip hop')) return 'hip-hop'
      if (name.includes('rock') || name.includes('metal') || name.includes('punk')) return 'rock'
      if (name.includes('r&b') || name.includes('soul') || name.includes('rhythm and blues')) return 'rnb'
      if (name.includes('afrobeat') || name.includes('afro')) return 'afrobeats'
      if (name.includes('pop')) return 'pop'
    }

    return 'other'
  } catch (error) {
    console.error('Genre fetch error:', error)
    return 'other'
  }
}

function applyFilters(sortSelect, resultsGrid, emptyMsg) {
  let filtered = [...allSongs]

  if (activeGenre !== 'all') {
    filtered = filtered.filter(song =>
      song.genre.toLowerCase() === activeGenre.toLowerCase()
    )
  }

  if (sortSelect && sortSelect.value === 'popularity') {
    filtered = filtered.sort((a, b) => b.popularity - a.popularity)
  }

  renderCards(filtered, resultsGrid, emptyMsg)
}

function renderCards(songs, resultsGrid, emptyMsg) {
  if (!resultsGrid) return

  resultsGrid.innerHTML = ''

  if (songs.length === 0) {
    if (emptyMsg) emptyMsg.classList.remove('hidden')
    return
  }

  if (emptyMsg) emptyMsg.classList.add('hidden')

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


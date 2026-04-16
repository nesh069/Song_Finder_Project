const API_KEY = 'YOUR_API_KEY_HERE'
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/'

async function fetchSongs(query = 'top tracks') {
  const url = `${BASE_URL}?method=track.search&track=${query}&api_key=${API_KEY}&format=json&limit=20`

  try {
    const response = await fetch(url)
    const data = await response.json()
    console.log(data)
  } catch (error) {
    console.error('Failed to fetch songs:', error)
  }
}

fetchSongs()
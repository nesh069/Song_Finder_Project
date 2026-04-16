function filterByGenre(songs, genre) {
  if (genre === 'all') return songs
  return songs.filter(song => song.genre.toLowerCase() === genre.toLowerCase())
}

function filterByTitle(songs, query) {
  const q = query.toLowerCase()
  return songs.filter(song =>
    song.title.toLowerCase().includes(q) ||
    song.artist.toLowerCase().includes(q)
  )
}

function sortByPopularity(songs) {
  return [...songs].sort((a, b) => b.popularity - a.popularity)
}

module.exports = { filterByGenre, filterByTitle, sortByPopularity }
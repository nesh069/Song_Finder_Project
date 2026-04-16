const { filterByGenre, filterByTitle, sortByPopularity } = require('../utils')

const mockSongs = [
  { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'pop', popularity: 98 },
  { title: 'HUMBLE.', artist: 'Kendrick Lamar', genre: 'hip-hop', popularity: 95 },
  { title: 'Essence', artist: 'Wizkid', genre: 'afrobeats', popularity: 91 },
  { title: 'Numb', artist: 'Linkin Park', genre: 'rock', popularity: 88 },
]

test('filterByGenre returns songs matching the genre', () => {
  const result = filterByGenre(mockSongs, 'pop')
  expect(result).toHaveLength(1)
  expect(result[0].title).toBe('Blinding Lights')
})

test('filterByGenre returns all songs when genre is all', () => {
  const result = filterByGenre(mockSongs, 'all')
  expect(result).toHaveLength(4)
})

test('filterByTitle finds songs by title', () => {
  const result = filterByTitle(mockSongs, 'numb')
  expect(result[0].artist).toBe('Linkin Park')
})

test('filterByTitle finds songs by artist name', () => {
  const result = filterByTitle(mockSongs, 'wizkid')
  expect(result[0].title).toBe('Essence')
})

test('sortByPopularity sorts songs from highest to lowest', () => {
  const result = sortByPopularity(mockSongs)
  expect(result[0].popularity).toBe(98)
  expect(result[3].popularity).toBe(88)
})
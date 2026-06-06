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

const GENRE_KEYWORDS = [
  { genre: 'pop', keywords: ['bieber', 'swift', 'sheeran', 'grande', 'cyrus', 'gomez', 'perry', 'mars', 'bruno', 'p!nk', 'pink', 'katy', 'taylor', 'ariana', 'justin', 'billie', 'eilish', 'olivia', 'rodrigo', 'dua lipa', 'adele', 'ed sheeran', 'lady gaga', 'miley', 'selena', 'demi', 'rihanna', 'shakira', 'weeknd'] },
  { genre: 'hip-hop', keywords: ['kendrick', 'lamar', 'drake', 'travis scott', '21 savage', 'cardi b', 'nicki minaj', 'megan thee', 'lil wayne', 'lil nas', 'post malone', 'kanye', 'jay-z', 'eminem', 'snoop', 'dogg', 'ice cube', 'nas', 'wu-tang', 'outkast', 'atcq', 'tribe called', 'missy', 'gambino', 'migos', 'future', 'young thug', 'gunna', 'lil baby', 'da baby', 'juice wrld', 'pop smoke', '50 cent', 'the game', 'rick ross', 'meek mill', 'j. cole', 'cole', 'logic', 'chance', 'tyler', 'asap', 'rocky', 'mac miller', 'xxxtentacion', 'xxx'] },
  { genre: 'rock', keywords: ['linkin park', 'nirvana', 'metallica', 'queen', 'ac/dc', 'led zeppelin', 'pink floyd', 'guns n', 'gnr', 'foo fighters', 'radiohead', 'coldplay', 'muse', 'pearl jam', 'soundgarden', 'alice in', 'system of', 'down', 'slipknot', 'tool', 'rage against', 'red hot', 'chili peppers', 'the beatles', 'rolling stones', 'the who', 'david bowie', 'bruce springsteen', 'u2', 'bon jovi', 'aerosmith', 'def leppard', 'journey', 'eagles', 'jimi hendrix', 'jimmy page', 'eric clapton', 'oasis', 'blur', 'arctic monkeys', 'the killers', 'white stripes'] },
  { genre: 'rnb', keywords: ['usher', 'beyoncé', 'beyonce', 'chris brown', 'trey songz', 'rl', 'mario', 'keyshia', 'alicia keys', 'whitney', 'mariah', 'stevie', 'aretha', 'james brown', 'ray charles', 'marvin gaye', 'temptations', 'michael jackson', 'janet', 'bobby brown', 'toni braxton', 'monica', 'brandy', 'frank ocean', 'sza', 'daniel caesar', 'jhené', 'jhene', 'h.e.r.', 'her', 'snoh aalegra', 'brent faiyaz', '6lack', 'blackstreet', 'jodeci', 'boyz ii'] },
  { genre: 'afrobeats', keywords: ['wizkid', 'burna boy', 'davido', 'tiwa savage', 'yemi alade', 'tekno', 'mr eazi', 'shatta wale', 'stonebwoy', 'kuami eugene', 'fally ipupa', 'diamond platnumz', 'sauti sol', 'nyashinski', 'nameless', 'akra', 'bayanni', 'kizz daniel', 'adekunle gold', 'omah lay', 'rema', 'fireboy', 'joeboy', 'crayon', 'ayra starr', 'teni', 'simi', 'asa', 'salif keita', 'youssou ndour', 'angelique kidjo', 'bracket', 'p square', '2baba', 'flavour', 'phyno', 'olamide'] },
]

function guessGenre(artist, title) {
  const text = `${artist} ${title}`.toLowerCase()
  for (const entry of GENRE_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) return entry.genre
    }
  }
  return 'other'
}

const DEEZER_GENRE_MAP = {
  132: 'pop', 116: 'hip-hop', 152: 'rock', 113: 'rock',
  165: 'rnb', 2: 'afrobeats', 144: 'reggae', 197: 'latin',
  75: 'brazilian', 81: 'indian', 16: 'asian'
}

module.exports = { filterByGenre, filterByTitle, sortByPopularity, guessGenre, DEEZER_GENRE_MAP }

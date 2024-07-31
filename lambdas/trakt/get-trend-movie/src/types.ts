interface TraktMovie {
  movie: {
    ids: {
      trakt: number;
      slug: string;
      imdb: string;
      tmdb: number;
    };
    title: string;
    year: number;
    poster?: string;
  };
  type: string;
  score: number;
}

interface TmdbMovie {
  poster_path: string;
}

export { TraktMovie, TmdbMovie };

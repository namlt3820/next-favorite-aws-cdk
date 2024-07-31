interface TraktMovie {
  ids: {
    trakt: number;
    slug: string;
    imdb: string;
    tmdb: number;
  };
  title: string;
  year: number;
  poster?: string;
}

interface TmdbMovie {
  poster_path: string;
}

export { TraktMovie, TmdbMovie };

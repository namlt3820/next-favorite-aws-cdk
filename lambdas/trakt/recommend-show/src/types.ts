interface TraktShow {
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

interface TmdbTv {
  poster_path: string;
}

export { TraktShow, TmdbTv };

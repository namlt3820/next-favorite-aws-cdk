export interface TraktTrendShow {
  show: {
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

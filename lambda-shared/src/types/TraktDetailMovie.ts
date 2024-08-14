export interface TraktDetailMovie {
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

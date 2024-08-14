import axios from "axios";
import { TmdbMovie } from "./types/TmdbMovie";
import { TraktTrendMovie } from "./types/TraktTrendMovie";

export const getTraktTrendMoviePoster = async ({
  movie,
  tmdbApiKey,
  tmdbApiUrl,
  tmdbImageUrl,
}: {
  movie: TraktTrendMovie;
  tmdbApiKey: string;
  tmdbApiUrl: string;
  tmdbImageUrl: string;
}) => {
  const tmdbId = movie.movie.ids.tmdb;
  const params = new URLSearchParams({
    api_key: tmdbApiKey,
  });

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbMovie>(
        `${tmdbApiUrl}/movie/${tmdbId}?${params.toString()}`
      );

      movie.movie.poster = response.data?.poster_path
        ? `${tmdbImageUrl}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      movie.movie.poster = "";
    }
  }

  return movie;
};

import axios from "axios";
import { TmdbMovie } from "./types/TmdbMovie";
import { TraktDetailMovie } from "./types/TraktDetailMovie";

export const getTraktDetailMoviePoster = async ({
  movie,
  tmdbApiKey,
  tmdbApiUrl,
  tmdbImageUrl,
}: {
  movie: TraktDetailMovie;
  tmdbApiKey: string;
  tmdbApiUrl: string;
  tmdbImageUrl: string;
}) => {
  const tmdbId = movie.ids.tmdb;
  const params = new URLSearchParams({
    api_key: tmdbApiKey,
  });

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbMovie>(
        `${tmdbApiUrl}/movie/${tmdbId}?${params.toString()}`
      );

      movie.poster = response.data?.poster_path
        ? `${tmdbImageUrl}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      movie.poster = "";
    }
  }

  return movie;
};

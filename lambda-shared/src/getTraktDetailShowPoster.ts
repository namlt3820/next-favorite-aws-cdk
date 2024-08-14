import { TraktDetailShow } from "./types/TraktDetailShow";
import { TmdbTv } from "./types/TmdbTv";
import axios from "axios";

export const getTraktDetailShowPoster = async ({
  show,
  tmdbApiKey,
  tmdbApiUrl,
  tmdbImageUrl,
}: {
  show: TraktDetailShow;
  tmdbApiKey: string;
  tmdbApiUrl: string;
  tmdbImageUrl: string;
}) => {
  const tmdbId = show.ids.tmdb;
  const params = new URLSearchParams({
    api_key: tmdbApiKey,
  });

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbTv>(
        `${tmdbApiUrl}/tv/${tmdbId}?${params}`
      );

      show.poster = response.data?.poster_path
        ? `${tmdbImageUrl}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      show.poster = "";
    }
  }

  return show;
};

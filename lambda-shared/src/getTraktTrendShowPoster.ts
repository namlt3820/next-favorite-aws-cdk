import axios from "axios";
import { TraktTrendShow } from "./types/TraktTrendShow";
import { TmdbTv } from "./types/TmdbTv";

export const getTraktTrendShowPoster = async ({
  show,
  tmdbApiKey,
  tmdbApiUrl,
  tmdbImageUrl,
}: {
  show: TraktTrendShow;
  tmdbApiKey: string;
  tmdbApiUrl: string;
  tmdbImageUrl: string;
}) => {
  const tmdbId = show.show.ids.tmdb;
  const params = new URLSearchParams({
    api_key: tmdbApiKey,
  });

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbTv>(
        `${tmdbApiUrl}/tv/${tmdbId}?${params.toString()}`
      );

      show.show.poster = response.data?.poster_path
        ? `${tmdbImageUrl}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      show.show.poster = "";
    }
  }

  return show;
};

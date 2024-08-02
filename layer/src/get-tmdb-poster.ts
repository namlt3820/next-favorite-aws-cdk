import axios from "axios";
import querystring from "querystring";

interface TmdbMovie {
  poster_path: string;
}

const getTmdbPoster = async ({
  tmdbId,
  tmdbApiKey,
  tmdbApiUrl,
  tmdbImageUrl,
}: {
  tmdbId: string;
  tmdbApiKey: string;
  tmdbApiUrl: string;
  tmdbImageUrl: string;
}) => {
  try {
    const response = await axios.get<TmdbMovie>(
      `${tmdbApiUrl}/movie/${tmdbId}?${querystring.stringify({
        api_key: tmdbApiKey,
      })}`
    );

    return response.data?.poster_path
      ? `${tmdbImageUrl}/w200${response.data?.poster_path}`
      : "";
  } catch (error) {
    console.log({ error });
    return "";
  }
};

export { getTmdbPoster };

import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { TraktMovie, TmdbMovie } from "./types";

const client = new SecretsManagerClient({ region: process.env.REGION });

const getMoviePoster = async (movie: TraktMovie, tmdbApiKey: string) => {
  const tmdbId = movie.ids.tmdb;

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbMovie>(
        `${process.env.TMDB_API_URL}/movie/${tmdbId}?${querystring.stringify({
          api_key: tmdbApiKey,
        })}`
      );

      movie.poster = response.data?.poster_path
        ? `${process.env.TMDB_IMAGE_URL}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      movie.poster = "";
    }
  }

  return movie;
};

const getMovieDetail = async (
  itemId: number,
  traktApiKey: string,
  tmdbApiKey: string
) => {
  // query for movie
  let response = await axios.get<TraktMovie | undefined>(
    `${process.env.TRAKT_API_URL}/movies/${itemId}?${querystring.stringify({
      extended: "full",
    })}`,
    {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": 2,
        "trakt-api-key": traktApiKey,
      },
    }
  );

  // query for movie poster
  let movie = response.data;
  if (movie) movie = await getMoviePoster(movie, tmdbApiKey);
  return movie;
};

const getMovieDetails = async (
  itemIds: number[],
  traktApiKey: string,
  tmdbApiKey: string
) => {
  const response: { itemId: number; data: TraktMovie }[] = [];

  await Promise.all(
    itemIds.map(async (itemId) => {
      const data = await getMovieDetail(itemId, traktApiKey, tmdbApiKey);

      if (data) {
        response.push({
          itemId,
          data,
        });
      }
    })
  );

  return response;
};

const getSecretString = async (secretName: string) => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  return data.SecretString || "";
};

const getApiKeys = async () => {
  const traktSecretName = process.env.TRAKT_SECRET_NAME;
  const tmdbSecretName = process.env.TMDB_SECRET_NAME;

  if (!traktSecretName || !tmdbSecretName) {
    throw new Error("SECRET_NAME environment variable is not set");
  }

  const [traktApiKey, tmdbApiKey] = await Promise.all([
    getSecretString(traktSecretName),
    getSecretString(tmdbSecretName),
  ]);

  if (!traktApiKey || !tmdbApiKey) {
    throw new Error("api key is undefined");
  }

  return {
    traktApiKey,
    tmdbApiKey,
  };
};

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body || "{}");
    const { itemIds }: { itemIds: number[] } = requestBody;
    const { tmdbApiKey, traktApiKey } = await getApiKeys();
    const response = await getMovieDetails(itemIds, traktApiKey, tmdbApiKey);

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error getting Trakt movie detail:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Trakt movie detail",
      }),
    };
  }
};

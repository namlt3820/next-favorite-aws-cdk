import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { TraktMovie, TmdbMovie } from "./types";
import pick from "lodash/pick";
import omitBy from "lodash/omitBy";

const client = new SecretsManagerClient({ region: process.env.REGION });

const withCorsHeaders = (
  event: APIGatewayEvent,
  response: {
    statusCode: number;
    body: string;
    headers?: { [header: string]: string | number | boolean };
  }
): APIGatewayProxyResult => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://nextfavorite.gladiolus.info",
  ];
  const requestOrigin = event.headers.origin || "";

  const isOriginAllowed = allowedOrigins.includes(requestOrigin);
  return isOriginAllowed
    ? {
        ...response,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Origin": requestOrigin,
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Expose-Headers":
            "X-Pagination-Page, X-Pagination-Page-Count, X-Pagination-Limit, X-Pagination-Item-Count",
          ...(response.headers || {}),
        },
      }
    : response;
};

const getMoviePoster = async (movie: TraktMovie, tmdbApiKey: string) => {
  const tmdbId = movie.movie.ids.tmdb;

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbMovie>(
        `${process.env.TMDB_API_URL}/movie/${tmdbId}?${querystring.stringify({
          api_key: tmdbApiKey,
        })}`
      );

      movie.movie.poster = response.data?.poster_path
        ? `${process.env.TMDB_IMAGE_URL}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      movie.movie.poster = "";
    }
  }

  return movie;
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
  const query = event.queryStringParameters?.["query"] || "";
  const page = event.queryStringParameters?.["page"] || 1;
  const limit = event.queryStringParameters?.["limit"] || 10;

  try {
    const { tmdbApiKey, traktApiKey } = await getApiKeys();

    // query for movies
    const response = await axios.get<TraktMovie[]>(
      `${process.env.TRAKT_API_URL}/search/movie?${querystring.stringify({
        query,
        page,
        limit,
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

    // get pagination data
    const paginationHeaders = omitBy(
      pick(response.headers, [
        "x-pagination-page",
        "x-pagination-limit",
        "x-pagination-page-count",
        "x-pagination-item-count",
      ]),
      (value) => value === null
    );

    // query for movie poster
    if (response.data.length) {
      response.data = await Promise.all(
        response.data.map(async (movie) => {
          return await getMoviePoster(movie, tmdbApiKey);
        })
      );
    }

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
      headers: paginationHeaders,
    });
  } catch (error) {
    console.error("Error searching Trakt movie:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Trakt movie",
      }),
    });
  }
};

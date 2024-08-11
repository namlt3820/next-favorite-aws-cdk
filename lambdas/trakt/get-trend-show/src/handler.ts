import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { TraktShow, TmdbTv } from "./types";
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
  const allowedOrigins = ["http://localhost:3000"];
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

const getShowPoster = async (show: TraktShow, tmdbApiKey: string) => {
  const tmdbId = show.show.ids.tmdb;

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbTv>(
        `${process.env.TMDB_API_URL}/tv/${tmdbId}?${querystring.stringify({
          api_key: tmdbApiKey,
        })}`
      );

      show.show.poster = response.data?.poster_path
        ? `${process.env.TMDB_IMAGE_URL}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      show.show.poster = "";
    }
  }

  return show;
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

const getSecretString = async (secretName: string) => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  return data.SecretString || "";
};

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const page = event.queryStringParameters?.["page"] || 1;
  const limit = event.queryStringParameters?.["limit"] || 10;

  try {
    const { tmdbApiKey, traktApiKey } = await getApiKeys();

    // query for shows
    const response = await axios.get<TraktShow[]>(
      `${process.env.TRAKT_API_URL}/shows/trending?${querystring.stringify({
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

    // query for show poster
    if (response.data.length) {
      response.data = await Promise.all(
        response.data.map(async (show) => {
          return await getShowPoster(show, tmdbApiKey);
        })
      );
    }

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
      headers: paginationHeaders,
    });
  } catch (error) {
    console.error("Error getting Trakt trending show:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Trakt trending show",
      }),
    });
  }
};

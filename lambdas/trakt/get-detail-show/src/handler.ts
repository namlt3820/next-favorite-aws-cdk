import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { TraktShow, TmdbTv } from "./types";

const client = new SecretsManagerClient({ region: process.env.REGION });

const withCorsHeaders = (
  event: APIGatewayEvent,
  response: { statusCode: number; body: string }
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
        },
      }
    : response;
};

const getShowPoster = async (show: TraktShow, tmdbApiKey: string) => {
  const tmdbId = show.ids.tmdb;

  if (tmdbId) {
    try {
      const response = await axios.get<TmdbTv>(
        `${process.env.TMDB_API_URL}/tv/${tmdbId}?${querystring.stringify({
          api_key: tmdbApiKey,
        })}`
      );

      show.poster = response.data?.poster_path
        ? `${process.env.TMDB_IMAGE_URL}/w200${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      show.poster = "";
    }
  }

  return show;
};

const getShowDetail = async (
  itemId: number,
  traktApiKey: string,
  tmdbApiKey: string
) => {
  // query for show
  let response = await axios.get<TraktShow | undefined>(
    `${process.env.TRAKT_API_URL}/shows/${itemId}?${querystring.stringify({
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

  // query for show poster
  let show = response.data;
  if (show) show = await getShowPoster(show, tmdbApiKey);
  return show;
};

const getShowDetails = async (
  itemIds: number[],
  traktApiKey: string,
  tmdbApiKey: string
) => {
  const response: { itemId: number; data: TraktShow }[] = [];

  await Promise.all(
    itemIds.map(async (itemId) => {
      const data = await getShowDetail(itemId, traktApiKey, tmdbApiKey);

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
    const response = await getShowDetails(itemIds, traktApiKey, tmdbApiKey);

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error("Error getting Trakt show detail:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Trakt show detail",
      }),
    });
  }
};

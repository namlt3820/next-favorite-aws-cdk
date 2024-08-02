import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { TraktShow, TmdbTv } from "./types";
import pick from "lodash/pick";
import omitBy from "lodash/omitBy";

const client = new SecretsManagerClient({ region: process.env.REGION });

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

const getSecretString = async (secretName: string) => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  return data.SecretString || "";
};

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const query = event.queryStringParameters?.["query"] || "";
  const page = event.queryStringParameters?.["page"] || 1;
  const limit = event.queryStringParameters?.["limit"] || 10;
  const traktSecretName = process.env.TRAKT_SECRET_NAME;
  const tmdbSecretName = process.env.TMDB_SECRET_NAME;

  if (!traktSecretName || !tmdbSecretName) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "SECRET_NAME environment variable is not set",
      }),
    };
  }

  try {
    const [traktApiKey, tmdbApiKey] = await Promise.all([
      getSecretString(traktSecretName),
      getSecretString(tmdbSecretName),
    ]);

    if (!traktApiKey || !tmdbApiKey) {
      throw new Error("api key is undefined");
    }

    // query for shows
    const response = await axios.get<TraktShow[]>(
      `${process.env.TRAKT_API_URL}/search/show?${querystring.stringify({
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

    // query for show poster
    if (response.data.length) {
      response.data = await Promise.all(
        response.data.map(async (show) => {
          return await getShowPoster(show, tmdbApiKey);
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
      headers: paginationHeaders,
    };
  } catch (error) {
    console.error("Error searching Trakt show:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Trakt show",
      }),
    };
  }
};

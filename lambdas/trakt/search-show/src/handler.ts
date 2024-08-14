import axios from "axios";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import pick from "lodash/pick";
import omitBy from "lodash/omitBy";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktTrendShowPoster } from "../../../../lambda-shared/src/getTraktTrendShowPoster";
import { TraktTrendShow } from "../../../../lambda-shared/src/types/TraktTrendShow";

const client = new SecretsManagerClient({ region: process.env.REGION });

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
  const params = new URLSearchParams({
    query: event.queryStringParameters?.["query"] || "",
    page: event.queryStringParameters?.["page"] || "1",
    limit: event.queryStringParameters?.["limit"] || "10",
    extended: "full",
  });

  try {
    const { tmdbApiKey, traktApiKey } = await getApiKeys();

    // query for shows
    const response = await axios.get<TraktTrendShow[]>(
      `${process.env.TRAKT_API_URL}/search/show?${params.toString()}`,
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
          return await getTraktTrendShowPoster({
            show,
            tmdbApiKey,
            tmdbApiUrl: process.env.TMDB_API_URL!,
            tmdbImageUrl: process.env.TMDB_IMAGE_URL!,
          });
        })
      );
    }

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
      headers: paginationHeaders,
    });
  } catch (error) {
    console.error("Error searching Trakt show:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Trakt show",
      }),
    });
  }
};

import axios from "axios";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import pick from "lodash/pick";
import omitBy from "lodash/omitBy";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktTrendMoviePoster } from "../../../../lambda-shared/src/getTraktTrendMoviePoster";
import { TraktTrendMovie } from "../../../../lambda-shared/src/types/TraktTrendMovie";
import { getTraktApiKeys } from "../../../../lambda-shared/src/getTraktApiKeys";

const client = new SecretsManagerClient({ region: process.env.REGION });

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
    const { tmdbApiKey, traktApiKey } = await getTraktApiKeys({
      client,
      tmdbSecretName: process.env.TMDB_SECRET_NAME!,
      traktSecretName: process.env.TRAKT_SECRET_NAME!,
    });

    // query for movies
    const response = await axios.get<TraktTrendMovie[]>(
      `${process.env.TRAKT_API_URL}/search/movie?${params.toString()}`,
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
          return await getTraktTrendMoviePoster({
            movie,
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
    console.error("Error searching Trakt movie:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Trakt movie",
      }),
    });
  }
};

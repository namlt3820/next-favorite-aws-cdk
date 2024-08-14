import axios from "axios";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktDetailMoviePoster } from "../../../../lambda-shared/src/getTraktDetailMoviePoster";
import { TraktDetailMovie } from "../../../../lambda-shared/src/types/TraktDetailMovie";
import { getTraktApiKeys } from "../../../../lambda-shared/src/getTraktApiKeys";

const client = new SecretsManagerClient({ region: process.env.REGION });

const getMovieDetail = async (
  itemId: number,
  traktApiKey: string,
  tmdbApiKey: string
) => {
  const params = new URLSearchParams({
    extended: "full",
  });

  // query for movie
  let response = await axios.get<TraktDetailMovie | undefined>(
    `${process.env.TRAKT_API_URL}/movies/${itemId}?${params.toString()}`,
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
  if (movie)
    movie = await getTraktDetailMoviePoster({
      movie,
      tmdbApiKey,
      tmdbApiUrl: process.env.TMDB_API_URL!,
      tmdbImageUrl: process.env.TMDB_IMAGE_URL!,
    });
  return movie;
};

const getMovieDetails = async (
  itemIds: number[],
  traktApiKey: string,
  tmdbApiKey: string
) => {
  const response: { itemId: number; data: TraktDetailMovie }[] = [];

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

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body || "{}");
    const { itemIds }: { itemIds: number[] } = requestBody;
    const { tmdbApiKey, traktApiKey } = await getTraktApiKeys({
      client,
      tmdbSecretName: process.env.TMDB_SECRET_NAME!,
      traktSecretName: process.env.TRAKT_SECRET_NAME!,
    });
    const response = await getMovieDetails(itemIds, traktApiKey, tmdbApiKey);

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error("Error getting Trakt movie detail:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Trakt movie detail",
      }),
    });
  }
};

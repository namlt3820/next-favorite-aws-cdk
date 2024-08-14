import axios from "axios";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktDetailMoviePoster } from "../../../../lambda-shared/src/getTraktSearchMoviePoster";
import { TraktDetailMovie } from "../../../../lambda-shared/src/types/TraktDetailMovie";

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

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";

import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktDetailMoviePoster } from "../../../../lambda-shared/src/getTraktDetailMoviePoster";
import { TraktDetailMovie } from "../../../../lambda-shared/src/types/TraktDetailMovie";
import { getUserFavoriteItems } from "../../../../lambda-shared/src/getUserFavoriteItems";
import { getRandomItem } from "../../../../lambda-shared/src/getRandomItem";
import { getTraktApiKeys } from "../../../../lambda-shared/src/getTraktApiKeys";
import { isItemRegistered } from "../../../../lambda-shared/src/isItemRegistered";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Create a Secret Manager client
const smClient = new SecretsManagerClient({ region: process.env.REGION! });

const getRecommendMovies = async (itemId: string, traktApiKey: string) => {
  const params = new URLSearchParams({
    extended: "full",
    limit: "15",
  });

  const response = await axios.get<TraktDetailMovie[]>(
    `${
      process.env.TRAKT_API_URL
    }/movies/${itemId}/related?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": 2,
        "trakt-api-key": traktApiKey,
      },
    }
  );

  return response.data;
};

const excludeRegisteredMovies = async ({
  movies,
  userId,
  recommendSourceId,
  tableName,
}: {
  movies: TraktDetailMovie[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
}) => {
  const moviesNotInRegisteredList: TraktDetailMovie[] = [];

  await Promise.all(
    movies.map(async (movie) => {
      const itemId = movie.ids.trakt;

      const isMovieRegistered = await isItemRegistered({
        itemId,
        userId,
        recommendSourceId,
        tableName,
        docClient,
      });

      if (!isMovieRegistered) {
        moviesNotInRegisteredList.push(movie);
      }
    })
  );

  return moviesNotInRegisteredList;
};

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Event:", JSON.stringify(event, null, 2));

    // check if user exists
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return withCorsHeaders(event, {
        statusCode: 401,
        body: JSON.stringify({
          message: "Unauthorized",
        }),
      });
    }

    // gather data from request and environment
    const requestBody = JSON.parse(event.body || "{}");
    const { recommendSourceId } = requestBody;
    const favoriteTableName = process.env.FAVORITE_TABLE_NAME!;
    const ignoreTableName = process.env.IGNORE_TABLE_NAME!;
    const traktSecretName = process.env.TRAKT_SECRET_NAME!;
    const tmdbSecretName = process.env.TMDB_SECRET_NAME!;

    // get API keys
    const { traktApiKey, tmdbApiKey } = await getTraktApiKeys({
      tmdbSecretName,
      traktSecretName,
      client: smClient,
    });

    // get user favorite movies
    const userFavoriteMovies = await getUserFavoriteItems({
      userId,
      recommendSourceId,
      tableName: favoriteTableName,
      docClient,
    });

    if (!userFavoriteMovies?.length) {
      return withCorsHeaders(event, {
        statusCode: 200,
        body: JSON.stringify({
          message: "Please search for and add a movie to your favorites first.",
        }),
      });
    }

    // get a random movie from user favorite list
    const randomMovie = getRandomItem(userFavoriteMovies);

    // get recommend movies for this random movie
    const recommendMovies = await getRecommendMovies(
      randomMovie.itemId,
      traktApiKey
    );

    // filter ignored and favorite movies from this recommend list
    let moviesNotInRegisteredList = await excludeRegisteredMovies({
      movies: recommendMovies,
      recommendSourceId,
      tableName: ignoreTableName,
      userId,
    });

    moviesNotInRegisteredList = await excludeRegisteredMovies({
      movies: moviesNotInRegisteredList,
      recommendSourceId,
      tableName: favoriteTableName,
      userId,
    });

    // add movie poster
    moviesNotInRegisteredList = await Promise.all(
      moviesNotInRegisteredList.map(async (movie) => {
        return await getTraktDetailMoviePoster({
          movie,
          tmdbApiKey,
          tmdbApiUrl: process.env.TMDB_API_URL!,
          tmdbImageUrl: process.env.TMDB_IMAGE_URL!,
        });
      })
    );

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(moviesNotInRegisteredList),
    });
  } catch (error) {
    console.log({ error });
    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({ message: "Recommend movies failed" }),
    });
  }
};

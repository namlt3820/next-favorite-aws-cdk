import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import querystring from "querystring";
import { TmdbMovie, TraktMovie } from "./types";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Create a Secret Manager client
const smClient = new SecretsManagerClient({ region: process.env.REGION! });

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
        ? `${process.env.TMDB_IMAGE_URL}/w500${response.data?.poster_path}`
        : "";
    } catch (error) {
      console.log({ error });
      movie.poster = "";
    }
  }
  return movie;
};

const getUserFavoriteMovies = async ({
  userId,
  recommendSourceId,
  tableName,
}: {
  userId: string;
  recommendSourceId: string;
  tableName: string;
}) => {
  const queryInput: QueryCommandInput = {
    TableName: tableName,
    IndexName: "userId_recommendSourceId",
    KeyConditionExpression: "userId_recommendSourceId = :key",
    ExpressionAttributeValues: {
      ":key": `${userId}_${recommendSourceId}`,
    },
  };
  const queryCommand = new QueryCommand(queryInput);
  const queryOutput = await docClient.send(queryCommand);

  return queryOutput.Items;
};

const getRandomMovie = (array: any[]) => {
  if (array.length === 0) {
    return undefined; // Handle the case where the array is empty
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

const getSecretString = async (secretName: string) => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await smClient.send(command);
  return data.SecretString || "";
};

const getRecommendMovies = async (itemId: string, traktApiKey: string) => {
  const response = await axios.get<TraktMovie[]>(
    `${
      process.env.TRAKT_API_URL
    }/movies/${itemId}/related?${querystring.stringify({
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

  return response.data;
};

const excludeRegisteredMovies = async ({
  movies,
  userId,
  recommendSourceId,
  tableName,
}: {
  movies: TraktMovie[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
}) => {
  const moviesNotInRegisteredList: TraktMovie[] = [];

  await Promise.all(
    movies.map(async (movie) => {
      const itemId = movie.ids.trakt;

      const queryInput: QueryCommandInput = {
        TableName: tableName,
        IndexName: "userId_recommendSourceId_itemId",
        KeyConditionExpression: "userId_recommendSourceId_itemId = :key",
        ExpressionAttributeValues: {
          ":key": `${userId}_${recommendSourceId}_${itemId}`,
        },
      };
      const queryCommand = new QueryCommand(queryInput);
      const queryOutput = await docClient.send(queryCommand);

      if (queryOutput.Count === 0 || !queryOutput.Count) {
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
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Unauthorized",
        }),
      };
    }

    // gather data from request and environment
    const requestBody = JSON.parse(event.body || "{}");
    const { recommendSourceId } = requestBody;
    const favoriteTableName = process.env.FAVORITE_TABLE_NAME!;
    const ignoreTableName = process.env.IGNORE_TABLE_NAME!;
    const traktSecretName = process.env.TRAKT_SECRET_NAME!;
    const tmdbSecretName = process.env.TMDB_SECRET_NAME!;

    const [traktApiKey, tmdbApiKey] = await Promise.all([
      // get external service api keys
      getSecretString(traktSecretName),
      getSecretString(tmdbSecretName),
    ]);

    // get user favorite movies
    const userFavoriteMovies = await getUserFavoriteMovies({
      userId,
      recommendSourceId,
      tableName: favoriteTableName,
    });

    if (!userFavoriteMovies?.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Please search for and add a movie to your favorites first.",
        }),
      };
    }

    // get a random movie from user favorite list
    const randomMovie = getRandomMovie(userFavoriteMovies);

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
        return await getMoviePoster(movie, tmdbApiKey);
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify(moviesNotInRegisteredList),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Recommend movies failed" }),
    };
  }
};

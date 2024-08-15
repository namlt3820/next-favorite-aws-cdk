import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { TraktTrendMovie } from "./types/TraktTrendMovie";
import { isItemRegistered } from "./isItemRegistered";

export const excludeRegisteredMovies = async ({
  movies,
  userId,
  recommendSourceId,
  tableNames,
  docClient,
}: {
  movies: TraktTrendMovie[];
  userId: string;
  recommendSourceId: string;
  tableNames: string[];
  docClient: DynamoDBDocumentClient;
}) => {
  let result: TraktTrendMovie[] = movies;

  for (const tableName of tableNames) {
    result = await excludeRegisteredMoviesForOneTable({
      movies: result,
      userId,
      recommendSourceId,
      tableName,
      docClient,
    });
  }

  return result;
};

const excludeRegisteredMoviesForOneTable = async ({
  movies,
  userId,
  recommendSourceId,
  tableName,
  docClient,
}: {
  movies: TraktTrendMovie[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
  docClient: DynamoDBDocumentClient;
}) => {
  const moviesNotInRegisteredList: TraktTrendMovie[] = [];

  await Promise.all(
    movies.map(async (movie) => {
      const itemId = movie.movie.ids.trakt;

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

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { isItemRegistered } from "./isItemRegistered";
import { Anime } from "./types/JikanAnime";

export const excludeRegisteredAnime = async ({
  anime,
  userId,
  recommendSourceId,
  tableNames,
  docClient,
}: {
  anime: Anime[];
  userId: string;
  recommendSourceId: string;
  tableNames: string[];
  docClient: DynamoDBDocumentClient;
}) => {
  let result: Anime[] = anime;

  for (const tableName of tableNames) {
    result = await excludeRegisteredAnimeForOneTable({
      anime: result,
      userId,
      recommendSourceId,
      tableName,
      docClient,
    });
  }

  return result;
};

const excludeRegisteredAnimeForOneTable = async ({
  anime,
  userId,
  recommendSourceId,
  tableName,
  docClient,
}: {
  anime: Anime[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
  docClient: DynamoDBDocumentClient;
}) => {
  const animeNotInRegisteredList: Anime[] = [];

  await Promise.all(
    anime.map(async (item) => {
      const itemId = item.mal_id;

      const isAnimeRegistered = await isItemRegistered({
        itemId,
        userId,
        recommendSourceId,
        tableName,
        docClient,
      });

      if (!isAnimeRegistered) {
        animeNotInRegisteredList.push(item);
      }
    })
  );

  return animeNotInRegisteredList;
};

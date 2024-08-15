import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { isItemRegistered } from "./isItemRegistered";
import { TraktTrendShow } from "./types/TraktTrendShow";

export const excludeRegisteredShows = async ({
  shows,
  userId,
  recommendSourceId,
  tableNames,
  docClient,
}: {
  shows: TraktTrendShow[];
  userId: string;
  recommendSourceId: string;
  tableNames: string[];
  docClient: DynamoDBDocumentClient;
}) => {
  let result: TraktTrendShow[] = shows;

  for (const tableName of tableNames) {
    result = await excludeRegisteredShowsForOneTable({
      shows: result,
      userId,
      recommendSourceId,
      tableName,
      docClient,
    });
  }

  return result;
};

const excludeRegisteredShowsForOneTable = async ({
  shows,
  userId,
  recommendSourceId,
  tableName,
  docClient,
}: {
  shows: TraktTrendShow[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
  docClient: DynamoDBDocumentClient;
}) => {
  const showsNotInRegisteredList: TraktTrendShow[] = [];

  await Promise.all(
    shows.map(async (show) => {
      const itemId = show.show.ids.trakt;

      const isShowRegistered = await isItemRegistered({
        itemId,
        userId,
        recommendSourceId,
        tableName,
        docClient,
      });

      if (!isShowRegistered) {
        showsNotInRegisteredList.push(show);
      }
    })
  );

  return showsNotInRegisteredList;
};

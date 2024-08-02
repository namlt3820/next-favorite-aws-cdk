import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { JikanAnime } from "./types";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const getUserFavoriteAnime = async ({
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

const getRandomAnime = (array: any[]) => {
  if (array.length === 0) {
    return undefined; // Handle the case where the array is empty
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

const getRecommendAnime = async (itemId: string): Promise<JikanAnime[]> => {
  const response = await axios.get(
    `${process.env.JIKAN_API_URL}/anime/${itemId}/recommendations`
  );

  return response.data?.data.slice(0, 20) || [];
};

const excludeRegisteredAnime = async ({
  anime,
  userId,
  recommendSourceId,
  tableName,
}: {
  anime: JikanAnime[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
}) => {
  const animeNotInRegisteredList: JikanAnime[] = [];

  await Promise.all(
    anime.map(async (item) => {
      const itemId = item.entry.mal_id;

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
        animeNotInRegisteredList.push(item);
      }
    })
  );

  return animeNotInRegisteredList;
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

    // get user favorite movies
    const userFavoriteAnime = await getUserFavoriteAnime({
      userId,
      recommendSourceId,
      tableName: favoriteTableName,
    });

    if (!userFavoriteAnime?.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Please search for and add a anime to your favorites first.",
        }),
      };
    }

    // get a random anime from user favorite list
    const randomAnime = getRandomAnime(userFavoriteAnime);

    // get recommend anime for this random anime
    const recommendAnime = await getRecommendAnime(randomAnime.itemId);

    // filter ignored and favorite anime from this recommend list
    let animeNotInRegisteredList = await excludeRegisteredAnime({
      anime: recommendAnime,
      recommendSourceId,
      tableName: ignoreTableName,
      userId,
    });

    animeNotInRegisteredList = await excludeRegisteredAnime({
      anime: animeNotInRegisteredList,
      recommendSourceId,
      tableName: favoriteTableName,
      userId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(animeNotInRegisteredList),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Recommend anime failed" }),
    };
  }
};

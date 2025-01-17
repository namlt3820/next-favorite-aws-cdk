import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";

import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktDetailShowPoster } from "../../../../lambda-shared/src/getTraktDetailShowPoster";
import { TraktDetailShow } from "../../../../lambda-shared/src/types/TraktDetailShow";
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

const getRecommendShows = async (itemId: string, traktApiKey: string) => {
  const params = new URLSearchParams({
    extended: "full",
  });

  const response = await axios.get<TraktDetailShow[]>(
    `${process.env.TRAKT_API_URL}/shows/${itemId}/related?${params.toString()}`,
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

const excludeRegisteredShows = async ({
  shows,
  userId,
  recommendSourceId,
  tableName,
}: {
  shows: TraktDetailShow[];
  userId: string;
  recommendSourceId: string;
  tableName: string;
}) => {
  const showsNotInRegisteredList: TraktDetailShow[] = [];

  await Promise.all(
    shows.map(async (show) => {
      const itemId = show.ids.trakt;

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

    // get user favorite shows
    const userFavoriteShows = await getUserFavoriteItems({
      userId,
      recommendSourceId,
      tableName: favoriteTableName,
      docClient,
    });

    if (!userFavoriteShows?.length) {
      return withCorsHeaders(event, {
        statusCode: 200,
        body: JSON.stringify({
          message: "Please search for and add a show to your favorites first.",
        }),
      });
    }

    // get a random show from user favorite list
    const randomShow = getRandomItem(userFavoriteShows);

    // get recommend shows for this random show
    const recommendShows = await getRecommendShows(
      randomShow.itemId,
      traktApiKey
    );

    // filter ignored and favorite shows from this recommend list
    let showsNotInRegisteredList = await excludeRegisteredShows({
      shows: recommendShows,
      recommendSourceId,
      tableName: ignoreTableName,
      userId,
    });

    showsNotInRegisteredList = await excludeRegisteredShows({
      shows: showsNotInRegisteredList,
      recommendSourceId,
      tableName: favoriteTableName,
      userId,
    });

    // add show poster
    showsNotInRegisteredList = await Promise.all(
      showsNotInRegisteredList.map(async (show) => {
        return await getTraktDetailShowPoster({
          show,
          tmdbApiKey,
          tmdbApiUrl: process.env.TMDB_API_URL!,
          tmdbImageUrl: process.env.TMDB_IMAGE_URL!,
        });
      })
    );

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(showsNotInRegisteredList),
    });
  } catch (error) {
    console.log({ error });
    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({ message: "Recommend shows failed" }),
    });
  }
};

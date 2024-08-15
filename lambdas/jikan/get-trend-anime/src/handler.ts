import axios from "axios";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { JikanAnime } from "../../../../lambda-shared/src/types/JIkanAnime";
import { excludeRegisteredAnime } from "../../../../lambda-shared/src/excludeRegisteredAnime";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const recommendSourceId =
    event.queryStringParameters?.recommendSourceId || "";
  const userId = event.queryStringParameters?.userId || "";

  const favoriteTableName = process.env.FAVORITE_TABLE_NAME!;
  const ignoreTableName = process.env.IGNORE_TABLE_NAME!;

  const params = new URLSearchParams({
    page: event.queryStringParameters?.["page"] || "1",
    limit: event.queryStringParameters?.["limit"] || "10",
    filter: "airing",
  });

  try {
    // query for anime
    const response = await axios.get<JikanAnime>(
      `${process.env.JIKAN_API_URL}/top/anime?${params.toString()}`
    );

    if (response.data.data.length && userId) {
      // filter ignored and favorite movies from this trending list
      response.data.data = await excludeRegisteredAnime({
        anime: response.data.data,
        recommendSourceId,
        tableNames: [ignoreTableName, favoriteTableName],
        userId,
        docClient,
      });
    }

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
    });
  } catch (error) {
    console.error("Error get trending Jikan anime:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error get trending Jikan anime",
      }),
    });
  }
};

import axios from "axios";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import pick from "lodash/pick";
import omitBy from "lodash/omitBy";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { getTraktTrendShowPoster } from "../../../../lambda-shared/src/getTraktTrendShowPoster";
import { TraktTrendShow } from "../../../../lambda-shared/src/types/TraktTrendShow";
import { getTraktApiKeys } from "../../../../lambda-shared/src/getTraktApiKeys";
import { excludeRegisteredShows } from "../../../../lambda-shared/src/excludeRegisteredShows";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Create a Secret Manager client
const smClient = new SecretsManagerClient({ region: process.env.REGION });

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const recommendSourceId =
    event.queryStringParameters?.recommendSourceId || "";
  const userId = event.queryStringParameters?.userId || "";

  const favoriteTableName = process.env.FAVORITE_TABLE_NAME!;
  const ignoreTableName = process.env.IGNORE_TABLE_NAME!;

  const params = new URLSearchParams({
    query: event.queryStringParameters?.["query"] || "",
    page: event.queryStringParameters?.["page"] || "1",
    limit: event.queryStringParameters?.["limit"] || "10",
    extended: "full",
  });

  try {
    const { tmdbApiKey, traktApiKey } = await getTraktApiKeys({
      client: smClient,
      tmdbSecretName: process.env.TMDB_SECRET_NAME!,
      traktSecretName: process.env.TRAKT_SECRET_NAME!,
    });

    // query for shows
    const response = await axios.get<TraktTrendShow[]>(
      `${process.env.TRAKT_API_URL}/search/show?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": 2,
          "trakt-api-key": traktApiKey,
        },
      }
    );

    // get pagination data
    const paginationHeaders = omitBy(
      pick(response.headers, [
        "x-pagination-page",
        "x-pagination-limit",
        "x-pagination-page-count",
        "x-pagination-item-count",
      ]),
      (value) => value === null
    );

    if (response.data.length && userId) {
      // filter ignored and favorite movies from this trending list
      response.data = await excludeRegisteredShows({
        shows: response.data,
        recommendSourceId,
        tableNames: [ignoreTableName, favoriteTableName],
        userId,
        docClient,
      });
    }

    // query for show poster
    if (response.data.length) {
      response.data = await Promise.all(
        response.data.map(async (show) => {
          return await getTraktTrendShowPoster({
            show,
            tmdbApiKey,
            tmdbApiUrl: process.env.TMDB_API_URL!,
            tmdbImageUrl: process.env.TMDB_IMAGE_URL!,
          });
        })
      );
    }

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
      headers: paginationHeaders,
    });
  } catch (error) {
    console.error("Error searching Trakt show:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Trakt show",
      }),
    });
  }
};

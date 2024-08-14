import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";
import { isItemRegistered } from "../../../../lambda-shared/src/isItemRegistered";
import { createCollectionItem } from "../../../../lambda-shared/src/createCollectionItem";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));
  const userId = event.requestContext?.authorizer?.claims?.sub;

  if (!userId) {
    return withCorsHeaders(event, {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized",
      }),
    });
  }

  const requestBody = JSON.parse(event.body || "{}");
  const { recommendSourceId, itemId } = requestBody;
  const tableName = process.env.TABLE_NAME!;

  if (
    await isItemRegistered({
      userId,
      recommendSourceId,
      itemId,
      tableName,
      docClient,
    })
  ) {
    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify({
        message: "Item has already been added to your ignore list",
      }),
    });
  }

  try {
    await createCollectionItem({
      userId,
      recommendSourceId,
      itemId,
      docClient,
    });
    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify({
        message: "Ignore item created successfully",
      }),
    });
  } catch (error) {
    console.log({ error });
    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({ message: "Ignore item creation failed" }),
    });
  }
};

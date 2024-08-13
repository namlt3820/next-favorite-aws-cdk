import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const withCorsHeaders = (
  event: APIGatewayEvent,
  response: { statusCode: number; body: string }
): APIGatewayProxyResult => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://nextfavorite.gladiolus.info",
  ];
  const requestOrigin = event.headers.origin || "";

  const isOriginAllowed = allowedOrigins.includes(requestOrigin);
  return isOriginAllowed
    ? {
        ...response,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Origin": requestOrigin,
          "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
          "Access-Control-Allow-Credentials": "true",
        },
      }
    : response;
};

const checkIfItemExists = async ({
  userId,
  recommendSourceId,
  itemId,
  tableName,
}: {
  userId: string;
  recommendSourceId: string;
  itemId: string;
  tableName: string;
}) => {
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

  return queryOutput.Count && queryOutput.Count > 0;
};

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
    await checkIfItemExists({ userId, recommendSourceId, itemId, tableName })
  ) {
    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify({
        message: "Item has already been added to your ignore list",
      }),
    });
  }

  const id = uuidv4();
  const createdAt = Math.floor(Date.now() / 1000);

  const putInput: PutCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      userId,
      recommendSourceId,
      itemId,
      id,
      userId_recommendSourceId_itemId: `${userId}_${recommendSourceId}_${itemId}`,
      userId_recommendSourceId: `${userId}_${recommendSourceId}`,
      createdAt,
    },
  };
  const command = new PutCommand(putInput);

  try {
    await docClient.send(command);
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

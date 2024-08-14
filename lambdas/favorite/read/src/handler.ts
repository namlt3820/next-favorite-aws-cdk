import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";

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
  const { recommendSourceId, lastKey, limit } = requestBody;

  const queryInput: QueryCommandInput = {
    TableName: process.env.TABLE_NAME!,
    IndexName: "userId_recommendSourceId",
    KeyConditionExpression: "userId_recommendSourceId = :key",
    ExpressionAttributeValues: {
      ":key": `${userId}_${recommendSourceId}`,
    },
    ExclusiveStartKey: lastKey,
    Limit: limit || 10,
    ScanIndexForward: false,
  };

  const queryCommand = new QueryCommand(queryInput);
  const queryOutput = await docClient.send(queryCommand);

  return withCorsHeaders(event, {
    statusCode: 200,
    body: JSON.stringify({
      items: queryOutput.Items || [],
      lastEvaluatedKey: queryOutput.LastEvaluatedKey,
    }),
  });
};

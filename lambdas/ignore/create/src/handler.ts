import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

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
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized",
      }),
    };
  }

  const requestBody = JSON.parse(event.body || "{}");
  const { recommendSourceId, itemId } = requestBody;
  const tableName = process.env.TABLE_NAME!;

  if (
    await checkIfItemExists({ userId, recommendSourceId, itemId, tableName })
  ) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Item has already been added to your ignore list",
      }),
    };
  }

  const id = uuidv4();
  const putInput: PutCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      userId,
      recommendSourceId,
      itemId,
      id,
      userId_recommendSourceId_itemId: `${userId}_${recommendSourceId}_${itemId}`,
    },
  };
  const command = new PutCommand(putInput);

  try {
    await docClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Ignore item created successfully",
      }),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Ignore item creation failed" }),
    };
  }
};

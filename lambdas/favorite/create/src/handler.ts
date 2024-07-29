import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const requestBody = JSON.parse(event.body || "{}");
  const { userId, recommendSourceId, itemId } = requestBody;
  const id = uuidv4();
  const params: PutCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      userId,
      recommendSourceId,
      itemId,
      id,
    },
  };
  const command = new PutCommand(params);

  try {
    await docClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Favorite item created successfully",
      }),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Favorite item creation failed" }),
    };
  }
};

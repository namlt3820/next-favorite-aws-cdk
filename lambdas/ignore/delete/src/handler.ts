import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  DeleteCommandInput,
  GetCommand,
  GetCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));
  try {
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
    const { id } = requestBody;

    const getInput: GetCommandInput = {
      TableName: process.env.TABLE_NAME!,
      Key: {
        id,
      },
    };
    const getCommand = new GetCommand(getInput);
    const item = await docClient.send(getCommand);
    if (!item.Item) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Success",
        }),
      };
    }

    if (item.Item.userId !== userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: "Unauthorized",
        }),
      };
    }

    const deleteInput: DeleteCommandInput = {
      TableName: process.env.TABLE_NAME!,
      Key: {
        id,
      },
    };
    const deleteCommand = new DeleteCommand(deleteInput);
    await docClient.send(deleteCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Success",
      }),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Ignore item deletion failed" }),
    };
  }
};

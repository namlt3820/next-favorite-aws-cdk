import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommandInput,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));
  try {
    const scanInput: ScanCommandInput = {
      TableName: process.env.TABLE_NAME!,
    };
    const scanCommand = new ScanCommand(scanInput);
    const scanOutput = await docClient.send(scanCommand);

    return {
      statusCode: 200,
      body: JSON.stringify(scanOutput.Items),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Get all recommend sources failed." }),
    };
  }
};

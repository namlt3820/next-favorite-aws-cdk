import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: "ap-southeast-1" });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async (event: PostConfirmationConfirmSignUpTriggerEvent) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const userName = event.userName;
  const email = event.request.userAttributes.email;
  const userId = event.request.userAttributes.sub;

  const params: PutCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      userId,
      email: email,
      userName,
    },
  };

  const command = new PutCommand(params);

  try {
    await docClient.send(command);
    console.log("User inserted successfully");
  } catch (error) {
    console.error("Error inserting user:", error);
  }

  return event;
};

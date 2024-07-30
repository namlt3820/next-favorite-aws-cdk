import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
  AdminAddUserToGroupCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: process.env.REGION! });

// Create a DynamoDB DocumentClient
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Create a Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION!,
});

const createUserInTable = async (
  event: PostConfirmationConfirmSignUpTriggerEvent
) => {
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
  await docClient.send(command);
  console.log("User inserted successfully");
};

const assignUserToGroup = async (
  event: PostConfirmationConfirmSignUpTriggerEvent
) => {
  const userPoolId = event.userPoolId;
  const groupName = process.env.GROUP_NAME!;
  const userName = event.userName;

  const params: AdminAddUserToGroupCommandInput = {
    UserPoolId: userPoolId,
    Username: userName,
    GroupName: groupName,
  };

  const command = new AdminAddUserToGroupCommand(params);
  await cognitoClient.send(command);
  console.log(`Successfully added ${userName} to group ${groupName}`);
};

export const handler = async (
  event: PostConfirmationConfirmSignUpTriggerEvent
) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    await createUserInTable(event);
    await assignUserToGroup(event);
  } catch (error) {
    console.error("Error post confirmation: ", error);
  }

  return event;
};

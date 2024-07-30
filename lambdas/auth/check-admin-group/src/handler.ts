import {
  APIGatewayAuthorizerResult,
  APIGatewayRequestAuthorizerEvent,
  StatementEffect,
} from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  AdminListGroupsForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION!,
});
const GROUP_NAME = "admin"; // The group you want to check for

export const handler = async (
  event: APIGatewayRequestAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const token = event.headers?.Authorization;

  // Check if the token is provided
  if (!token || !token.includes("Bearer")) {
    console.log("Unauthorized: No token provided");
    return generatePolicy("user", "Deny", event.methodArn);
  }

  try {
    // Verify the token and get the user information
    const username = await getUsernameFromToken(token.replace("Bearer ", ""));
    const userGroups = await listUserGroups(username);

    // Check if the user is in the required group
    const isInGroup = userGroups.includes(GROUP_NAME);

    if (isInGroup) {
      console.log("Authorized: User is in the admin group");
      return generatePolicy(username, "Allow", event.methodArn);
    } else {
      console.log("Unauthorized: User is not in the admin group");
      return generatePolicy(username, "Deny", event.methodArn);
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    return generatePolicy("user", "Deny", event.methodArn);
  }
};

// Function to verify the token and get the username
const getUsernameFromToken = async (token: string): Promise<string> => {
  const command = new GetUserCommand({ AccessToken: token });
  const response = await cognitoClient.send(command);
  return response.Username!;
};

// Function to list the groups for a user
const listUserGroups = async (username: string): Promise<string[]> => {
  const command = new AdminListGroupsForUserCommand({
    UserPoolId: process.env.USER_POOL_ID!,
    Username: username,
  });
  const response = await cognitoClient.send(command);
  return response.Groups?.map((group) => group.GroupName!) || [];
};

// Helper function to generate an IAM policy
const generatePolicy = (
  principalId: string,
  effect: StatementEffect,
  resource: string
): APIGatewayAuthorizerResult => {
  const authResponse: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
  return authResponse;
};

import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  GetUserCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION!,
});

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { accessToken } = JSON.parse(event.body || "{}");
    const getUserInput: GetUserCommandInput = {
      AccessToken: accessToken,
    };
    const getUserCommand = new GetUserCommand(getUserInput);
    const { UserAttributes, Username } = await client.send(getUserCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ UserAttributes, Username }),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Get user data failed." }),
    };
  }
};

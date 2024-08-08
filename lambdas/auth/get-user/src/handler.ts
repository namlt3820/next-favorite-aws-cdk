import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  GetUserCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION!,
});

const withCorsHeaders = (
  event: APIGatewayEvent,
  response: { statusCode: number; body: string }
): APIGatewayProxyResult => {
  const allowedOrigins = ["http://localhost:3000"];
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

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify({ UserAttributes, Username }),
    });
  } catch (error) {
    console.log({ error });
    return withCorsHeaders(event, {
      statusCode: 400,
      body: JSON.stringify({ message: "Get user data failed." }),
    });
  }
};

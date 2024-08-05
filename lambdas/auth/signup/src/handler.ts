import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  SignUpCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import * as crypto from "crypto";

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

const getSecretString = async (secretName: string) => {
  const client = new SecretsManagerClient({ region: process.env.REGION });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  const secretString = data.SecretString;

  if (!secretString) {
    throw new Error("SecretString is undefined");
  }

  return secretString;
};

const calculateSecretHash = (
  username: string,
  clientId: string,
  clientSecret: string
): string => {
  const message = username + clientId;
  const hmac = crypto.createHmac("SHA256", clientSecret);
  hmac.update(message);
  return hmac.digest("base64");
};

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
  const { username, password, email } = JSON.parse(event.body || "{}");
  const clientId = process.env.CLIENT_ID || "";

  const secretName = process.env.SECRET_NAME;
  if (!secretName) {
    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "SECRET_NAME environment variable is not set",
      }),
    });
  }

  const secretString = await getSecretString(secretName);
  const secretHash = calculateSecretHash(username, clientId, secretString);

  try {
    const params: SignUpCommandInput = {
      ClientId: clientId,
      Password: password,
      Username: username,
      UserAttributes: [{ Name: "email", Value: email }],
      SecretHash: secretHash,
    };

    const command = new SignUpCommand(params);

    await client.send(command);
    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify({
        message:
          "User created successfully. Verification email sent. Please check your inbox.",
      }),
    });
  } catch (error) {
    console.log({ error });
    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "User creation failed.",
      }),
    });
  }
};

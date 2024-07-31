import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  InitiateAuthCommandInput,
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

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { username, password } = JSON.parse(event.body || "{}");
  const clientId = process.env.CLIENT_ID || "";

  const secretName = process.env.SECRET_NAME;
  if (!secretName) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "SECRET_NAME environment variable is not set",
      }),
    };
  }

  const secretString = await getSecretString(secretName);
  const secretHash = calculateSecretHash(username, clientId, secretString);

  try {
    const params: InitiateAuthCommandInput = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: secretHash,
      },
    };

    const command = new InitiateAuthCommand(params);

    const data = await client.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify(data.AuthenticationResult),
    };
  } catch (error) {
    console.log({ error });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Login error" }),
    };
  }
};

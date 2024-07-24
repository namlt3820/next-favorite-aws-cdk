import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

const client = new SecretsManagerClient({ region: process.env.REGION });

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const { authCode } = JSON.parse(event.body || "{}");
  const secretName = process.env.SECRET_NAME;

  if (!secretName) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "SECRET_NAME environment variable is not set",
      }),
    };
  }

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await client.send(command);
    const secretString = data.SecretString;

    if (!secretString) {
      throw new Error("SecretString is undefined");
    }

    const response = await axios.post(
      `https://${process.env.DOMAIN_NAME}/oauth2/token`,
      querystring.stringify({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: `${process.env.REDIRECT_URI}`,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.CLIENT_ID}:${secretString}`
          ).toString("base64")}`,
        },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error exchanging authorization code:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error exchanging authorization code",
      }),
    };
  }
};

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
  const query = event.queryStringParameters?.["query"] || "";
  const page = event.queryStringParameters?.["page"] || 1;
  const limit = event.queryStringParameters?.["limit"] || 10;
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
    const traktApiKey = data.SecretString;

    if (!traktApiKey) {
      throw new Error("traktApiKey is undefined");
    }

    const response = await axios.get(
      `${process.env.TRAKT_API_URL}/search/movie?${querystring.stringify({
        query,
        fields: "title",
        page,
        limit,
      })}`,
      {
        headers: {
          "Content-Type": "application/json",
          "trakt-api-version": 2,
          "trakt-api-key": traktApiKey,
        },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error searching Trakt API movie:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Trakt API movie",
      }),
    };
  }
};

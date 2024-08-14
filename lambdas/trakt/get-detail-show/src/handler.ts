import axios from "axios";
import querystring from "querystring";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { TraktDetailShow } from "../../../../lambda-shared/src/types/TraktDetailShow";
import { getTraktDetailShowPoster } from "../../../../lambda-shared/src/getTraktDetailShowPoster";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";

const client = new SecretsManagerClient({ region: process.env.REGION });

const getShowDetail = async (
  itemId: number,
  traktApiKey: string,
  tmdbApiKey: string
) => {
  // query for show
  let response = await axios.get<TraktDetailShow | undefined>(
    `${process.env.TRAKT_API_URL}/shows/${itemId}?${querystring.stringify({
      extended: "full",
    })}`,
    {
      headers: {
        "Content-Type": "application/json",
        "trakt-api-version": 2,
        "trakt-api-key": traktApiKey,
      },
    }
  );

  // query for show poster
  let show = response.data;
  if (show)
    show = await getTraktDetailShowPoster({
      show,
      tmdbApiKey,
      tmdbApiUrl: process.env.TMDB_API_URL!,
      tmdbImageUrl: process.env.TMDB_IMAGE_URL!,
    });
  return show;
};

const getShowDetails = async (
  itemIds: number[],
  traktApiKey: string,
  tmdbApiKey: string
) => {
  const response: { itemId: number; data: TraktDetailShow }[] = [];

  await Promise.all(
    itemIds.map(async (itemId) => {
      const data = await getShowDetail(itemId, traktApiKey, tmdbApiKey);

      if (data) {
        response.push({
          itemId,
          data,
        });
      }
    })
  );

  return response;
};

const getSecretString = async (secretName: string) => {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const data = await client.send(command);
  return data.SecretString || "";
};

const getApiKeys = async () => {
  const traktSecretName = process.env.TRAKT_SECRET_NAME;
  const tmdbSecretName = process.env.TMDB_SECRET_NAME;

  if (!traktSecretName || !tmdbSecretName) {
    throw new Error("SECRET_NAME environment variable is not set");
  }

  const [traktApiKey, tmdbApiKey] = await Promise.all([
    getSecretString(traktSecretName),
    getSecretString(tmdbSecretName),
  ]);

  if (!traktApiKey || !tmdbApiKey) {
    throw new Error("api key is undefined");
  }

  return {
    traktApiKey,
    tmdbApiKey,
  };
};

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body || "{}");
    const { itemIds }: { itemIds: number[] } = requestBody;
    const { tmdbApiKey, traktApiKey } = await getApiKeys();
    const response = await getShowDetails(itemIds, traktApiKey, tmdbApiKey);

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error("Error getting Trakt show detail:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Trakt show detail",
      }),
    });
  }
};

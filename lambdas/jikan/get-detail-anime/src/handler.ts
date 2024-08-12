import axios from "axios";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

const getAnimeDetail = async (itemId: number) => {
  let response = await axios.get(
    `${process.env.JIKAN_API_URL}/anime/${itemId}`
  );

  return response.data?.data;
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

const getAnimeDetails = async (itemIds: number[]) => {
  const response: { itemId: number; data: any }[] = [];

  await Promise.all(
    itemIds.map(async (itemId) => {
      const data = await getAnimeDetail(itemId);

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

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const requestBody = JSON.parse(event.body || "{}");
    const { itemIds }: { itemIds: number[] } = requestBody;
    const response = await getAnimeDetails(itemIds);

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error("Error getting Jikan anime detail:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Jikan anime detail",
      }),
    });
  }
};

import axios from "axios";
import querystring from "querystring";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

const withCorsHeaders = (
  event: APIGatewayEvent,
  response: { statusCode: number; body: string }
): APIGatewayProxyResult => {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://nextfavorite.gladiolus.info",
  ];
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
  const page = event.queryStringParameters?.["page"] || 1;
  const limit = event.queryStringParameters?.["limit"] || 10;

  try {
    // query for anime
    const response = await axios.get(
      `${process.env.JIKAN_API_URL}/top/anime?${querystring.stringify({
        filter: "airing",
        page,
        limit,
      })}`
    );

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
    });
  } catch (error) {
    console.error("Error get trending Jikan anime:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error get trending Jikan anime",
      }),
    });
  }
};

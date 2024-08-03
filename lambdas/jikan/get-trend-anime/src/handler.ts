import axios from "axios";
import querystring from "querystring";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

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

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error get trending Jikan anime:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error get trending Jikan anime",
      }),
    };
  }
};

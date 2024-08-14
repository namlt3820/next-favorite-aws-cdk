import axios from "axios";
import querystring from "querystring";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { withCorsHeaders } from "../../../../lambda-shared/src/withCorsHeaders";

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const query = event.queryStringParameters?.["query"] || "";
  const page = event.queryStringParameters?.["page"] || 1;
  const limit = event.queryStringParameters?.["limit"] || 10;

  try {
    // query for anime
    const response = await axios.get(
      `${process.env.JIKAN_API_URL}/anime?${querystring.stringify({
        q: query,
        page,
        limit,
      })}`
    );

    return withCorsHeaders(event, {
      statusCode: 200,
      body: JSON.stringify(response.data),
    });
  } catch (error) {
    console.error("Error searching Jikan anime:", error);

    return withCorsHeaders(event, {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Jikan anime",
      }),
    });
  }
};

import axios from "axios";
import querystring from "querystring";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

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

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Error searching Jikan anime:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error searching Jikan anime",
      }),
    };
  }
};

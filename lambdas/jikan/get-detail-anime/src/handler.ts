import axios from "axios";
import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

const getAnimeDetail = async (itemId: number) => {
  let response = await axios.get(
    `${process.env.JIKAN_API_URL}/anime/${itemId}`
  );

  return response.data?.data;
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

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error getting Jikan anime detail:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error getting Jikan anime detail",
      }),
    };
  }
};

import type { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";

export const withCorsHeaders = (
  event: APIGatewayEvent,
  response: {
    statusCode: number;
    body: string;
    headers?: { [header: string]: string | number | boolean };
  }
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
          "Access-Control-Expose-Headers":
            "X-Pagination-Page, X-Pagination-Page-Count, X-Pagination-Limit, X-Pagination-Item-Count",
          ...(response.headers || {}),
        },
      }
    : response;
};

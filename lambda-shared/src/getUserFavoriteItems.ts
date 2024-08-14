import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

export const getUserFavoriteItems = async ({
  userId,
  recommendSourceId,
  tableName,
  docClient,
}: {
  userId: string;
  recommendSourceId: string;
  tableName: string;
  docClient: DynamoDBDocumentClient;
}) => {
  const queryInput: QueryCommandInput = {
    TableName: tableName,
    IndexName: "userId_recommendSourceId",
    KeyConditionExpression: "userId_recommendSourceId = :key",
    ExpressionAttributeValues: {
      ":key": `${userId}_${recommendSourceId}`,
    },
  };
  const queryCommand = new QueryCommand(queryInput);
  const queryOutput = await docClient.send(queryCommand);

  return queryOutput.Items;
};

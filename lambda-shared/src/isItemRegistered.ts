import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

type ItemId = string | number;

export const isItemRegistered = async ({
  itemId,
  userId,
  recommendSourceId,
  tableName,
  docClient,
}: {
  itemId: ItemId;
  userId: string;
  recommendSourceId: string;
  tableName: string;
  docClient: DynamoDBDocumentClient;
}) => {
  const queryInput: QueryCommandInput = {
    TableName: tableName,
    IndexName: "userId_recommendSourceId_itemId",
    KeyConditionExpression: "userId_recommendSourceId_itemId = :key",
    ExpressionAttributeValues: {
      ":key": `${userId}_${recommendSourceId}_${itemId}`,
    },
  };
  const queryCommand = new QueryCommand(queryInput);
  const queryOutput = await docClient.send(queryCommand);

  return !!queryOutput.Count;
};

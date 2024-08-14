import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

export const createCollectionItem = async ({
  userId,
  recommendSourceId,
  itemId,
  docClient,
}: {
  userId: string;
  recommendSourceId: string;
  itemId: string | number;
  docClient: DynamoDBDocumentClient;
}) => {
  const id = uuidv4();
  const createdAt = Math.floor(Date.now() / 1000);

  const putInput: PutCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: {
      userId,
      recommendSourceId,
      itemId,
      id,
      userId_recommendSourceId_itemId: `${userId}_${recommendSourceId}_${itemId}`,
      userId_recommendSourceId: `${userId}_${recommendSourceId}`,
      createdAt,
    },
  };
  const command = new PutCommand(putInput);

  await docClient.send(command);
};

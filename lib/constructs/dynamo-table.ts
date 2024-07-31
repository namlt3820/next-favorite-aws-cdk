import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export const dynamoTableConstruct = ({
  scope,
  env,
  removalPolicy,
}: {
  scope: Construct;
  env: string;
  removalPolicy: cdk.RemovalPolicy;
}) => {
  const userTableName = `NF-UserTable-${env}`;
  const userTable = new dynamodb.Table(scope, userTableName, {
    tableName: userTableName,
    partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy,
  });

  const recommendSourceTableName = `NF-RecommendSourceTable-${env}`;
  const recommendSourceTable = new dynamodb.Table(
    scope,
    recommendSourceTableName,
    {
      tableName: recommendSourceTableName,
      partitionKey: {
        name: "recommendSourceId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
    }
  );

  const favoriteTableName = `NF-FavoriteTable-${env}`;
  const favoriteTable = new dynamodb.Table(scope, favoriteTableName, {
    tableName: favoriteTableName,
    partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy,
  });

  favoriteTable.addGlobalSecondaryIndex({
    indexName: "userId_recommendSourceId_itemId",
    partitionKey: {
      name: "userId_recommendSourceId_itemId",
      type: dynamodb.AttributeType.STRING,
    },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  const ignoreTableName = `NF-IgnoreTable-${env}`;
  const ignoreTable = new dynamodb.Table(scope, ignoreTableName, {
    tableName: ignoreTableName,
    partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy,
  });

  ignoreTable.addGlobalSecondaryIndex({
    indexName: "userId_recommendSourceId_itemId",
    partitionKey: {
      name: "userId_recommendSourceId_itemId",
      type: dynamodb.AttributeType.STRING,
    },
    projectionType: dynamodb.ProjectionType.ALL,
  });

  new cdk.CfnOutput(scope, `NF-UserTableArn-${env}`, {
    value: userTable.tableArn,
  });

  new cdk.CfnOutput(scope, `NF-RecommendSourceTableArn-${env}`, {
    value: recommendSourceTable.tableArn,
  });

  new cdk.CfnOutput(scope, `NF-FavoriteTableArn-${env}`, {
    value: favoriteTable.tableArn,
  });

  new cdk.CfnOutput(scope, `NF-IgnoreTableArn-${env}`, {
    value: ignoreTable.tableArn,
  });

  return {
    userTable,
    recommendSourceTable,
    favoriteTable,
    ignoreTable,
  };
};

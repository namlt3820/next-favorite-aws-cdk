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

  new cdk.CfnOutput(scope, `NF-UserTableArn-${env}`, {
    value: userTable.tableArn,
  });

  return { userTable };
};

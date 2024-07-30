import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const createIgnoreItemConstruct = ({
  scope,
  tableName,
  env,
}: {
  scope: Construct;
  tableName: string;
  env: string;
}) => {
  const createIgnoreItemFunction = new lambda.Function(
    scope,
    `NF-CreateIgnoreItemFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/ignore/create/dist"),
      environment: {
        TABLE_NAME: tableName,
      },
    }
  );

  return { createIgnoreItemFunction };
};

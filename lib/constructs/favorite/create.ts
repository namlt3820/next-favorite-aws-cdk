import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const createFavoriteItemConstruct = ({
  scope,
  tableName,
  env,
}: {
  scope: Construct;
  tableName: string;
  env: string;
}) => {
  const createFavoriteItemFunction = new lambda.Function(
    scope,
    `NF-CreateFavoriteItemFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/favorite/create/dist"),
      environment: {
        TABLE_NAME: tableName,
      },
    }
  );

  return { createFavoriteItemFunction };
};

import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const createRecommendSourceConstruct = ({
  scope,
  env,
  tableName,
}: {
  scope: Construct;
  env: string;
  tableName: string;
}) => {
  const region = process.env.AWS_REGION!;

  const createRecommendSourceFunction = new lambda.Function(
    scope,
    `NF-CreateRecommendSourceFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/create-recommend-source/dist"),
      environment: {
        REGION: region,
        TABLE_NAME: tableName,
      },
    }
  );

  return { createRecommendSourceFunction };
};

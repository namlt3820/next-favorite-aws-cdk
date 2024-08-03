import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const getAllRecommendSourcesConstruct = ({
  scope,
  env,
  tableName,
}: {
  scope: Construct;
  env: string;
  tableName: string;
}) => {
  const region = process.env.AWS_REGION!;

  const getAllRecommendSourcesFunction = new lambda.Function(
    scope,
    `NF-GetAllRecommendSourcesFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/recommend-source/read/dist"),
      environment: {
        REGION: region,
        TABLE_NAME: tableName,
      },
    }
  );

  return { getAllRecommendSourcesFunction };
};

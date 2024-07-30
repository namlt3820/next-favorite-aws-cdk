import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const deleteIgnoreItemConstruct = ({
  scope,
  tableName,
  env,
}: {
  scope: Construct;
  tableName: string;
  env: string;
}) => {
  const region = process.env.AWS_REGION!;

  const deleteIgnoreItemFunction = new lambda.Function(
    scope,
    `NF-DeleteIgnoreItemFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/ignore/delete/dist"),
      environment: {
        TABLE_NAME: tableName,
        REGION: region,
      },
    }
  );

  return { deleteIgnoreItemFunction };
};

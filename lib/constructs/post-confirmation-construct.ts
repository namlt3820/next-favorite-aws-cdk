import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const postConfirmationConstruct = ({
  scope,
  tableName,
  env,
}: {
  scope: Construct;
  tableName: string;
  env: string;
}) => {
  const postConfirmationFunction = new lambda.Function(
    scope,
    `NF-PostConfirmationFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/post-confirmation/dist"),
      environment: {
        TABLE_NAME: tableName,
      },
    }
  );

  return postConfirmationFunction;
};

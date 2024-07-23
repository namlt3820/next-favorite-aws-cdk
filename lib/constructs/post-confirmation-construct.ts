import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const postConfirmationConstruct = ({
  scope,
  tableName,
}: {
  scope: Construct;
  tableName: string;
}) => {
  const postConfirmationFunction = new lambda.Function(
    scope,
    "PostConfirmationFunction",
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

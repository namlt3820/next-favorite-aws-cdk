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
  const region = process.env.AWS_REGION!;

  const postConfirmationFunction = new lambda.Function(
    scope,
    `NF-PostConfirmationFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/auth/post-confirmation/dist"),
      environment: {
        TABLE_NAME: tableName,
        REGION: region,
        GROUP_NAME: "user",
      },
    }
  );

  return postConfirmationFunction;
};

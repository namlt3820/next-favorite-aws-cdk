import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const getUserConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const region = process.env.AWS_REGION!;

  const getUserFunction = new lambda.Function(
    scope,
    `NF-GetUserFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/auth/get-user/dist"),
      environment: {
        REGION: region,
      },
    }
  );

  return { getUserFunction };
};

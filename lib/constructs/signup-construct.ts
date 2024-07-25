import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const signupConstruct = ({
  scope,
  clientId,
  env,
  secretName,
}: {
  scope: Construct;
  clientId: string;
  env: string;
  secretName: string;
}) => {
  const region = process.env.AWS_REGION!;

  const signupFunction = new lambda.Function(
    scope,
    `NF-SignupFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/signup/dist"),
      environment: {
        CLIENT_ID: clientId,
        REGION: region,
        SECRET_NAME: secretName,
      },
    }
  );

  return { signupFunction };
};

import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const userConfirmationConstruct = ({
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

  const userConfirmationFunction = new lambda.Function(
    scope,
    `NF-UserConfirmationFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/auth/user-confirmation/dist"),
      environment: {
        CLIENT_ID: clientId,
        REGION: region,
        SECRET_NAME: secretName,
      },
      timeout: cdk.Duration.seconds(10),
    }
  );

  return { userConfirmationFunction };
};

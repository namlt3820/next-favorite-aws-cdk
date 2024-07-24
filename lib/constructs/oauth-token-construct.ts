import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const oauthTokenConstruct = ({
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
  const domainName = process.env.AWS_COGNITO_DOMAIN_NAME!;
  const redirectUri = process.env.AWS_CALLBACK_URL!;
  const region = process.env.AWS_REGION!;

  const oauthTokenFunction = new lambda.Function(
    scope,
    `NF-OAuthTokenFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/oauth-token/dist"),
      environment: {
        CLIENT_ID: clientId,
        DOMAIN_NAME: domainName,
        REDIRECT_URI: redirectUri,
        REGION: region,
        SECRET_NAME: secretName,
      },
    }
  );

  return { oauthTokenFunction };
};

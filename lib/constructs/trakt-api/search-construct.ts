import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const traktApiSearchConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const region = process.env.AWS_REGION!;
  const secretName = `NF-TraktApiKeySecret-${env}`;
  const traktApiUrl = process.env.AWS_TRAKT_API_URL!;

  const traktApiSearchFunction = new lambda.Function(
    scope,
    `NF-TraktApiSearchFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/trakt-api/search/dist"),
      environment: {
        TRAKT_API_URL: traktApiUrl,
        REGION: region,
        SECRET_NAME: secretName,
      },
    }
  );

  return { traktApiSearchFunction };
};

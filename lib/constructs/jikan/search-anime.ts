import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const jikanSearchAnimeConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const jikanSearchAnimeFunction = new lambda.Function(
    scope,
    `NF-JikanSearchAnimeFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/jikan/search-anime/dist"),
      environment: {
        JIKAN_API_URL: process.env.JIKAN_API_URL!,
      },
      timeout: cdk.Duration.seconds(10),
    }
  );

  return { jikanSearchAnimeFunction };
};

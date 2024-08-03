import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const jikanGetDetailAnimeConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const jikanGetDetailAnimeFunction = new lambda.Function(
    scope,
    `NF-JikanGetDetailAnimeFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/jikan/get-detail-anime/dist"),
      environment: {
        JIKAN_API_URL: process.env.JIKAN_API_URL!,
      },
      timeout: cdk.Duration.seconds(10),
    }
  );

  return { jikanGetDetailAnimeFunction };
};

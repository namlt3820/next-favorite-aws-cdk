import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const jikanRecommendAnimeConstruct = ({
  scope,
  env,
  favoriteTableName,
  ignoreTableName,
}: {
  scope: Construct;
  env: string;
  favoriteTableName: string;
  ignoreTableName: string;
}) => {
  const region = process.env.AWS_REGION!;
  const jikanApiUrl = process.env.JIKAN_API_URL!;

  const jikanRecommendAnimeFunction = new lambda.Function(
    scope,
    `NF-JikanRecommendAnimeFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/jikan/recommend-anime/dist"),
      environment: {
        JIKAN_API_URL: jikanApiUrl,
        REGION: region,
        IGNORE_TABLE_NAME: ignoreTableName,
        FAVORITE_TABLE_NAME: favoriteTableName,
      },
      timeout: cdk.Duration.seconds(10),
    }
  );

  return { jikanRecommendAnimeFunction };
};

import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const traktGetTrendShowConstruct = ({
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
  const traktSecretName = `NF-TraktApiKeySecret-${env}`;
  const tmdbSecretName = `NF-TmdbApiKeySecret-${env}`;
  const traktApiUrl = process.env.TRAKT_API_URL!;
  const tmdbApiUrl = process.env.TMDB_API_URL!;
  const tmdbImageUrl = process.env.TMDB_IMAGE_URL!;

  const traktGetTrendShowFunction = new lambda.Function(
    scope,
    `NF-TraktGetTrendShowFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/trakt/get-trend-show/dist"),
      environment: {
        TRAKT_API_URL: traktApiUrl,
        TMDB_API_URL: tmdbApiUrl,
        TMDB_IMAGE_URL: tmdbImageUrl,
        REGION: region,
        TRAKT_SECRET_NAME: traktSecretName,
        TMDB_SECRET_NAME: tmdbSecretName,
        IGNORE_TABLE_NAME: ignoreTableName,
        FAVORITE_TABLE_NAME: favoriteTableName,
      },
      timeout: cdk.Duration.seconds(10),
    }
  );

  return { traktGetTrendShowFunction };
};

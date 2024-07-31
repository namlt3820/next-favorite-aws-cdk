import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const traktGetTrendMovieConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const region = process.env.AWS_REGION!;
  const traktSecretName = `NF-TraktApiKeySecret-${env}`;
  const tmdbSecretName = `NF-TmdbApiKeySecret-${env}`;
  const traktApiUrl = process.env.TRAKT_API_URL!;
  const tmdbApiUrl = process.env.TMDB_API_URL!;
  const tmdbImageUrl = process.env.TMDB_IMAGE_URL!;

  const traktGetTrendMovieFunction = new lambda.Function(
    scope,
    `NF-TraktGetTrendMovieFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/trakt/get-trend-movie/dist"),
      environment: {
        TRAKT_API_URL: traktApiUrl,
        TMDB_API_URL: tmdbApiUrl,
        TMDB_IMAGE_URL: tmdbImageUrl,
        REGION: region,
        TRAKT_SECRET_NAME: traktSecretName,
        TMDB_SECRET_NAME: tmdbSecretName,
      },
    }
  );

  return { traktGetTrendMovieFunction };
};
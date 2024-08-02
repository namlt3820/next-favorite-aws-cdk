import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const traktSearchMovieConstruct = ({
  scope,
  env,
  layer,
}: {
  scope: Construct;
  env: string;
  layer?: lambda.ILayerVersion;
}) => {
  const region = process.env.AWS_REGION!;
  const traktSecretName = `NF-TraktApiKeySecret-${env}`;
  const tmdbSecretName = `NF-TmdbApiKeySecret-${env}`;
  const traktApiUrl = process.env.TRAKT_API_URL!;
  const tmdbApiUrl = process.env.TMDB_API_URL!;
  const tmdbImageUrl = process.env.TMDB_IMAGE_URL!;

  const traktSearchMovieFunction = new lambda.Function(
    scope,
    `NF-TraktSearchMovieFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/trakt/search-movie/dist"),
      environment: {
        TRAKT_API_URL: traktApiUrl,
        TMDB_API_URL: tmdbApiUrl,
        TMDB_IMAGE_URL: tmdbImageUrl,
        REGION: region,
        TRAKT_SECRET_NAME: traktSecretName,
        TMDB_SECRET_NAME: tmdbSecretName,
      },
      layers: layer ? [layer] : [],
      timeout: cdk.Duration.seconds(10),
    }
  );

  return { traktSearchMovieFunction };
};

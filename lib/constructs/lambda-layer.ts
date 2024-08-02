import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const lambdaLayerConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const lambdaLayer = new lambda.LayerVersion(scope, `NF-LambdaLayer-${env}`, {
    code: lambda.Code.fromAsset(path.join("layer/dist")),
    compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  });

  return {
    lambdaLayer,
  };
};

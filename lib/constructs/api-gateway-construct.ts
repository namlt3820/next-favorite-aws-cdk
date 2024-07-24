import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const apiGatewayConstruct = ({
  scope,
  oauthTokenFunction,
  env,
}: {
  scope: Construct;
  oauthTokenFunction: lambda.Function;
  env: string;
}) => {
  const apiGatewayId = `NF-ApiGateway-${env}`;
  const apiGateway = new apigateway.RestApi(scope, apiGatewayId, {
    restApiName: apiGatewayId,
  });

  const deployment = new apigateway.Deployment(scope, `NF-Deployment-${env}`, {
    api: apiGateway,
  });

  new apigateway.Stage(scope, `NF-Stage-${env}`, {
    deployment: deployment,
    stageName: env,
  });

  const oauthTokenIntegration = new apigateway.LambdaIntegration(
    oauthTokenFunction
  );

  const resource = apiGateway.root.addResource("exchange-auth-code");
  resource.addMethod("POST", oauthTokenIntegration);

  return { apiGateway };
};

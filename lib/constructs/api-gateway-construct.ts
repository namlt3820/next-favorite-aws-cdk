import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const apiGatewayConstruct = ({
  scope,
  oauthTokenFunction,
  loginFunction,
  env,
}: {
  scope: Construct;
  oauthTokenFunction: lambda.Function;
  loginFunction: lambda.Function;
  env: string;
}) => {
  const apiGatewayId = `NF-ApiGateway-${env}`;
  const apiGateway = new apigateway.RestApi(scope, apiGatewayId, {
    restApiName: apiGatewayId,
    deployOptions: {
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
    },
    cloudWatchRole: true,
  });

  // route auth
  const authResource = apiGateway.root.addResource("auth");

  // route issue tokens from authorization code
  const tokenResource = authResource.addResource("token");
  const oauthTokenIntegration = new apigateway.LambdaIntegration(
    oauthTokenFunction
  );
  tokenResource.addMethod("POST", oauthTokenIntegration);

  // route login
  const loginResource = authResource.addResource("login");
  const loginIntegration = new apigateway.LambdaIntegration(loginFunction);
  loginResource.addMethod("POST", loginIntegration);

  const deployment = new apigateway.Deployment(scope, `NF-Deployment-${env}`, {
    api: apiGateway,
  });

  new apigateway.Stage(scope, `NF-Stage-${env}`, {
    deployment: deployment,
    stageName: env,
  });

  return { apiGateway };
};

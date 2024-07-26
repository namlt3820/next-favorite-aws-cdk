import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const apiGatewayConstruct = ({
  scope,
  oauthTokenFunction,
  loginFunction,
  signupFunction,
  userConfirmationFunction,
  env,
  createRecommendSourceFunction,
}: {
  scope: Construct;
  oauthTokenFunction: lambda.Function;
  loginFunction: lambda.Function;
  signupFunction: lambda.Function;
  userConfirmationFunction: lambda.Function;
  env: string;
  createRecommendSourceFunction: lambda.Function;
}) => {
  // create api gateway
  const apiGatewayId = `NF-ApiGateway-${env}`;
  const apiGateway = new apigateway.RestApi(scope, apiGatewayId, {
    restApiName: apiGatewayId,
    deployOptions: {
      loggingLevel: apigateway.MethodLoggingLevel.INFO,
      dataTraceEnabled: true,
    },
    cloudWatchRole: true,
  });

  // create request validator
  const requestValidatorId = `NF-RequestValidator-${env}`;
  const requestValidator = apiGateway.addRequestValidator(requestValidatorId, {
    requestValidatorName: requestValidatorId,
    validateRequestBody: true,
    validateRequestParameters: true,
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

  // route signup
  const signupSource = authResource.addResource("signup");
  const signupIntegration = new apigateway.LambdaIntegration(signupFunction);
  signupSource.addMethod("POST", signupIntegration, {
    requestValidator,
    requestModels: {
      "application/json": new apigateway.Model(
        scope,
        `NF-SignupRequestModel-${env}`,
        {
          restApi: apiGateway,
          contentType: "application/json",
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              username: { type: apigateway.JsonSchemaType.STRING },
              password: { type: apigateway.JsonSchemaType.STRING },
              email: { type: apigateway.JsonSchemaType.STRING },
            },
            required: ["username", "password", "email"],
          },
        }
      ),
    },
  });

  // route verify
  const userConfirmationSource = authResource.addResource("verify");
  const userConfirmationIntegration = new apigateway.LambdaIntegration(
    userConfirmationFunction
  );
  userConfirmationSource.addMethod("POST", userConfirmationIntegration, {
    requestValidator,
    requestModels: {
      "application/json": new apigateway.Model(
        scope,
        `NF-UserConfirmationRequestModel-${env}`,
        {
          restApi: apiGateway,
          contentType: "application/json",
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              username: { type: apigateway.JsonSchemaType.STRING },
              confirmationCode: { type: apigateway.JsonSchemaType.STRING },
            },
            required: ["username", "confirmationCode"],
          },
        }
      ),
    },
  });

  // route recommend source
  const recommendSourceResource =
    apiGateway.root.addResource("recommend-source");

  // method create recommend source
  const createRecommendSourceIntegration = new apigateway.LambdaIntegration(
    createRecommendSourceFunction
  );
  recommendSourceResource.addMethod("POST", createRecommendSourceIntegration);

  new apigateway.Stage(scope, `NF-Stage-${env}`, {
    deployment: apiGateway.latestDeployment!,
    stageName: env,
  });

  return { apiGateway };
};

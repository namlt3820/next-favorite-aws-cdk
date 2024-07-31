import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const apiGatewayConstruct = ({
  scope,
  env,
  oauthTokenFunction,
  loginFunction,
  signupFunction,
  userConfirmationFunction,
  createRecommendSourceFunction,
  checkAdminGroupFunction,
  traktSearchMovieFunction,
  createFavoriteItemFunction,
  cognitoAuthorizer,
  deleteFavoriteItemFunction,
  createIgnoreItemFunction,
  deleteIgnoreItemFunction,
  traktGetTrendMovieFunction,
}: {
  scope: Construct;
  env: string;
  oauthTokenFunction: lambda.Function;
  loginFunction: lambda.Function;
  signupFunction: lambda.Function;
  userConfirmationFunction: lambda.Function;
  createRecommendSourceFunction: lambda.Function;
  checkAdminGroupFunction: lambda.Function;
  traktSearchMovieFunction: lambda.Function;
  createFavoriteItemFunction: lambda.Function;
  cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer;
  deleteFavoriteItemFunction: lambda.Function;
  createIgnoreItemFunction: lambda.Function;
  deleteIgnoreItemFunction: lambda.Function;
  traktGetTrendMovieFunction: lambda.Function;
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
  const checkAdminGroupAuthorizer = new apigateway.RequestAuthorizer(
    scope,
    `NF-CheckAdminGroupAuthorizer-${env}`,
    {
      handler: checkAdminGroupFunction,
      identitySources: [apigateway.IdentitySource.header("Authorization")],
      resultsCacheTtl: cdk.Duration.minutes(10),
    }
  );
  const createRecommendSourceIntegration = new apigateway.LambdaIntegration(
    createRecommendSourceFunction
  );
  recommendSourceResource.addMethod("POST", createRecommendSourceIntegration, {
    authorizer: checkAdminGroupAuthorizer,
    authorizationType: apigateway.AuthorizationType.CUSTOM,
  });

  // route trakt
  const traktResource = apiGateway.root.addResource("trakt");

  // route trakt movie
  const traktMovieResource = traktResource.addResource("movie");

  // route trakt search movie
  const traktSearchMovieResource = traktMovieResource.addResource("search");
  const traktSearchMovieIntegration = new apigateway.LambdaIntegration(
    traktSearchMovieFunction
  );
  traktSearchMovieResource.addMethod("GET", traktSearchMovieIntegration);

  // route trakt get trend movie
  const traktGetTrendMovieResource = traktMovieResource.addResource("trend");
  const traktGetTrendMovieIntegration = new apigateway.LambdaIntegration(
    traktGetTrendMovieFunction
  );
  traktGetTrendMovieResource.addMethod("GET", traktGetTrendMovieIntegration);

  // route favorite
  const favoriteResource = apiGateway.root.addResource("favorite");

  // method create favorite item
  const createFavoriteItemIntegration = new apigateway.LambdaIntegration(
    createFavoriteItemFunction
  );
  favoriteResource.addMethod("POST", createFavoriteItemIntegration, {
    authorizer: cognitoAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
    authorizationScopes: ["aws.cognito.signin.user.admin"],
  });

  // method delete favorite item
  const deleteFavoriteItemIntegration = new apigateway.LambdaIntegration(
    deleteFavoriteItemFunction
  );
  favoriteResource.addMethod("DELETE", deleteFavoriteItemIntegration, {
    authorizer: cognitoAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
    authorizationScopes: ["aws.cognito.signin.user.admin"],
  });

  // route ignore
  const ignoreResource = apiGateway.root.addResource("ignore");

  // method create ignore item
  const createIgnoreItemIntegration = new apigateway.LambdaIntegration(
    createIgnoreItemFunction
  );
  ignoreResource.addMethod("POST", createIgnoreItemIntegration, {
    authorizer: cognitoAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
    authorizationScopes: ["aws.cognito.signin.user.admin"],
  });

  // method delete ignore item
  const deleteIgnoreItemIntegration = new apigateway.LambdaIntegration(
    deleteIgnoreItemFunction
  );
  ignoreResource.addMethod("DELETE", deleteIgnoreItemIntegration, {
    authorizer: cognitoAuthorizer,
    authorizationType: apigateway.AuthorizationType.COGNITO,
    authorizationScopes: ["aws.cognito.signin.user.admin"],
  });

  new apigateway.Stage(scope, `NF-Stage-${env}`, {
    deployment: apiGateway.latestDeployment!,
    stageName: env,
  });

  return { apiGateway };
};
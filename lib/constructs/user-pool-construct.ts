import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export const userPoolConstruct = ({
  scope,
  postConfirmationFunction,
  env,
  removalPolicy,
}: {
  scope: Construct;
  postConfirmationFunction: cdk.aws_lambda.Function;
  env: string;
  removalPolicy: cdk.RemovalPolicy;
}) => {
  const fromEmail = process.env.AWS_COGNITO_FROM_EMAIL!;
  const sesVerifiedDomain = process.env.AWS_COGNITO_SES_VERIFIED_DOMAIN!;
  const domainName = process.env.AWS_COGNITO_DOMAIN_NAME!;
  const callbackUrl = process.env.AWS_CALLBACK_URL!;
  const logoutUrl = process.env.AWS_LOGOUT_URL!;
  const certificateArn = process.env.AWS_CERTIFICATE_ARN!;
  const userPoolName = `NextFavoriteUserPool-${env}`;

  // Create a Cognito User Pool
  const userPool = new cognito.UserPool(scope, userPoolName, {
    selfSignUpEnabled: true,
    signInAliases: {
      email: true,
      username: true,
    },
    autoVerify: {
      email: true,
    },
    email: cognito.UserPoolEmail.withSES({
      fromEmail,
      fromName: "Next Favorite",
      sesVerifiedDomain,
      sesRegion: "ap-southeast-1",
    }),
    userVerification: {
      emailSubject: "Your Verification Code",
      emailBody: "Please use the following code to verify your email: {####}",
    },
    removalPolicy,
    passwordPolicy: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
    },
    standardAttributes: {
      email: {
        required: true,
        mutable: true,
      },
    },
    lambdaTriggers: {
      postConfirmation: postConfirmationFunction,
    },
  });

  // Add an App Client
  const appClient = userPool.addClient("NextFavorite", {
    userPoolClientName: "Next Favorite",
    authFlows: {
      userSrp: true,
    },
    generateSecret: false,
    oAuth: {
      flows: {
        authorizationCodeGrant: true, // Enables the Authorization Code Grant flow
      },
      scopes: [
        cognito.OAuthScope.OPENID,
        cognito.OAuthScope.EMAIL,
        cognito.OAuthScope.PROFILE,
      ],
      callbackUrls: [callbackUrl],
      logoutUrls: [logoutUrl],
    },
  });

  // Reference an existing ACM certificate by its ARN
  const certificate = acm.Certificate.fromCertificateArn(
    scope,
    "Certificate",
    certificateArn
  );

  // Add a domain for the hosted UI
  const domain = userPool.addDomain("NextFavoriteDomain", {
    customDomain: {
      domainName,
      certificate,
    },
  });

  // Outputs
  new cdk.CfnOutput(scope, "UserPoolId", { value: userPool.userPoolId });
  new cdk.CfnOutput(scope, "AppClientId", {
    value: appClient.userPoolClientId,
  });
  new cdk.CfnOutput(scope, "CognitoDomain", { value: domain.domainName });
};

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import {
  CfnUserPoolGroup,
  // CfnIdentityPool,
  // CfnIdentityPoolRoleAttachment,
} from "aws-cdk-lib/aws-cognito";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

export const userPoolConstruct = ({
  // adminRole,
  // userRole,
  scope,
  postConfirmationFunction,
  env,
  removalPolicy,
}: {
  scope: Construct;
  postConfirmationFunction: cdk.aws_lambda.Function;
  env: string;
  removalPolicy: cdk.RemovalPolicy;
  // adminRole: Role;
  // userRole: Role;
}) => {
  const fromEmail = process.env.AWS_COGNITO_FROM_EMAIL!;
  const sesVerifiedDomain = process.env.AWS_COGNITO_SES_VERIFIED_DOMAIN!;
  const domainName = process.env.AWS_COGNITO_DOMAIN_NAME!;
  const callbackUrl = process.env.AWS_CALLBACK_URL!;
  const logoutUrl = process.env.AWS_LOGOUT_URL!;
  const certificateArn = process.env.AWS_CERTIFICATE_ARN!;
  const region = process.env.REGION!;

  // Create a Cognito User Pool
  const userPool = new cognito.UserPool(scope, `NF-UserPool-${env}`, {
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
  const appClientId = `NF-AppClient-${env}`;
  const appClient = userPool.addClient(appClientId, {
    userPoolClientName: appClientId,
    authFlows: {
      userSrp: true,
      userPassword: true,
    },
    generateSecret: true,
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
    `NF-UserPoolCertificate-${env}`,
    certificateArn
  );

  // Add a domain for the hosted UI
  const domain = userPool.addDomain(`NF-UserPoolDomain-${env}`, {
    customDomain: {
      domainName,
      certificate,
    },
  });

  // Create user groups
  new CfnUserPoolGroup(scope, `NF-AdminGroup-${env}`, {
    userPoolId: userPool.userPoolId,
    groupName: "admin",
  });

  new CfnUserPoolGroup(scope, `NF-UserGroup-${env}`, {
    userPoolId: userPool.userPoolId,
    groupName: "user",
  });

  // Create IAM policy statement for AdminAddUserToGroup
  const cognitoPolicyStatement = new PolicyStatement({
    actions: ["cognito-idp:AdminAddUserToGroup"],
    resources: [
      `arn:aws:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/${userPool.userPoolId}`,
    ],
  });

  // Attach the policy to Lambda
  postConfirmationFunction.role!.attachInlinePolicy(
    new Policy(scope, `NF-PostConfirmation-Inline-Policy-${env}`, {
      statements: [cognitoPolicyStatement],
    })
  );

  // Outputs
  new cdk.CfnOutput(scope, `NF-UserPoolId-${env}`, {
    value: userPool.userPoolId,
  });
  new cdk.CfnOutput(scope, `NF-AppClientId-${env}`, {
    value: appClient.userPoolClientId,
  });
  new cdk.CfnOutput(scope, `NF-UserPoolDomainName-${env}`, {
    value: domain.domainName,
  });

  return {
    appClient,
    // identityPool,
    userPool,
  };

  /**
   * The request flow is Client => API Gateway => Lambda => DynamoDB.
   * DynamoDB only checks the Lambda's role, so role mapping from CfnIdentityPoolRoleAttachment, which maps roles to user groups, is ineffective.
   * Default authorizers only validate tokens and do not support custom logic.
   * Therefore, a custom Lambda authorizer is required. Role mapping is retained here for future use.
   */

  // Create Identity Pool
  // const identityPool = new CfnIdentityPool(scope, `NF-IdentityPool-${env}`, {
  //   allowUnauthenticatedIdentities: true,
  //   cognitoIdentityProviders: [
  //     {
  //       providerName: `cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${userPool.userPoolId}`,
  //       clientId: appClient.userPoolClientId,
  //     },
  //   ],
  // });

  // Attach Roles to Identity Pool
  // new CfnIdentityPoolRoleAttachment(scope, `NF-RoleAttachment-${env}`, {
  //   identityPoolId: identityPool.ref,
  //   roles: {
  //     authenticated: userRole.roleArn,
  //     unauthenticated: userRole.roleArn,
  //   },
  //   roleMappings: {
  //     "cognito-user-pool": {
  //       ambiguousRoleResolution: "AuthenticatedRole",
  //       identityProvider: `cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${userPool.userPoolId}:${appClient.userPoolClientId}`,
  //       type: "Rules",
  //       rulesConfiguration: {
  //         rules: [
  //           {
  //             claim: "cognito:groups",
  //             matchType: "Contains",
  //             value: "admin",
  //             roleArn: adminRole.roleArn,
  //           },
  //           {
  //             claim: "cognito:groups",
  //             matchType: "Contains",
  //             value: "user",
  //             roleArn: userRole.roleArn,
  //           },
  //         ],
  //       },
  //     },
  //   },
  // });
};

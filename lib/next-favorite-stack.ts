import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

// import * as cognito from "aws-cdk-lib/aws-cognito";

interface NextFavoriteProps extends cdk.StackProps {
  userPoolName: string;
  fromEmail: string;
  sesVerifiredDomain: string;
  domainName: string;
  callbackUrl: string;
  logoutUrl: string;
  certificateArn: string;
}

export class NextFavoriteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextFavoriteProps) {
    super(scope, id, props);

    // Define the Lambda function resource
    const myFunction = new lambda.Function(this, "HelloWorldFunction", {
      runtime: lambda.Runtime.NODEJS_20_X, // Provide any supported Node.js runtime
      handler: "index.handler",
      code: lambda.Code.fromInline(`
            exports.handler = async function(event) {
              return {
                statusCode: 200,
                body: JSON.stringify('Hello ${props.userPoolName}'),
              };
            };
          `),
    });

    // Define the Lambda function URL resource
    const myFunctionUrl = myFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, "myFunctionUrlOutput", {
      value: myFunctionUrl.url,
    });

    // Create a Cognito User Pool
    const userPool = new cognito.UserPool(this, props.userPoolName, {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      email: cognito.UserPoolEmail.withSES({
        fromEmail: props.fromEmail,
        fromName: "Next Favorite",
        sesVerifiedDomain: props.sesVerifiredDomain,
        sesRegion: "ap-southeast-1",
      }),
      userVerification: {
        emailSubject: "Your Verification Code",
        emailBody: "Please use the following code to verify your email: {####}",
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for development,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
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
        callbackUrls: [props.callbackUrl],
        logoutUrls: [props.logoutUrl],
      },
    });

    // Reference an existing ACM certificate by its ARN
    const certificateArn = props.certificateArn;

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn
    );

    // Optionally, add a domain for the hosted UI
    const domain = userPool.addDomain("NextFavoriteDomain", {
      customDomain: {
        domainName: props.domainName,
        certificate,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "AppClientId", {
      value: appClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "CognitoDomain", { value: domain.domainName });
  }
}

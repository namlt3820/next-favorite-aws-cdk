import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";

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

    const env = scope.node.tryGetContext("env");

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

    // Create Lambda Function
    const postConfirmation = new lambda.Function(this, "PostConfirmation", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambdas/post-confirmation/dist")
      ), // Path to your Lambda code
      environment: {
        TABLE_NAME: `NextFavorite-${env}-Users`, // Pass the table name as an environment variable
      },
    });

    // Create a Cognito User Pool
    const userPool = new cognito.UserPool(this, props.userPoolName, {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
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
      removalPolicy:
        env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,

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
        postConfirmation,
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

    // DynamoDB
    const usersTable = new dynamodb.Table(this, "Users", {
      tableName: `NextFavorite-${env}-Users`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    });
    new cdk.CfnOutput(this, "UsersTableArn", { value: usersTable.tableArn });

    // const recommendSourcesTable = new dynamodb.Table(this, "RecommendSources", {
    //   partitionKey: { name: "url", type: dynamodb.AttributeType.STRING },
    //   removalPolicy:
    //     env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    // });

    // const userFavoritesTable = new dynamodb.Table(this, "UserFavorites", {
    //   partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "movieId", type: dynamodb.AttributeType.STRING },
    //   removalPolicy:
    //     env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    // });

    // userFavoritesTable.addGlobalSecondaryIndex({
    //   indexName: "SourceUserIndex",
    //   partitionKey: { name: "sourceId", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    // });

    // const userExclusionsTable = new dynamodb.Table(this, "UserExclusions", {
    //   partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "movieId", type: dynamodb.AttributeType.STRING },
    //   removalPolicy:
    //     env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
    // });

    // userExclusionsTable.addGlobalSecondaryIndex({
    //   indexName: "SourceUserIndex",
    //   partitionKey: { name: "sourceId", type: dynamodb.AttributeType.STRING },
    //   sortKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    // });

    // Grant Lambda permissions to write to DynamoDB
    usersTable.grantWriteData(postConfirmation);
  }
}

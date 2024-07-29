import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { helloWorldConstruct } from "./constructs/hello-world-construct";
import { postConfirmationConstruct } from "./constructs/auth/post-confirmation-construct";
import { userPoolConstruct } from "./constructs/user-pool-construct";
import { dynamoTableConstruct } from "./constructs/dynamo-table-construct";
import { oauthTokenConstruct } from "./constructs/auth/oauth-token-construct";
import { apiGatewayConstruct } from "./constructs/api-gateway-construct";
import { secretsManagerConstruct } from "./constructs/secrets-manager-construct";
import { loginConstruct } from "./constructs/auth/login-construct";
import { signupConstruct } from "./constructs/auth/signup-construct";
import { userConfirmationConstruct } from "./constructs/auth/user-confirmation-construct";
import { iamConstruct } from "./constructs/iam-construct";
import { createRecommendSourceConstruct } from "./constructs/create-recommend-source-construct";
import { checkAdminGroupConstruct } from "./constructs/auth/check-admin-group-construct";
import { traktApiSearchConstruct } from "./constructs/trakt-api/search-construct";

interface NextFavoriteProps extends cdk.StackProps {}

export class NextFavoriteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextFavoriteProps) {
    super(scope, id, props);
    const env = scope.node.tryGetContext("env");
    const removalPolicy =
      env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

    // Hello World construct
    helloWorldConstruct({ scope: this, env });

    // DynamoDB Table construct
    const { userTable, recommendSourceTable } = dynamoTableConstruct({
      scope: this,
      env,
      removalPolicy,
    });

    // Post Confirmation construct
    const postConfirmationFunction = postConfirmationConstruct({
      scope: this,
      env,
      tableName: userTable.tableName,
    });
    userTable.grantWriteData(postConfirmationFunction);

    // User Pool construct
    const { appClient, userPool } = userPoolConstruct({
      scope: this,
      env,
      postConfirmationFunction,
      removalPolicy,
      // userRole,
      // adminRole,
    });

    // IAM construct
    const { checkAdminGroupRole } = iamConstruct({
      scope: this,
      env,
      userPoolId: userPool.userPoolId,
    });

    // Secrets Manager construct
    const { cognitoAppClientSecret } = secretsManagerConstruct({
      scope: this,
      env,
      appClientSecret: appClient.userPoolClientSecret,
    });

    // OAuth Token construct
    const { oauthTokenFunction } = oauthTokenConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(oauthTokenFunction);

    // Login construct
    const { loginFunction } = loginConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(loginFunction);

    // Signup construct
    const { signupFunction } = signupConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(signupFunction);

    // User Confirmation construct
    const { userConfirmationFunction } = userConfirmationConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(userConfirmationFunction);

    // Create Recommend Source construct
    const { createRecommendSourceFunction } = createRecommendSourceConstruct({
      scope: this,
      env,
      tableName: recommendSourceTable.tableName,
    });
    recommendSourceTable.grantWriteData(createRecommendSourceFunction);

    // Check Admin Group construct
    const { checkAdminGroupFunction } = checkAdminGroupConstruct({
      scope: this,
      env,
      userPoolId: userPool.userPoolId,
      role: checkAdminGroupRole,
    });

    // Trakt API Search construct
    const { traktApiSearchFunction } = traktApiSearchConstruct({
      scope: this,
      env,
    });

    // Assign read permission from secret to lambda function
    const traktApiSecretId = `NF-TraktApiKeySecret-${env}`;
    const traktApiKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      traktApiSecretId,
      traktApiSecretId
    );
    traktApiKeySecret.grantRead(traktApiSearchFunction);

    // API Gateway construct
    apiGatewayConstruct({
      scope: this,
      env,
      oauthTokenFunction,
      loginFunction,
      signupFunction,
      userConfirmationFunction,
      createRecommendSourceFunction,
      checkAdminGroupFunction,
      traktApiSearchFunction,
    });
  }
}

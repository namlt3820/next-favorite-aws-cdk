import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { helloWorldConstruct } from "./constructs/hello-world-construct";
import { postConfirmationConstruct } from "./constructs/post-confirmation-construct";
import { userPoolConstruct } from "./constructs/user-pool-construct";
import { dynamoTableConstruct } from "./constructs/dynamo-table-construct";
import { oauthTokenConstruct } from "./constructs/oauth-token-construct";
import { apiGatewayConstruct } from "./constructs/api-gateway-construct";
import { secretsManagerConstruct } from "./constructs/secrets-manager-construct";

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
    const { userTable } = dynamoTableConstruct({
      scope: this,
      removalPolicy,
      env,
    });

    // Post Confirmation construct
    const postConfirmationFunction = postConfirmationConstruct({
      scope: this,
      tableName: userTable.tableName,
      env,
    });
    userTable.grantWriteData(postConfirmationFunction);

    // User Pool construct
    const { appClient } = userPoolConstruct({
      scope: this,
      postConfirmationFunction,
      removalPolicy,
      env,
    });

    // Secrets Manager construct
    const { cognitoAppClientSecret } = secretsManagerConstruct({
      scope: this,
      appClientSecret: appClient.userPoolClientSecret,
      env,
    });

    // OAuth Token construct
    const { oauthTokenFunction } = oauthTokenConstruct({
      scope: this,
      clientId: appClient.userPoolClientId,
      env,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(oauthTokenFunction);

    // API Gateway construct
    apiGatewayConstruct({
      scope: this,
      oauthTokenFunction,
      env,
    });
  }
}

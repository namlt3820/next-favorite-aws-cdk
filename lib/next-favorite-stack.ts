import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { helloWorldConstruct } from "./constructs/hello-world-construct";
import { postConfirmationConstruct } from "./constructs/post-confirmation-construct";
import { userPoolConstruct } from "./constructs/user-pool-construct";
import { dynamoTableConstruct } from "./constructs/dynamo-table-construct";

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
      env,
      removalPolicy,
    });

    // Post Confirmation construct
    const postConfirmationFunction = postConfirmationConstruct({
      scope: this,
      tableName: userTable.tableName,
    });
    userTable.grantWriteData(postConfirmationFunction);

    // User Pool construct
    userPoolConstruct({
      scope: this,
      postConfirmationFunction,
      removalPolicy,
      env,
    });
  }
}

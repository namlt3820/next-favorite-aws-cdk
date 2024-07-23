import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const helloWorldConstruct = ({
  scope,
  env,
}: {
  scope: Construct;
  env: string;
}) => {
  const helloWorldFunction = new lambda.Function(scope, "HelloWorldFunction", {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: "index.handler",
    code: lambda.Code.fromInline(`
            exports.handler = async function(event) {
              return {
                statusCode: 200,
                body: JSON.stringify('Hello ${env}'),
              };
            };
          `),
  });

  const helloWorldFunctionUrl = helloWorldFunction.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.NONE,
  });

  new cdk.CfnOutput(scope, "HelloWorldFunctionUrl", {
    value: helloWorldFunctionUrl.url,
  });
};

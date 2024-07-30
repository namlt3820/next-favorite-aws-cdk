import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

export const checkAdminGroupConstruct = ({
  scope,
  userPoolId,
  env,
  role,
}: {
  scope: Construct;
  userPoolId: string;
  env: string;
  role: cdk.aws_iam.Role;
}) => {
  const region = process.env.AWS_REGION!;

  const checkAdminGroupFunction = new lambda.Function(
    scope,
    `NF-CheckAdminGroupFunction-${env}`,
    {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lambdas/auth/check-admin-group/dist"),
      environment: {
        REGION: region,
        USER_POOL_ID: userPoolId,
      },
      role,
    }
  );

  return { checkAdminGroupFunction };
};

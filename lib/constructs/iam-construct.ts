import {
  Role,
  ServicePrincipal,
  PolicyStatement,
  ManagedPolicy,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";

export const iamConstruct = ({
  scope,
  env,
  userPoolId,
}: {
  scope: Construct;
  env: string;
  userPoolId: string;
}) => {
  const checkAdminGroupRole = new Role(scope, `NF-CheckAdminGroupRole-${env}`, {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
  });

  checkAdminGroupRole.addToPolicy(
    new PolicyStatement({
      actions: ["cognito-idp:AdminListGroupsForUser"],
      resources: [
        `arn:aws:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/${userPoolId}`,
      ],
    })
  );

  checkAdminGroupRole.addManagedPolicy(
    ManagedPolicy.fromAwsManagedPolicyName(
      "service-role/AWSLambdaBasicExecutionRole"
    )
  );

  return {
    checkAdminGroupRole,
  };
};

import { Role, ServicePrincipal, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export const iamConstruct = ({
  scope,
  env,
  recommendTableArn,
}: {
  scope: Construct;
  env: string;
  recommendTableArn: string;
}) => {
  // admin role
  const adminRole = new Role(scope, `NF-AdminRole-${env}`, {
    assumedBy: new ServicePrincipal("cognito-idp.amazonaws.com"),
  });

  adminRole.addToPolicy(
    new PolicyStatement({
      actions: [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query",
      ],
      resources: [recommendTableArn],
    })
  );

  // user role
  const userRole = new Role(scope, `NF-UserRole-${env}`, {
    assumedBy: new ServicePrincipal("cognito-idp.amazonaws.com"),
  });

  userRole.addToPolicy(
    new PolicyStatement({
      actions: ["dynamodb:Scan", "dynamodb:Query"],
      resources: [recommendTableArn],
    })
  );

  return {
    adminRole,
    userRole,
  };
};

import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export const secretsManagerConstruct = ({
  scope,
  appClientSecret,
  env,
}: {
  scope: Construct;
  appClientSecret: cdk.SecretValue;
  env: string;
}) => {
  const cognitoAppClientSecretId = `NF-CognitoAppClientSecret-${env}`;
  const cognitoAppClientSecret = new secretsmanager.Secret(
    scope,
    cognitoAppClientSecretId,
    {
      secretName: cognitoAppClientSecretId,
      secretStringValue: appClientSecret,
    }
  );

  return {
    cognitoAppClientSecret,
  };
};

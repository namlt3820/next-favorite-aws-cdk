#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NextFavoriteStack } from "../lib/next-favorite-stack";
import * as dotenv from "dotenv";
import * as path from "path";

const app = new cdk.App();
const env = app.node.tryGetContext("env");
dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

new NextFavoriteStack(app, `NextFavoriteStack-${env}`, {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
  userPoolName: `NextFavoriteUserPool-${env}`,
  fromEmail: process.env.AWS_COGNITO_FROM_EMAIL!,
  sesVerifiredDomain: process.env.AWS_COGNITO_SES_VERIFIED_DOMAIN!,
  domainName: process.env.AWS_COGNITO_DOMAIN_NAME!,
  callbackUrl: process.env.AWS_CALLBACK_URL!,
  logoutUrl: process.env.AWS_LOGOUT_URL!,
  certificateArn: process.env.AWS_CERTIFICATE_ARN!,
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

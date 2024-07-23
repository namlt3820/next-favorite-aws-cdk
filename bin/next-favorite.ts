#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NextFavoriteStack } from "../lib/next-favorite-stack";
import * as dotenv from "dotenv";

const app = new cdk.App();
/**
 * This environment is set and retrieved from context. Its value can be either 'dev' or 'prod'.
 * This differs from the AWS CDK stack environment, which specifies the AWS account ID and region into which the stack is deployed.
 */
const env = app.node.tryGetContext("env");
dotenv.config({ path: `.env.${env}` });

new NextFavoriteStack(app, `NextFavoriteStack-${env}`, {
  env: { account: process.env.AWS_ACCOUNT_ID, region: process.env.AWS_REGION },
});

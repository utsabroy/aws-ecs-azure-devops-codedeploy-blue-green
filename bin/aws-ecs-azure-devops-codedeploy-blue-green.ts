#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsEcsAzureDevopsCodedeployBlueGreenStack } from '../lib/aws-ecs-azure-devops-codedeploy-blue-green-stack';

const app = new cdk.App();
new AwsEcsAzureDevopsCodedeployBlueGreenStack(app, 'AwsEcsAzureDevopsCodedeployBlueGreenStack', {});
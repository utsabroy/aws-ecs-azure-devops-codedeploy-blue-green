import { CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as EcsBlueGreen from '../lib';


export class AwsEcsAzureDevopsCodedeployBlueGreenStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

      const apiName = new CfnParameter(this, 'apiName', {
          type: 'String',
          default: 'nginx',
          description: 'Name of the api/service',
      });

      const containerPort = new CfnParameter(this, 'containerPort', {
        type: 'Number',
        default: '80',
        description: 'Port at which container starts, default : nginix default port',
      });

      const deploymentConfigName = new CfnParameter(this, 'deploymentConfigName', {
        type: 'String',
        default: 'CodeDeployDefault.ECSAllAtOnce',
        allowedValues: [
            'CodeDeployDefault.ECSLinear10PercentEvery1Minutes',
            'CodeDeployDefault.ECSLinear10PercentEvery3Minutes',
            'CodeDeployDefault.ECSCanary10Percent5Minutes',
            'CodeDeployDefault.ECSCanary10Percent15Minutes',
            'CodeDeployDefault.ECSAllAtOnce'
        ],
        description: 'Shifts x percentage of traffic every x minutes until all traffic is shifted',
      });

      const taskSetTerminationTimeInMinutes = new CfnParameter(this, 'taskSetTerminationTimeInMinutes', {
        type: 'Number',
        default: '0',
        description: 'TaskSet termination time in minutes',
      });

      new EcsBlueGreen.EcsBlueGreen(this, 'EcsBlueGreenPipeline', {
          vpcCidr: process.env.CIDR_RANGE || '10.27.0.0/16',
          apiName: apiName.valueAsString,
          containerPort: containerPort.valueAsNumber,
          deploymentConfigName: deploymentConfigName.valueAsString,
          appDir: process.env.APP_DIR || '../../', // Location of Dockerfile w.r.t to ecr.ts file
          taskSetTerminationTimeInMinutes: taskSetTerminationTimeInMinutes.valueAsNumber
      })
  }
}
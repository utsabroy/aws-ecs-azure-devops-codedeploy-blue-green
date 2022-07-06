import { Construct } from "constructs";
import codeDeploy = require('aws-cdk-lib/aws-codedeploy')
import { ManagedPolicy, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { TargetGroupAlarm } from "../ecs/alarms";
import iam = require('aws-cdk-lib/aws-iam');
import { EcsDeploymentConfig, IEcsDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";

export interface EcsBlueGreenCodeDeployProps {
    readonly deploymentGroupName: string;
    readonly deploymentConfigName: string;
    readonly terminationWaitTime: number;
    readonly blueTargetGroupName: string;
    readonly greenTargetGroupName: string;
    readonly targetGroupAlarms: TargetGroupAlarm[];
    readonly prodListenerArn: string;
    readonly testListenerArn: string;
    readonly ecsClusterName: string;
    readonly ecsServiceName: string;
}

export class EcsBlueGreenCodeDeploy extends Construct {

    public readonly ecsDeploymentGroup: IEcsDeploymentGroup;
    constructor(scope: Construct, id: string, props: EcsBlueGreenCodeDeployProps) {
        super(scope, id);

        // Creating the ecs application
        const ecsApplication = new codeDeploy.EcsApplication(this, 'ecsApplication');

        // Creating the code deploy service role
        const codeDeployServiceRole = new iam.Role(this, 'ecsCodeDeployServiceRole', {
            assumedBy: new ServicePrincipal('codedeploy.amazonaws.com')
        });
        codeDeployServiceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSCodeDeployRoleForECS'));
        
        const cfnDeploymentGroup = new codeDeploy.CfnDeploymentGroup(this, "EcsBlueGreenCodeDeploymentGroup", {
            applicationName: ecsApplication.applicationName,
            serviceRoleArn: codeDeployServiceRole.roleArn,
            alarmConfiguration: {
              alarms: props.targetGroupAlarms,
              enabled: true,
            },
            autoRollbackConfiguration: {
              enabled: true,
              events: ["DEPLOYMENT_FAILURE"],
            },
            blueGreenDeploymentConfiguration: {
              deploymentReadyOption: {
                actionOnTimeout: "CONTINUE_DEPLOYMENT",
                waitTimeInMinutes: 0,
              },
              terminateBlueInstancesOnDeploymentSuccess: {
                action: "TERMINATE",
                terminationWaitTimeInMinutes: props.terminationWaitTime,
              },
            },
            deploymentConfigName: EcsDeploymentConfig.fromEcsDeploymentConfigName(this, "ecsDeploymentConfig", props.deploymentConfigName!).deploymentConfigName,
            deploymentGroupName: props.deploymentGroupName,
            deploymentStyle: {
              deploymentOption: "WITH_TRAFFIC_CONTROL",
              deploymentType: "BLUE_GREEN",
            },

            ecsServices: [
              {
                clusterName: props.ecsClusterName,
                serviceName: props.ecsServiceName,
              },
            ],
            loadBalancerInfo: {
              targetGroupPairInfoList: [
                {
                  targetGroups: [
                    {
                      name: props.blueTargetGroupName,
                    },
                    {
                      name: props.greenTargetGroupName,
                    },
                  ],
                  prodTrafficRoute: {
                    listenerArns: [props.prodListenerArn],
                  },
                  testTrafficRoute: {
                    listenerArns: [props.testListenerArn],
                  },
                },
              ],
            },
          }
        );
    }
}
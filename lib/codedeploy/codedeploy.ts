import { Construct } from "constructs";
import codeDeploy = require('aws-cdk-lib/aws-codedeploy')
import { IRole, ManagedPolicy, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { TargetGroupAlarm } from "../ecs/alarms";
import iam = require('aws-cdk-lib/aws-iam');
import { EcsDeploymentConfig, IEcsApplication, IEcsDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";

export interface EcsBlueGreenCodeDeployProps {
    readonly deploymentConfigName: string;
    readonly terminationWaitTime: number;
    readonly blueTargetGroupName: string;
    readonly greenTargetGroupName: string;
    readonly targetGroupAlarms: TargetGroupAlarm[];
    readonly prodListenerArn: string;
    readonly testListenerArn: string;
    readonly ecsClusterName: string;
    readonly ecsServiceName: string;
    readonly artifactBucketArn: string;
}

export class EcsBlueGreenCodeDeploy extends Construct {

    public readonly ecsDeploymentGroupName: string;
    public readonly codeDeployServiceRole: IRole;
    public readonly ecsApplication: IEcsApplication;

    constructor(scope: Construct, id: string, props: EcsBlueGreenCodeDeployProps) {
        super(scope, id);

        // Creating the ecs application
        this.ecsApplication = new codeDeploy.EcsApplication(this, 'ecsApplication');

        // Creating the code deploy service role
        this.codeDeployServiceRole = new iam.Role(this, 'ecsCodeDeployServiceRole', {
            assumedBy: new ServicePrincipal('codedeploy.amazonaws.com')
        });
        this.codeDeployServiceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSCodeDeployRoleForECS'));

        const codeDeploymentConfig = EcsDeploymentConfig.fromEcsDeploymentConfigName(this, "ecsDeploymentConfig", props.deploymentConfigName)
        
        const cfnDeploymentGroup = new codeDeploy.CfnDeploymentGroup(this, "EcsBlueGreenCodeDeploymentGroup", {
            applicationName: this.ecsApplication.applicationName,
            serviceRoleArn: this.codeDeployServiceRole.roleArn,
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
            deploymentConfigName: codeDeploymentConfig.deploymentConfigName,
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
        this.ecsDeploymentGroupName = cfnDeploymentGroup.ref
        
    }
}
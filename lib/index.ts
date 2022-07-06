export * from './ecs/service'
export * from './ecs/alarms'
export * from './ecs/cluster'
export * from './common/roles'
export * from './ecs/ecr'

import {CfnOutput} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcsBlueGreenService } from './ecs/service';
import { EcsBlueGreenCluster } from './ecs/cluster';
import { EcsBlueGreenEcrRepo } from './ecs/ecr';
import { EcsBlueGreenRoles } from './common/roles';
import { EcsServiceAlarms } from './ecs/alarms';
import { EcsBlueGreenCodeDeploy } from './codedeploy/codedeploy';
import { EcsBlueGreenArtifactBucket } from './s3/artifact-bucket'

export interface EcsBlueGreenProps {
    readonly vpcCidr: string,    
    readonly containerPort: number,
    readonly apiName: string,
    readonly taskSetTerminationTimeInMinutes: number,
    readonly appDir: string,
    readonly deploymentConfigName: string,
}

export class EcsBlueGreen extends Construct {

    constructor(scope: Construct, id: string, props: EcsBlueGreenProps) {
        super(scope, id);

        // Build the VPC & Cluster
        const ecsBlueGreenCluster = new EcsBlueGreenCluster(this, 'EcsBlueGreenCluster', {
            cidr: props.vpcCidr
        });

        // create ECR image, build sample app rep and push to image to repo
        const ecrRepository = new EcsBlueGreenEcrRepo(this, 'EcrRepo', {
            apiName: props.apiName,
            appDir: props.appDir
        });

        
        // create ECS task roles
        const ecsTaskRole = new EcsBlueGreenRoles(this, 'EcsRoles');
        
        // create ECS service
        const ecsBlueGreenService = new EcsBlueGreenService(this, 'EcsBlueGreenService', {
            containerPort: props.containerPort,
            apiName: props.apiName,
            ecrRepository: ecrRepository.ecrRepo,
            ecsTaskRole: ecsTaskRole.ecsTaskRole,
            vpc: ecsBlueGreenCluster.vpc,
            cluster: ecsBlueGreenCluster.cluster
        });

        // create ECS Alarms
        const ecsServiceAlarms = new EcsServiceAlarms(this, 'EcsAlarms', {
            alb: ecsBlueGreenService.alb,
            blueTargetGroup: ecsBlueGreenService.blueTargetGroup,
            greenTargetGroup: ecsBlueGreenService.greenTargetGroup,
            apiName: props.apiName
        });

        // create CodeDeploy with Blue Green config
        const ecsBlueGreenDeploymentGroup = new EcsBlueGreenCodeDeploy(this, 'ecsApplication', {
            ecsClusterName: ecsBlueGreenCluster.cluster.clusterName,
            ecsServiceName: ecsBlueGreenService.ecsService.serviceName,
            prodListenerArn: ecsBlueGreenService.albProdListener.listenerArn,
            testListenerArn: ecsBlueGreenService.albTestListener.listenerArn,
            blueTargetGroupName: ecsBlueGreenService.blueTargetGroup.targetGroupName,
            greenTargetGroupName: ecsBlueGreenService.greenTargetGroup.targetGroupName,
            terminationWaitTime: props.taskSetTerminationTimeInMinutes,
            deploymentConfigName: props.deploymentConfigName,
            deploymentGroupName: props.apiName,
            targetGroupAlarms: ecsServiceAlarms.targetGroupAlarms
        });

        // create artifact bucket
        const azureArtifactBucket = new EcsBlueGreenArtifactBucket(this, 'AzureArtfiactBucker');


        // Export the outputs
        new CfnOutput(this, 'ecsBlueGreenLBDns', {
            description: 'Load balancer DNS',
            exportName: 'ecsBlueGreenLBDns',
            value: ecsBlueGreenService.alb.loadBalancerDnsName
        });

        new CfnOutput(this, 'ecrRepoName', {
            description: 'ECR repository name',
            exportName: 'ecrRepoName',
            value: ecrRepository.ecrRepo.repositoryName
        });

    }

}
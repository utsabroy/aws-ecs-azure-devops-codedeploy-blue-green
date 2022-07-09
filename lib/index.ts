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
import { AzureDevopsUser } from './common/azure-devops-user'

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

        // create artifact bucket
        const azureArtifactBucket = new EcsBlueGreenArtifactBucket(this, 'azureArtfiactBucker');

        // create CodeDeploy with Blue Green config
        const ecsBlueGreenDeployment = new EcsBlueGreenCodeDeploy(this, 'ecsApplication', {
            ecsClusterName: ecsBlueGreenCluster.cluster.clusterName,
            ecsServiceName: ecsBlueGreenService.ecsService.serviceName,
            prodListenerArn: ecsBlueGreenService.albProdListener.listenerArn,
            testListenerArn: ecsBlueGreenService.albTestListener.listenerArn,
            blueTargetGroupName: ecsBlueGreenService.blueTargetGroup.targetGroupName,
            greenTargetGroupName: ecsBlueGreenService.greenTargetGroup.targetGroupName,
            terminationWaitTime: props.taskSetTerminationTimeInMinutes,
            deploymentConfigName: props.deploymentConfigName,
            targetGroupAlarms: ecsServiceAlarms.targetGroupAlarms,
            artifactBucketArn: azureArtifactBucket.artifactsBucket.bucketArn
        });

        // crreate Azure Devops User
        const azureDevUser = new AzureDevopsUser(this, 'azureDevopsUser', {
            artifactBucket: azureArtifactBucket.artifactsBucket,
            ecsTaskRoleArn: ecsTaskRole.ecsTaskRole,
            ecrRepo: ecrRepository.ecrRepo
        });

        // Export the outputs
        new CfnOutput(this, 'apiName', {
            description: 'Name of the blue green service',
            exportName: 'apiName',
            value: props.apiName
        });

        new CfnOutput(this, 'ecsBlueGreenLBDns', {
            description: 'Load balancer DNS',
            exportName: 'loadBalancerDns',
            value: ecsBlueGreenService.alb.loadBalancerDnsName
        });

        new CfnOutput(this, 'ecrRepoName', {
            description: 'ECR repository name',
            exportName: 'ecsRepositoryName',
            value: ecrRepository.ecrRepo.repositoryName
        });

        new CfnOutput(this, 'ecrTaskRoleArn', {
            description: 'ECR Task Role Arn',
            exportName: 'ecsTaskRoleArn',
            value: ecsTaskRole.ecsTaskRole.roleArn
        });

        new CfnOutput(this, 'ecrRepoUri', {
            description: 'ECR repository uri',
            exportName: 'ecsRepositoryUri',
            value: ecrRepository.ecrRepo.repositoryUri
        });

        new CfnOutput(this, 'codeDeployApplicationName', {
            description: 'CodeDeploy ECS CodeDeploy Application Name',
            exportName: 'codeDeployApplicationName',
            value: ecsBlueGreenDeployment.ecsApplication.applicationName
        });

        new CfnOutput(this, 'codeDeployGroupName', {
            description: 'CodeDeploy ECS CodeDeploy Application Name',
            exportName: 'codeDeployGroupName',
            value: ecsBlueGreenDeployment.ecsDeploymentGroupName
        });

        new CfnOutput(this, 'artifactBucketName', {
            description: 'S3 Bucket where Azure Devops will push artifacts',
            exportName: 'artifactBucketName',
            value: azureArtifactBucket.artifactsBucket.bucketName
        });

        new CfnOutput(this, 'azureDevOpsUser', {
            description: 'Azure Devops User whose credentials will be used to deploy the application',
            exportName: 'azureDevopsUser',
            value: azureDevUser.azureDevopsUser.userArn
        });

    }

}
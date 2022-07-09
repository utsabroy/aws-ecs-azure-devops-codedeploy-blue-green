import { IEcsApplication } from "aws-cdk-lib/aws-codedeploy";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import { IRole, User } from "aws-cdk-lib/aws-iam";
import iam = require("aws-cdk-lib/aws-iam");
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface AzureDevopsPolicyProps {
  readonly artifactBucket: IBucket;
  readonly ecrRepo: IRepository;
  readonly codeDeployRole: IRole;
}

export class AzureDevopsUser extends Construct {
  public readonly azureDevopsUser: User;

  constructor(scope: Construct, id: string, props: AzureDevopsPolicyProps) {
    super(scope, id);

    const codeDeployPolicy = new iam.PolicyStatement({
      sid: "CodeDeploy",
      effect: iam.Effect.ALLOW,
      actions: [
        "codedeploy:CreateDeployment",
        "codedeploy:StopDeployment",
        "codedeploy:ContinueDeployment",
        "codedeploy:GetDeploymentConfig",
        "codedeploy:RegisterApplicationRevision",
      ],
      resources: ['*'],
    });

    const ecrPushPolicy = new iam.PolicyStatement({
      sid: "EcrPush",
      effect: iam.Effect.ALLOW,
      actions: [
          'ecr:UploadLayerPart',
          'ecr:BatchDeleteImage',
          'ecr:ListImages',
          'ecr:CompleteLayerUpload',
          'ecr:DescribeRepositories',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:PutImage',
          'ecr:BatchGetImage',
          'ecr:InitiateLayerUpload',
          'ecr:CreateRepository',
          'ecr:DescribeRegistry'
      ],
      resources: [props.ecrRepo.repositoryArn],
    });

    const ecrAuthPolicy = new iam.PolicyStatement({
      sid: "EcrAuth",
      effect: iam.Effect.ALLOW,
      actions: [
          'ecr:GetAuthorizationToken'
      ],
      resources: ['*'],
    });

    const s3PushPilcy = new iam.PolicyStatement({
      sid: "S3Push",
      effect: iam.Effect.ALLOW,
      actions: [
          's3:PutObject',
          's3:GetObject',
          's3:AbortMultipartUpload',
          's3:ListBucket',
          's3:GetObjectVersion'
      ],
      resources: [
          props.artifactBucket.bucketArn,
          props.artifactBucket.bucketArn.concat('/*')
      ],
    });

    const taskDefPolicy = new iam.PolicyStatement({
      sid: "EcsTaskDef",
      effect: iam.Effect.ALLOW,
      actions: [
          'ecs:RegisterTaskDefinition'
      ],
      resources: [
          '*'
      ],
    });

    const passRolePolicy = new iam.PolicyStatement({
      sid: "PassRole",
      effect: iam.Effect.ALLOW,
      actions: [
          'iam:PassRole'
      ],
      resources: [
          props.codeDeployRole.roleArn
      ],
    });

    this.azureDevopsUser = new iam.User(this, "AzureDevOpsUser");
    this.azureDevopsUser.addToPolicy(codeDeployPolicy);
    this.azureDevopsUser.addToPolicy(ecrPushPolicy);
    this.azureDevopsUser.addToPolicy(ecrAuthPolicy);
    this.azureDevopsUser.addToPolicy(s3PushPilcy);
    this.azureDevopsUser.addToPolicy(taskDefPolicy);
    this.azureDevopsUser.addToPolicy(passRolePolicy);
  }
}

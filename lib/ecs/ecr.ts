import { Construct } from "constructs";
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrdeploy from 'cdk-ecr-deployment'
import ecr = require('aws-cdk-lib/aws-ecr');
import path = require('path')
import { IRepository } from "aws-cdk-lib/aws-ecr";

export interface EcsBlueGreenEcrRepoProps {
    apiName: string;
    appDir: string;
}

export class EcsBlueGreenEcrRepo extends Construct {

    public readonly ecrRepo: IRepository;

    constructor(scope: Construct, id: string, props: EcsBlueGreenEcrRepoProps) {
        super(scope, id);

        this.ecrRepo =  new ecr.Repository(this, 'ecrRepo', {
            repositoryName: props.apiName,
            imageScanOnPush: true
        });

        const ecrImage = new DockerImageAsset(this,'dockerAsssets',{
            directory: path.join(__dirname, props.appDir),
        });

        new ecrdeploy.ECRDeployment(this, 'deployDockerImage', {
            src: new ecrdeploy.DockerImageName(ecrImage.imageUri),
            dest: new ecrdeploy.DockerImageName(`${this.ecrRepo.repositoryUri}:latest`),
        });
    }
}
import { Construct } from "constructs"
import s3 = require('aws-cdk-lib/aws-s3') 
import iam = require('aws-cdk-lib/aws-iam')
import { BlockPublicAccess, BucketEncryption, IBucket } from "aws-cdk-lib/aws-s3";
import { AnyPrincipal, Effect } from "aws-cdk-lib/aws-iam";

export class EcsBlueGreenArtifactBucket extends Construct {

    readonly artifactsBucket: IBucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // S3 bucket for storing the code pipeline artifacts
        this.artifactsBucket = new s3.Bucket(this, 'artifactBucket', {
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
        });

        // S3 bucket policy for the code pipeline artifacts
        const denyInsecureConnections = new iam.PolicyStatement({
            effect: Effect.DENY,
            actions: ['s3:*'],
            principals: [new AnyPrincipal()],
            resources: [this.artifactsBucket.bucketArn.concat('/*')],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        });

        //this.artifactsBucket.addToResourcePolicy(denyUnEncryptedObjectUploads);
        this.artifactsBucket.addToResourcePolicy(denyInsecureConnections);
    }

} 
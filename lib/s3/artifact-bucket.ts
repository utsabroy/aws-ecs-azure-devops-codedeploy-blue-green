import { Construct } from "constructs"
import s3 = require('aws-cdk-lib/aws-s3') 
import iam = require('aws-cdk-lib/aws-iam')
import { BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { AnyPrincipal, Effect } from "aws-cdk-lib/aws-iam";

export class EcsBlueGreenArtifactBucket extends Construct {

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // S3 bucket for storing the code pipeline artifacts
        const artifactsBucket = new s3.Bucket(this, 'artifactsBucket', {
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
        });

        // S3 bucket policy for the code pipeline artifacts
        const denyUnEncryptedObjectUploads = new iam.PolicyStatement({
            effect: Effect.DENY,
            actions: ['s3:PutObject'],
            principals: [new AnyPrincipal()],
            resources: [artifactsBucket.bucketArn.concat('/*')],
            conditions: {
                StringNotEquals: {
                    's3:x-amz-server-side-encryption': 'aws:kms'
                }
            }
        });

        const denyInsecureConnections = new iam.PolicyStatement({
            effect: Effect.DENY,
            actions: ['s3:*'],
            principals: [new AnyPrincipal()],
            resources: [artifactsBucket.bucketArn.concat('/*')],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        });

        artifactsBucket.addToResourcePolicy(denyUnEncryptedObjectUploads);
        artifactsBucket.addToResourcePolicy(denyInsecureConnections);
    }

} 
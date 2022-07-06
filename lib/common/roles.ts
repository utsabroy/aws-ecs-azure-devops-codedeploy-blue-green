import {Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import iam = require('aws-cdk-lib/aws-iam');
import { Construct } from 'constructs';

export class EcsBlueGreenRoles extends Construct {

    public readonly ecsTaskRole: Role;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.ecsTaskRole = new iam.Role(this, 'ecsTaskRole', {
            assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
        });
        this.ecsTaskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));
    }
}

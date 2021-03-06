export APP_DIR='../../' # Location of Dockerfile w.r.t to ecr.ts file
export CIDR_RANGE=10.27.0.0/16

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_DEFAULT_REGION=$(aws configure get region)

npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_DEFAULT_REGION

npx cdk --app "npx ts-node bin/aws-ecs-azure-devops-codedeploy-blue-green" deploy --require-approval never
export ALB_DNS=$(aws cloudformation describe-stacks --stack-name AwsEcsAzureDevopsCodedeployBlueGreenStack --query 'Stacks[*].Outputs[?ExportName==`loadBalancerDns`].OutputValue' --output text)

echo -e "${GREEN}Completed building the CodePipeline resources...."

echo -e "${GREEN}Let's curl the below URL for API...."

echo "http://$ALB_DNS"
curl http://$ALB_DNS
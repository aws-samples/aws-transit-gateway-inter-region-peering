#!/usr/bin/env bash

GREEN="\033[1;32m"
YELLOW="\033[1;33m"

echo -e "${GREEN}Start cleanup..."
##########################################################################################
# Delete the TGW peering
##########################################################################################
echo -e "${GREEN}Deleting the peering attachment..."
export AWS_DEFAULT_REGION=us-east-1
export TGW_ID=$(aws cloudformation describe-stacks --stack-name NetworkSegmentationDemo --query 'Stacks[*].Outputs[?ExportName==`TransitGatewayId`].OutputValue' --output text)
export PEER_ATTACHMENT_ID=$(aws ec2 describe-transit-gateway-attachments --filters Name=resource-type,Values=peering Name=transit-gateway-id,Values=$TGW_ID Name=state,Values=available --query 'TransitGatewayAttachments[*].TransitGatewayAttachmentId' --output text)
aws ec2 delete-transit-gateway-peering-attachment \
    --transit-gateway-attachment-id $PEER_ATTACHMENT_ID \
    --region $AWS_DEFAULT_REGION

PEER_STATE=$(aws ec2 describe-transit-gateway-peering-attachments --filters Name=transit-gateway-id,Values=$TGW_ID Name=state,Values=deleting,deleted --query 'TransitGatewayPeeringAttachments[*].State' --output text | xargs)

# Wait till the attachment status is deleted - 10 seconds delay before each check
while [ $PEER_STATE != "deleted" ];
do
   sleep 10
   PEER_STATE=$(aws ec2 describe-transit-gateway-peering-attachments --filters Name=transit-gateway-id,Values=$TGW_ID Name=state,Values=deleting,deleted --query 'TransitGatewayPeeringAttachments[*].State' --output text | xargs)
   echo -e "${YELLOW}Awaiting deleted status....Current status: ${PEER_STATE}"
done

echo -e "${GREEN}Peering attachment deleted..."
##########################################################################################
# Delete the CDK stacks
##########################################################################################

echo -e "${GREEN}Deleting CDK stacks..."

aws cloudformation delete-stack --stack-name NetworkSegmentationGlobalManager --region $AWS_DEFAULT_REGION
aws cloudformation delete-stack --stack-name NetworkSegmentationRouting --region $AWS_DEFAULT_REGION
aws cloudformation delete-stack --stack-name NetworkSegmentationDemo --region $AWS_DEFAULT_REGION

export AWS_DEFAULT_REGION=eu-west-1
aws cloudformation delete-stack --stack-name NetworkSegmentationRouting --region $AWS_DEFAULT_REGION
aws cloudformation delete-stack --stack-name NetworkSegmentationDemo --region $AWS_DEFAULT_REGION

echo -e "${GREEN}Cleanup completed..."


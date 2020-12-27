// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Core networking resources
import * as cdk from "@aws-cdk/core";
import {Construct, StackProps} from "@aws-cdk/core";
import {Gateway, SimulatedOnPrem, VpcWithEc2} from "../../../lib";
import * as networkDemo from "../../../lib/index";
import {IRole} from "@aws-cdk/aws-iam";
import iam = require('@aws-cdk/aws-iam');

const cfnParams = require("../../data/params.json")

export class CreateBaseNetworkStack extends cdk.Stack {

    public readonly simulatedOnPrem: SimulatedOnPrem;
    public readonly gateway: Gateway;
    public readonly developmentVpc: VpcWithEc2;
    public readonly productionVpc: VpcWithEc2;
    public readonly ec2Role: IRole;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // EC2 role allowing SSM session manager
        this.ec2Role = new iam.Role(this, "svcRoleForEC2viaSSM", {
            assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
            description: "Service role for EC2 access via SSM session manager",
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMPatchAssociation")
            ],
        });

        this.simulatedOnPrem = new networkDemo.SimulatedOnPrem(this, "SimulatedOnPrem", {
            prefix: "OnPrem",
            cidr: cfnParams[props!.env!.region!].OnPremCidr,
            cidrMask: cfnParams[props!.env!.region!].CidrMask
        });

        this.gateway = new networkDemo.Gateway(this, "Gateway", {
            prefix: "NetworkingDemo",
            amazonSideAsn: cfnParams[props!.env!.region!].AmazonSideAsn,
            customerSideAsn: cfnParams[props!.env!.region!].CustomerSideAsn,
            onPremIpAddress: this.simulatedOnPrem.eip.ref
        });
        this.gateway.node.addDependency(this.simulatedOnPrem);

        this.developmentVpc = new networkDemo.VpcWithEc2(this, "Development", {
            prefix: "Development",
            transitGateway: this.gateway.cfnTransitGateway,
            cidr: cfnParams[props!.env!.region!].DevelopmentCidr,
            cidrMask: cfnParams[props!.env!.region!].CidrMask,
            ec2Role: this.ec2Role
        });
        this.developmentVpc.node.addDependency(this.gateway);

        const developmentSubnetRouting = new networkDemo.SubnetRouting(this, "DevelopmentRouting", {
            prefix: "Development",
            vpc: this.developmentVpc.vpc,
            transitGateway: this.gateway.cfnTransitGateway
        });
        developmentSubnetRouting.node.addDependency(this.developmentVpc);

        this.productionVpc = new networkDemo.VpcWithEc2(this, "Production", {
            prefix: "Production",
            transitGateway: this.gateway.cfnTransitGateway,
            cidr: cfnParams[props!.env!.region!].ProductionCidr,
            cidrMask: cfnParams[props!.env!.region!].CidrMask,
            ec2Role: this.ec2Role
        });
        this.productionVpc.node.addDependency(this.gateway);

        const productionSubnetRouting = new networkDemo.SubnetRouting(this, "ProductionRouting", {
            prefix: "Production",
            vpc: this.productionVpc.vpc,
            transitGateway: this.gateway.cfnTransitGateway
        });
        productionSubnetRouting.node.addDependency(this.productionVpc);

    }
}

const app = new cdk.App();

// ========================================================================================
// Create base stacks
// ========================================================================================
new CreateBaseNetworkStack(app, 'TransitGatewayPeeringDemo', {
    env: {
        region: process.env.AWS_DEFAULT_REGION
    },
    description: "Builds the base resources for the Transit Gateway Peering Demo"
});

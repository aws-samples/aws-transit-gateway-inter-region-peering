// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Global network stack
import * as cdk from "@aws-cdk/core";
import {Construct, StackProps} from "@aws-cdk/core";
import * as networkManager from "@aws-cdk/aws-networkmanager";

export class GlobalNetworkStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const cfnGlobalNetwork = new networkManager.CfnGlobalNetwork(this, "GlobalNetwork", {
            description: "Global network for the Transit Gateway powered inter-region peering"
        });

        new networkManager.CfnTransitGatewayRegistration(this, "RegisterTGW1", {
            globalNetworkId: cfnGlobalNetwork.ref,
            transitGatewayArn: process.env.US_TGW_ARN!
        });
        new networkManager.CfnTransitGatewayRegistration(this, "RegisterTGW2", {
            globalNetworkId: cfnGlobalNetwork.ref,
            transitGatewayArn: process.env.EU_TGW_ARN!
        });
    }
}

const app = new cdk.App();

new GlobalNetworkStack(app, 'TransitGatewayPeeringGlobalManager',
    {
        env: {
            region: process.env.AWS_DEFAULT_REGION
        },
        description: "Builds the global network for the Transit Gateway Peering Demo"
    },);

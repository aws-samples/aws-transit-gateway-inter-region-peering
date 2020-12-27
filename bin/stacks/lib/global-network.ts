// Global network stack
import * as cdk from "@aws-cdk/core";
import {Construct, StackProps} from "@aws-cdk/core";
import * as networkManager from "@aws-cdk/aws-networkmanager";

export class GlobalNetworkStack extends cdk.Stack {

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const cfnGlobalNetwork = new networkManager.CfnGlobalNetwork(this, "GlobalNetwork", {
            description: "Global network for the Transit Gateway powered network segmentation"
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

new GlobalNetworkStack(app, 'NetworkSegmentationGlobalManager',
    {
        env: {
            region: process.env.AWS_DEFAULT_REGION
        },
        description: "Builds the global network for the Network Segmentation Demo"
    },);

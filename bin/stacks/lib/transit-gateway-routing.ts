// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {App, Stack, StackProps} from 'aws-cdk-lib';
import * as networkDemo from '../../../lib/index';
import {Construct} from 'constructs';

const cfnParams = require('../../data/params.json')

export class TransitGatewayRoutingStack extends Stack {

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new networkDemo.TransitGatewayRouting(this, 'TransitGatewayRouting', {
            transitGatewayId: process.env.TGW_ID,
            developmentVpcInfo: {
                vpcAttachmentId: process.env.DEVELOPMENT_VPC_ATTACHMENT_ID,
                vpcRouteTableId: process.env.DEVELOPMENT_VPC_ROUTE_TABLE_ID,
                staticRoutes: {
                    attachmentId: process.env.PEER_ATTACHMENT_ID,
                    destination: cfnParams[props!.env!.region!].PeerDevelopmentCidr
                }
            },
            productionVpcInfo: {
                vpcAttachmentId: process.env.PRODUCTION_VPC_ATTACHMENT_ID,
                vpcRouteTableId: process.env.PRODUCTION_VPC_ROUTE_TABLE_ID,
                staticRoutes: {
                    attachmentId: process.env.PEER_ATTACHMENT_ID,
                    destination: cfnParams[props!.env!.region!].PeerProductionCidr
                }
            },
            peeringInfo: {
                peeringAttachmentId: process.env.PEER_ATTACHMENT_ID
            },
            vpnInfo: {
                vpnAttachmentId: process.env.VPN_ATTACHMENT_ID
            }
        });
    }
}


const app = new App();

new TransitGatewayRoutingStack(app, 'TransitGatewayPeeringRouting', {
    env: {
        region: process.env.AWS_DEFAULT_REGION
    },
    description: 'Builds the transit gateway routing for the Network Segmentation Demo'
});


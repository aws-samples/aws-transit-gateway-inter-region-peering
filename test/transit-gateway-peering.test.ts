// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as networkDemo from '../lib';
import {App, Stack} from 'aws-cdk-lib';


const params = require('../bin/data/params.json')

test('TGW Inter-Region Peering and Site-to-Site VPN is created', () => {
    const app = new App();
    const stack = new Stack(app, 'TransitGatewayPeeringDemoStack', {
        env: {
            region: 'us-east-1'
        }
    });

    const simulatedOnPrem = new networkDemo.SimulatedOnPrem(stack, 'SimulatedOnPrem', {
        prefix: 'OnPrem',
        cidr: params['us-east-1'].OnPremCidr,
        cidrMask: params['us-east-1'].CidrMask
    });

    const gateway = new networkDemo.Gateway(stack, 'Gateway', {
        prefix: 'NetworkingDemo',
        amazonSideAsn: params['us-east-1'].AmazonSideAsn,
        customerSideAsn: params['us-east-1'].CustomerSideAsn,
        onPremIpAddress: simulatedOnPrem.eip.ref
    });
    gateway.node.addDependency(simulatedOnPrem);

    const developmentVpc = new networkDemo.VpcWithEc2(stack, 'Development', {
        prefix: 'Development',
        transitGateway: gateway.cfnTransitGateway,
        cidr: params['us-east-1'].DevelopmentCidr,
        cidrMask: params['us-east-1'].CidrMask
    });
    developmentVpc.node.addDependency(gateway);

    const developmentSubnetRouting = new networkDemo.SubnetRouting(stack, 'DevelopmentRouting', {
        prefix: 'Development',
        vpc: developmentVpc.vpc,
        transitGateway: gateway.cfnTransitGateway
    });
    developmentSubnetRouting.node.addDependency(developmentVpc);

    const productionVpc = new networkDemo.VpcWithEc2(stack, 'Production', {
        prefix: 'Production',
        transitGateway: gateway.cfnTransitGateway,
        cidr: params['us-east-1'].ProductionCidr,
        cidrMask: params['us-east-1'].CidrMask
    });
    productionVpc.node.addDependency(gateway);

    const productionSubnetRouting = new networkDemo.SubnetRouting(stack, 'ProductionRouting', {
        prefix: 'Production',
        vpc: productionVpc.vpc,
        transitGateway: gateway.cfnTransitGateway
    });
    productionSubnetRouting.node.addDependency(productionVpc);

    const transitGatewayRouting = new networkDemo.TransitGatewayRouting(stack, 'TransitGatewayRouting', {
        transitGatewayId: 'tgw-001',
        developmentVpcInfo: {
            vpcAttachmentId: 'dev-vpc-001',
            vpcRouteTableId: 'dev-rtb-001',
            staticRoutes: {
                attachmentId: 'peer-001',
                destination: params['us-east-1'].PeerDevelopmentCidr
            }
        },
        productionVpcInfo: {
            vpcAttachmentId: 'prod-vpc-001',
            vpcRouteTableId: 'prod-rtb-001',
            staticRoutes: {
                attachmentId: 'peer-001',
                destination: params['us-east-1'].PeerProductionCidr
            }
        },
        peeringInfo: {
            peeringAttachmentId: 'peer-001'
        },
        vpnInfo: {
            vpnAttachmentId: 'vpn-001'
        }
    });
    transitGatewayRouting.node.addDependency(developmentSubnetRouting, productionSubnetRouting);
});

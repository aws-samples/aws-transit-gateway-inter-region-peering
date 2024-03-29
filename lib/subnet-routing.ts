// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {CfnRoute, CfnTransitGateway, IVpc} from 'aws-cdk-lib/aws-ec2';
import {Construct} from 'constructs';

const {v4: uuidV4} = require('uuid');

export interface SubnetRoutingProps {
    readonly prefix?: string;
    readonly vpc?: IVpc;
    readonly transitGateway?: CfnTransitGateway;
}

export class SubnetRouting extends Construct {

    constructor(scope: Construct, id: string, props: SubnetRoutingProps = {}) {
        super(scope, id);

        // Add the routing for the VPC subnets
        props.vpc!.isolatedSubnets.forEach(subnet => new CfnRoute(this, props.prefix!.concat(uuidV4()).concat('-tgw-route').toString(), {
            destinationCidrBlock: '0.0.0.0/0',
            routeTableId: subnet.routeTable.routeTableId,
            transitGatewayId: props.transitGateway!.ref
        }));
    }
}

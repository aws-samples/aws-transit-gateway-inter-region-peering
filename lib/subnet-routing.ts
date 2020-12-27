import * as cdk from "@aws-cdk/core";
import {CfnTransitGateway, IVpc} from "@aws-cdk/aws-ec2";
import ec2 = require('@aws-cdk/aws-ec2');

const {v4: uuidV4} = require('uuid');

export interface SubnetRoutingProps {
    readonly prefix?: string;
    readonly vpc?: IVpc;
    readonly transitGateway?: CfnTransitGateway;
}

export class SubnetRouting extends cdk.Construct {

    constructor(scope: cdk.Construct, id: string, props: SubnetRoutingProps = {}) {
        super(scope, id);

        // Add the routing for the VPC subnets
        props.vpc!.isolatedSubnets.forEach(subnet => new ec2.CfnRoute(this, props.prefix!.concat(uuidV4()).concat("-tgw-route").toString(), {
            destinationCidrBlock: "0.0.0.0/0",
            routeTableId: subnet.routeTable.routeTableId,
            transitGatewayId: props.transitGateway!.ref
        }));
    }
}

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {CfnOutput} from 'aws-cdk-lib';
import {CfnCustomerGateway, CfnTransitGateway, CfnVPNConnection} from 'aws-cdk-lib/aws-ec2';
import {Construct} from 'constructs';

export interface GatewayProps {
    readonly prefix?: string;
    readonly amazonSideAsn?: number;
    readonly onPremIpAddress?: string;
    readonly customerSideAsn?: number;
}

export class Gateway extends Construct {

    public readonly cfnTransitGateway: CfnTransitGateway;
    public readonly cfnCustomerGateway: CfnCustomerGateway;
    public readonly cfnVPNConnection: CfnVPNConnection;

    constructor(scope: Construct, id: string, props: GatewayProps = {}) {

        super(scope, id);

        // Create the TransitGateway
        this.cfnTransitGateway = new CfnTransitGateway(this, props.prefix!.concat('-TGW').toString(), {
            amazonSideAsn: props.amazonSideAsn,
            description: 'Transit Gateway for hybrid networking',
            autoAcceptSharedAttachments: 'enable',
            defaultRouteTableAssociation: 'disable',
            defaultRouteTablePropagation: 'disable',
            dnsSupport: 'enable',
            vpnEcmpSupport: 'enable',
            multicastSupport: 'enable',
            tags: [
                {
                    key: 'Name',
                    value: props.prefix!.concat('-TGW').toString()
                }
            ]
        });


        // Create the CustomerGateway
        this.cfnCustomerGateway = new CfnCustomerGateway(this, props.prefix!.concat('-CGW').toString(), {
            bgpAsn: props.customerSideAsn!,
            ipAddress: props.onPremIpAddress!,
            type: 'ipsec.1',
            tags: [
                {
                    key: 'Name',
                    value: props.prefix!.concat('-CGW').toString()
                }
            ]
        });

        // Create the Site-to-Site VPN Connection
        this.cfnVPNConnection = new CfnVPNConnection(this, props.prefix!.concat('-VPN').toString(), {
            customerGatewayId: this.cfnCustomerGateway.ref,
            transitGatewayId: this.cfnTransitGateway.ref,
            staticRoutesOnly: false,
            type: 'ipsec.1',
            tags: [
                {
                    key: 'Name',
                    value: props.prefix!.concat('-VPN').toString()
                }
            ]
        });

        // Outputs
        new CfnOutput(this, 'transitGatewayId', {
            description: 'Transit Gateway ID',
            exportName: 'TransitGatewayId',
            value: this.cfnTransitGateway.ref
        });

        new CfnOutput(this, 'customerGatewayId', {
            description: 'Customer Gateway ID',
            exportName: 'CustomerGatewayId',
            value: this.cfnCustomerGateway.ref
        });

        new CfnOutput(this, 'vpnConnectionId', {
            description: 'VPN Connection ID',
            exportName: 'VPNConnectionId',
            value: this.cfnVPNConnection.ref
        });

    }
}

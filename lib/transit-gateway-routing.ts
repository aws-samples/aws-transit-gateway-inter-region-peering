import * as cdk from '@aws-cdk/core'
import {
    CfnTransitGatewayRoute,
    CfnTransitGatewayRouteTable,
    CfnTransitGatewayRouteTableAssociation,
    CfnTransitGatewayRouteTablePropagation
} from "@aws-cdk/aws-ec2";

export interface StaticRouteProps {
    readonly destination?: string;
    readonly attachmentId?: string;
}

export interface TgwVpcRoutingProps {
    readonly vpcAttachmentId?: string;
    readonly vpcRouteTableId?: string;
    readonly staticRoutes?: StaticRouteProps
}

export interface TgwVpnRoutingProps {
    readonly vpnAttachmentId?: string;
}

export interface TgwPeeringRoutingProps {
    readonly peeringAttachmentId?: string;
}

export interface TransitGatewayRoutingProps {
    readonly transitGatewayId?: string;
    readonly developmentVpcInfo?: TgwVpcRoutingProps;
    readonly productionVpcInfo?: TgwVpcRoutingProps;
    readonly vpnInfo?: TgwVpnRoutingProps;
    readonly peeringInfo?: TgwPeeringRoutingProps;
}

export class TransitGatewayRouting extends cdk.Construct {

    constructor(scope: cdk.Construct, id: string, props: TransitGatewayRoutingProps = {}) {
        super(scope, id);

        // Create the routing table, association and propagation for TGW-VPN
        const vpnTransitGatewayRTB = new CfnTransitGatewayRouteTable(this, "VPN", {
            transitGatewayId: props.transitGatewayId!,
            tags: [
                {
                    key: "Name",
                    value: "VPNRouteTable"
                }
            ]
        });
        new CfnTransitGatewayRouteTableAssociation(this, "VPNAssociation", {
            transitGatewayAttachmentId: props.vpnInfo!.vpnAttachmentId!,
            transitGatewayRouteTableId: vpnTransitGatewayRTB.ref
        });
        new CfnTransitGatewayRouteTablePropagation(this, "VPNPropagation", {
            transitGatewayAttachmentId: props.vpnInfo!.vpnAttachmentId!,
            transitGatewayRouteTableId: vpnTransitGatewayRTB.ref
        });

        // Propagate the Development and Production attachments with TGW-VPN RouteTable
        new CfnTransitGatewayRouteTablePropagation(this, "VPNDevelopmentPropagation", {
            transitGatewayAttachmentId: props.developmentVpcInfo!.vpcAttachmentId!,
            transitGatewayRouteTableId: vpnTransitGatewayRTB.ref
        });
        new CfnTransitGatewayRouteTablePropagation(this, "VPNProductionPropagation", {
            transitGatewayAttachmentId: props.productionVpcInfo!.vpcAttachmentId!,
            transitGatewayRouteTableId: vpnTransitGatewayRTB.ref
        });

        // Propagate the VPN attachment for Development and Production TGW-VPC RouteTable
        new CfnTransitGatewayRouteTablePropagation(this, "DevelopmentVPNPropagation", {
            transitGatewayAttachmentId: props.vpnInfo!.vpnAttachmentId!,
            transitGatewayRouteTableId: props.developmentVpcInfo!.vpcRouteTableId!
        });
        new CfnTransitGatewayRouteTablePropagation(this, "ProductionVPNPropagation", {
            transitGatewayAttachmentId: props.vpnInfo!.vpnAttachmentId!,
            transitGatewayRouteTableId: props.productionVpcInfo!.vpcRouteTableId!
        });

        // Add the static route for Development and Production TGW-VPC RouteTable
        new CfnTransitGatewayRoute(this, "DevelopmentStaticRoute", {
            transitGatewayAttachmentId: props.peeringInfo!.peeringAttachmentId!,
            destinationCidrBlock: props.developmentVpcInfo!.staticRoutes!.destination!,
            transitGatewayRouteTableId: props.developmentVpcInfo!.vpcRouteTableId!
        });
        new CfnTransitGatewayRoute(this, "ProductionStaticRoute", {
            transitGatewayAttachmentId: props.peeringInfo!.peeringAttachmentId!,
            destinationCidrBlock: props.productionVpcInfo!.staticRoutes!.destination!,
            transitGatewayRouteTableId: props.productionVpcInfo!.vpcRouteTableId!
        });

        // Create the routing table, association and propagation for TGW-PEER
        const transitGatewayPeerRTB = new CfnTransitGatewayRouteTable(this, "TGWPeer", {
            transitGatewayId: props.transitGatewayId!,
            tags: [
                {
                    key: "Name",
                    value: "TGWPeerRouteTable"
                }
            ]
        });
        new CfnTransitGatewayRouteTableAssociation(this, "TGWPeerAssociation", {
            transitGatewayAttachmentId: props.peeringInfo!.peeringAttachmentId!,
            transitGatewayRouteTableId: transitGatewayPeerRTB.ref
        });

        // Propagate the Development and Production attachments for TGW-PEER RouteTable
        new CfnTransitGatewayRouteTablePropagation(this, "PeerDevelopmentPropagation", {
            transitGatewayAttachmentId: props.developmentVpcInfo!.vpcAttachmentId!,
            transitGatewayRouteTableId: transitGatewayPeerRTB.ref
        });
        new CfnTransitGatewayRouteTablePropagation(this, "PeerProductionPropagation", {
            transitGatewayAttachmentId: props.productionVpcInfo!.vpcAttachmentId!,
            transitGatewayRouteTableId: transitGatewayPeerRTB.ref
        });

    }
}

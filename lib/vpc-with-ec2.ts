// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import {
    AmazonLinuxCpuType,
    AmazonLinuxGeneration,
    AmazonLinuxImage,
    CfnTransitGateway,
    CfnTransitGatewayAttachment,
    CfnTransitGatewayRouteTable,
    CfnTransitGatewayRouteTableAssociation,
    CfnTransitGatewayRouteTablePropagation,
    FlowLog,
    FlowLogDestination,
    FlowLogResourceType,
    FlowLogTrafficType,
    Instance,
    InstanceClass,
    InstanceSize,
    InstanceType,
    InterfaceVpcEndpoint,
    InterfaceVpcEndpointAwsService, IpAddresses,
    IVpc,
    Peer,
    Port,
    SecurityGroup,
    SubnetType,
    Vpc
} from 'aws-cdk-lib/aws-ec2';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';


export interface VpcWithEc2Props {
    readonly prefix?: string;
    readonly cidr?: string;
    readonly cidrMask?: number;
    readonly transitGateway?: CfnTransitGateway;
    readonly ec2Role?: IRole;
}

export class VpcWithEc2 extends Construct {

    public readonly vpc: IVpc;
    public readonly securityGroup: SecurityGroup;
    public readonly subnetIds: string[] = [];
    public readonly cfnTransitGatewayAttachment: CfnTransitGatewayAttachment
    public readonly cfnTransitGatewayRouteTable: CfnTransitGatewayRouteTable

    constructor(scope: Construct, id: string, props: VpcWithEc2Props = {}) {

        super(scope, id);

        // Create the VPC with ISOLATED subnets
        this.vpc = new Vpc(this, props.prefix!.concat('-VPC').toString(), {
            ipAddresses: IpAddresses.cidr(props.cidr!),
            maxAzs: 3,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            subnetConfiguration: [
                {
                    cidrMask: props.cidrMask,
                    name: props.prefix!.concat('-VPC | Private Isolated'),
                    subnetType: SubnetType.PRIVATE_ISOLATED
                }]
        });

        // Enable VPC Flow Logs
        const flowLogGroup = new LogGroup(this, props.prefix!.concat('-FlowLogs').toString(), {
            retention: RetentionDays.ONE_MONTH,
            removalPolicy: RemovalPolicy.DESTROY
        });

        new FlowLog(this, props.prefix!.concat('-VPCFlowLog').toString(), {
            resourceType: FlowLogResourceType.fromVpc(this.vpc),
            destination: FlowLogDestination.toCloudWatchLogs(flowLogGroup),
            trafficType: FlowLogTrafficType.ALL,
            flowLogName: props.prefix!.concat('-VPCFlowLog').toString()
        });

        // Populate the subnetIDs
        this.vpc.isolatedSubnets.forEach(subnet => this.subnetIds.push(subnet.subnetId));

        // SecurityGroup for the EC2 instance
        this.securityGroup = new SecurityGroup(this, props.prefix!.concat('-SG').toString(), {
            vpc: this.vpc,
            description: 'Allow ICMP ping and HTTPS'
        });
        this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.icmpPing(), 'Allow ICMP');
        this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'Allow HTTPS');

        // Create the VPC Interface Endpoints
        new InterfaceVpcEndpoint(this, props.prefix!.concat('-SSM').toString(), {
            service: InterfaceVpcEndpointAwsService.SSM,
            vpc: this.vpc,
            privateDnsEnabled: true,
            securityGroups: [this.securityGroup],
            subnets: this.vpc.selectSubnets({
                subnetType: SubnetType.PRIVATE_ISOLATED
            })
        });
        new InterfaceVpcEndpoint(this, props.prefix!.concat('-SSM_MESSAGES').toString(), {
            service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
            vpc: this.vpc,
            privateDnsEnabled: true,
            securityGroups: [this.securityGroup],
            subnets: this.vpc.selectSubnets({
                subnetType: SubnetType.PRIVATE_ISOLATED
            })
        });
        new InterfaceVpcEndpoint(this, props.prefix!.concat('-EC2').toString(), {
            service: InterfaceVpcEndpointAwsService.EC2,
            vpc: this.vpc,
            privateDnsEnabled: true,
            securityGroups: [this.securityGroup],
            subnets: this.vpc.selectSubnets({
                subnetType: SubnetType.PRIVATE_ISOLATED
            })
        });
        new InterfaceVpcEndpoint(this, props.prefix!.concat('-EC2_MESSAGES').toString(), {
            service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
            vpc: this.vpc,
            privateDnsEnabled: true,
            securityGroups: [this.securityGroup],
            subnets: this.vpc.selectSubnets({
                subnetType: SubnetType.PRIVATE_ISOLATED
            })
        });

        // Create a EC2 instance
        const ec2Instance = new Instance(this, props.prefix!.concat('-Instance').toString(), {
            instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
            role: props.ec2Role,
            vpc: this.vpc,
            securityGroup: this.securityGroup,
            machineImage: new AmazonLinuxImage({
                cpuType: AmazonLinuxCpuType.X86_64,
                generation: AmazonLinuxGeneration.AMAZON_LINUX_2
            }),
            detailedMonitoring: true,
            requireImdsv2: true
        });

        // Enable CloudWatch Alarms
        new Alarm(this, props.prefix!.concat('-HighNetworkIn').toString(), {
            metric: new Metric({
                namespace: 'AWS/EC2',
                metricName: 'NetworkIn',
                dimensionsMap: {
                    InstanceId: ec2Instance.instanceId
                },
                statistic: 'Average'
            }),
            threshold: 1000000000, // 1GB
            evaluationPeriods: 2,
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: TreatMissingData.NOT_BREACHING,
            alarmDescription: 'High network input detected'
        });

        new Alarm(this, props.prefix!.concat('-HighCPU').toString(), {
            metric: new Metric({
                namespace: 'AWS/EC2',
                metricName: 'CPUUtilization',
                dimensionsMap: {
                    InstanceId: ec2Instance.instanceId
                },
                statistic: 'Average'
            }),
            threshold: 80,
            evaluationPeriods: 3,
            comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: TreatMissingData.NOT_BREACHING,
            alarmDescription: 'High CPU utilization detected'
        });

        // Create a transit gateway route table
        this.cfnTransitGatewayRouteTable = new CfnTransitGatewayRouteTable(this, props.prefix!.concat('-RouteTable').toString(), {
            transitGatewayId: props.transitGateway!.ref,
            tags: [
                {
                    key: 'Name',
                    value: props.prefix!.concat('-RouteTable').toString()
                }
            ]
        });

        // // Create a transit gateway attachment
        this.cfnTransitGatewayAttachment = new CfnTransitGatewayAttachment(this, props.prefix!.concat('-Attachment').toString(), {
            transitGatewayId: props.transitGateway!.ref,
            vpcId: this.vpc.vpcId,
            subnetIds: this.subnetIds,
            tags: [
                {
                    key: 'Name',
                    value: props.prefix!.concat('-Attachment').toString()
                }
            ]
        });

        // Create a transit gateway association
        const cfnTransitGatewayRouteTableAssociation = new CfnTransitGatewayRouteTableAssociation(this, props.prefix!.concat('-RouteTableAssociation').toString(), {
            transitGatewayRouteTableId: this.cfnTransitGatewayRouteTable.ref,
            transitGatewayAttachmentId: this.cfnTransitGatewayAttachment.ref
        });
        cfnTransitGatewayRouteTableAssociation.node.addDependency(this.cfnTransitGatewayRouteTable);
        cfnTransitGatewayRouteTableAssociation.node.addDependency(this.cfnTransitGatewayAttachment);

        // Create a transit gateway propagation
        const cfnTransitGatewayRouteTablePropagation = new CfnTransitGatewayRouteTablePropagation(this, props.prefix!.concat('-RouteTablePropagation').toString(), {
            transitGatewayRouteTableId: this.cfnTransitGatewayRouteTable.ref,
            transitGatewayAttachmentId: this.cfnTransitGatewayAttachment.ref
        });
        cfnTransitGatewayRouteTablePropagation.node.addDependency(this.cfnTransitGatewayRouteTable);
        cfnTransitGatewayRouteTablePropagation.node.addDependency(this.cfnTransitGatewayAttachment);

        //Outputs
        new CfnOutput(this, props.prefix!.concat('-VPCId').toString(), {
            description: 'VPCId for the environment',
            exportName: props.prefix!.concat('VPCId').toString(),
            value: this.vpc.vpcId
        });
        new CfnOutput(this, props.prefix!.concat('-TGWAttachmentId').toString(), {
            description: 'TGWAttachmentId for the VPC',
            exportName: props.prefix!.concat('TGWAttachmentId').toString(),
            value: this.cfnTransitGatewayAttachment.ref
        });
        new CfnOutput(this, props.prefix!.concat('-TGWRouteTableId').toString(), {
            description: 'TGWRouteTableId for the VPC',
            exportName: props.prefix!.concat('TGWRouteTableId').toString(),
            value: this.cfnTransitGatewayRouteTable.ref
        });
    }
}

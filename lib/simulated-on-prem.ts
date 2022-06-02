// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import {CfnOutput, Fn} from 'aws-cdk-lib';
import {CfnEIP, IVpc, SubnetType, Vpc} from 'aws-cdk-lib/aws-ec2';
import {Construct} from 'constructs';

export interface SimulatedOnPremProps {
    readonly prefix?: string;
    readonly cidr?: string;
    readonly cidrMask?: number;
}

export class SimulatedOnPrem extends Construct {

    public readonly eip: CfnEIP;
    public readonly vpc: IVpc;

    constructor(scope: Construct, id: string, props: SimulatedOnPremProps = {}) {
        super(scope, id);

        this.eip = new CfnEIP(this, 'onPremEIP');
        const allocationId = Fn.getAtt(this.eip.logicalId, 'AllocationId');

        // Create the VPC with PUBLIC subnet
        this.vpc = new Vpc(this, props.prefix!.concat('-VPC').toString(), {
            cidr: props.cidr,
            maxAzs: 1,
            subnetConfiguration: [
                {
                    cidrMask: props.cidrMask,
                    name: props.prefix!.concat('-VPC | Public'),
                    subnetType: SubnetType.PUBLIC
                }]
        });

        // Outputs
        new CfnOutput(this, 'eipAllocationId', {
            description: 'EIP allocation ID',
            exportName: 'eipAllocationId',
            value: allocationId.toString()
        });
    }
}

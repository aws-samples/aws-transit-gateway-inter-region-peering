// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "@aws-cdk/core";
import {CfnOutput} from "@aws-cdk/core";
import {CfnEIP, IVpc, SubnetType} from "@aws-cdk/aws-ec2";
import ec2 = require('@aws-cdk/aws-ec2');

export interface SimulatedOnPremProps {
    readonly prefix?: string;
    readonly cidr?: string;
    readonly cidrMask?: number;
}

export class SimulatedOnPrem extends cdk.Construct {

    public readonly eip: CfnEIP;
    public readonly vpc: IVpc;

    constructor(scope: cdk.Construct, id: string, props: SimulatedOnPremProps = {}) {
        super(scope, id);

        this.eip = new ec2.CfnEIP(this, "onPremEIP");
        const allocationId = cdk.Fn.getAtt(this.eip.logicalId, "AllocationId");

        // Create the VPC with PUBLIC subnet
        this.vpc = new ec2.Vpc(this, props.prefix!.concat('-VPC').toString(), {
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
        new CfnOutput(this, "eipAllocationId", {
            description: "EIP allocation ID",
            exportName: "eipAllocationId",
            value: allocationId.toString()
        });
    }
}

import * as cdk from 'aws-cdk-lib';
export interface IntegStackProps extends cdk.StackProps {
    systemAdminEmail: string;
}
export declare class IntegStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: IntegStackProps);
}

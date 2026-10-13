import * as cdk from 'aws-cdk-lib';
export interface IntegStackProps extends cdk.StackProps {
    eventBusArn?: string;
}
export declare class IntegStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: IntegStackProps);
}

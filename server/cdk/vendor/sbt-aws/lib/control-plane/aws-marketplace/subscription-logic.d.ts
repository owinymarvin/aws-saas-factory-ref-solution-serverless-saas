import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
export interface SubscriptionLogicProps {
    readonly productCode: string;
    readonly assetBucket: s3.IBucket;
}
export declare class SubscriptionLogic extends Construct {
    constructor(scope: Construct, id: string, props: SubscriptionLogicProps);
}

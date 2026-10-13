import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
export interface EntitlementLogicProps {
    readonly assetBucket: s3.IBucket;
    readonly subscribersTable: dynamodb.Table;
    readonly registerNewMarketplaceCustomer: lambda.Function;
    readonly entitlementSNSTopic: string;
}
export declare class EntitlementLogic extends Construct {
    constructor(scope: Construct, id: string, props: EntitlementLogicProps);
}

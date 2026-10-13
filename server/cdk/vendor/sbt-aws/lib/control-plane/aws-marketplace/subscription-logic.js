"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionLogic = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const events = require("aws-cdk-lib/aws-events");
const targets = require("aws-cdk-lib/aws-events-targets");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const sqs = require("aws-cdk-lib/aws-sqs");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
class SubscriptionLogic extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'SubscriptionLogic');
        const meteringRecordsTable = new dynamodb.Table(this, 'AWSMarketplaceMeteringRecords', {
            partitionKey: { name: 'customerIdentifier', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'create_timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
        });
        meteringRecordsTable.addGlobalSecondaryIndex({
            indexName: 'PendingMeteringRecordsIndex',
            partitionKey: { name: 'metering_pending', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        const sqsMeteringRecordsEncryptionKey = new cdk.aws_kms.Key(this, 'SQSMeteringRecordsEncryptionKey', { enableKeyRotation: true });
        const meteringRecordsQueue = new sqs.Queue(this, 'SQSMeteringRecords', {
            encryptionMasterKey: sqsMeteringRecordsEncryptionKey,
            contentBasedDeduplication: true,
            fifo: true,
            retentionPeriod: cdk.Duration.seconds(3000),
            enforceSSL: true,
            deadLetterQueue: {
                maxReceiveCount: 5,
                queue: new sqs.Queue(this, 'SQSMeteringRecordsDLQ', {
                    enforceSSL: true,
                    contentBasedDeduplication: true,
                    fifo: true,
                    retentionPeriod: cdk.Duration.seconds(3000),
                }),
            },
        });
        const meteringSQSHandler = new lambda.Function(this, 'MeteringSQSHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'metering-sqs.handler',
            code: lambda.Code.fromBucket(props.assetBucket, 'cloudformation-aws-marketplace-saas/9c1e36f06f022c95bcc9129bbacfa195'),
            environment: {
                ProductCode: props.productCode,
                AWSMarketplaceMeteringRecordsTableName: meteringRecordsTable.tableName,
            },
            events: [
                new aws_lambda_event_sources_1.SqsEventSource(meteringRecordsQueue, {
                    batchSize: 1,
                }),
            ],
        });
        sqsMeteringRecordsEncryptionKey.grantDecrypt(meteringSQSHandler);
        cdk_nag_1.NagSuppressions.addResourceSuppressions([meteringSQSHandler], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                ],
            },
            {
                id: 'AwsSolutions-L1',
                reason: 'NODEJS 18 is the version used in the official quickstart CFN template.',
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Index name(s) not known beforehand.',
                appliesTo: [
                    `Resource::<${cdk.Stack.of(this).getLogicalId(meteringRecordsTable.node.defaultChild)}.Arn>/index/*`,
                ],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Used as part of the policy that allows aws-marketplace:BatchMeterUsage.',
                appliesTo: ['Resource::*'],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        meteringRecordsTable.grantWriteData(meteringSQSHandler);
        meteringSQSHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ['aws-marketplace:BatchMeterUsage'],
            resources: ['*'],
        }));
        const hourlyMeteringFunction = new lambda.Function(this, 'Hourly', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'metering-hourly-job.job',
            code: lambda.Code.fromBucket(props.assetBucket, 'cloudformation-aws-marketplace-saas/9c1e36f06f022c95bcc9129bbacfa195'),
            environment: {
                SQSMeteringRecordsUrl: meteringRecordsQueue.queueUrl,
                AWSMarketplaceMeteringRecordsTableName: meteringRecordsTable.tableName,
            },
        });
        meteringRecordsTable.grantReadData(hourlyMeteringFunction);
        meteringRecordsQueue.grantSendMessages(hourlyMeteringFunction);
        sqsMeteringRecordsEncryptionKey.grantEncrypt(hourlyMeteringFunction);
        cdk_nag_1.NagSuppressions.addResourceSuppressions([hourlyMeteringFunction], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                ],
            },
            {
                id: 'AwsSolutions-L1',
                reason: 'NODEJS 18 is the version used in the official quickstart CFN template.',
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Index name(s) not known beforehand.',
                appliesTo: [
                    `Resource::<${cdk.Stack.of(this).getLogicalId(meteringRecordsTable.node.defaultChild)}.Arn>/index/*`,
                    `Action::kms:ReEncrypt*`,
                    `Action::kms:GenerateDataKey*`,
                ],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'TBD: This is Resource::* being used to output logs and x-ray traces and nothing else.',
                appliesTo: ['Resource::*'],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        const meteringRule = new events.Rule(this, 'MeteringSchedule', {
            schedule: events.Schedule.rate(cdk.Duration.hours(1)),
            enabled: true,
        });
        meteringRule.addTarget(new targets.LambdaFunction(hourlyMeteringFunction));
    }
}
exports.SubscriptionLogic = SubscriptionLogic;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vic2NyaXB0aW9uLWxvZ2ljLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnRyb2wtcGxhbmUvYXdzLW1hcmtldHBsYWNlL3N1YnNjcmlwdGlvbi1sb2dpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUVBQXFFO0FBQ3JFLHNDQUFzQzs7O0FBRXRDLG1DQUFtQztBQUNuQyxxREFBcUQ7QUFDckQsaURBQWlEO0FBQ2pELDBEQUEwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELG1GQUFzRTtBQUV0RSwyQ0FBMkM7QUFDM0MscUNBQTBDO0FBQzFDLDJDQUF1QztBQUN2Qyx1Q0FBNkM7QUFPN0MsTUFBYSxpQkFBa0IsU0FBUSxzQkFBUztJQUM5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3JFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBQSxzQkFBYyxFQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRTFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSwrQkFBK0IsRUFBRTtZQUNyRixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ2pGLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDMUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxtQkFBbUIsRUFBRSxJQUFJO1NBQzFCLENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLHVCQUF1QixDQUFDO1lBQzNDLFNBQVMsRUFBRSw2QkFBNkI7WUFDeEMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFF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QUMvQjthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLHVGQUF1RjtnQkFDekYsU0FBUyxFQUFFLENBQUMsYUFBYSxDQUFDO2FBQzNCO1NBQ0YsRUFDRCxJQUFJLENBQUMsK0VBQStFO1NBQ3JGLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzdELFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxPQUFPLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQztRQUVILFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0NBQ0Y7QUE1SkQsOENBNEpDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IFNxc0V2ZW50U291cmNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tICdjZGstbmFnJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgYWRkVGVtcGxhdGVUYWcgfSBmcm9tICcuLi8uLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3Vic2NyaXB0aW9uTG9naWNQcm9wcyB7XG4gIHJlYWRvbmx5IHByb2R1Y3RDb2RlOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGFzc2V0QnVja2V0OiBzMy5JQnVja2V0O1xufVxuXG5leHBvcnQgY2xhc3MgU3Vic2NyaXB0aW9uTG9naWMgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU3Vic2NyaXB0aW9uTG9naWNQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgYWRkVGVtcGxhdGVUYWcodGhpcywgJ1N1YnNjcmlwdGlvbkxvZ2ljJyk7XG5cbiAgICBjb25zdCBtZXRlcmluZ1JlY29yZHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQVdTTWFya2V0cGxhY2VNZXRlcmluZ1JlY29yZHMnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2N1c3RvbWVySWRlbnRpZmllcicsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVfdGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgIH0pO1xuXG4gICAgbWV0ZXJpbmdSZWNvcmRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnUGVuZGluZ01ldGVyaW5nUmVjb3Jkc0luZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbWV0ZXJpbmdfcGVuZGluZycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgc3FzTWV0ZXJpbmdSZWNvcmRzRW5jcnlwdGlvbktleSA9IG5ldyBjZGsuYXdzX2ttcy5LZXkoXG4gICAgICB0aGlzLFxuICAgICAgJ1NRU01ldGVyaW5nUmVjb3Jkc0VuY3J5cHRpb25LZXknLFxuICAgICAgeyBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSB9XG4gICAgKTtcblxuICAgIGNvbnN0IG1ldGVyaW5nUmVjb3Jkc1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnU1FTTWV0ZXJpbmdSZWNvcmRzJywge1xuICAgICAgZW5jcnlwdGlvbk1hc3RlcktleTogc3FzTWV0ZXJpbmdSZWNvcmRzRW5jcnlwdGlvbktleSxcbiAgICAgIGNvbnRlbnRCYXNlZERlZHVwbGljYXRpb246IHRydWUsXG4gICAgICBmaWZvOiB0cnVlLFxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDAwKSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiA1LFxuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZSh0aGlzLCAnU1FTTWV0ZXJpbmdSZWNvcmRzRExRJywge1xuICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICAgICAgY29udGVudEJhc2VkRGVkdXBsaWNhdGlvbjogdHJ1ZSxcbiAgICAgICAgICBmaWZvOiB0cnVlLFxuICAgICAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwMCksXG4gICAgICAgIH0pLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IG1ldGVyaW5nU1FTSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ01ldGVyaW5nU1FTSGFuZGxlcicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ21ldGVyaW5nLXNxcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21CdWNrZXQoXG4gICAgICAgIHByb3BzLmFzc2V0QnVja2V0LFxuICAgICAgICAnY2xvdWRmb3JtYXRpb24tYXdzLW1hcmtldHBsYWNlLXNhYXMvOWMxZTM2ZjA2ZjAyMmM5NWJjYzkxMjliYmFjZmExOTUnXG4gICAgICApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgUHJvZHVjdENvZGU6IHByb3BzLnByb2R1Y3RDb2RlLFxuICAgICAgICBBV1NNYXJrZXRwbGFjZU1ldGVyaW5nUmVjb3Jkc1RhYmxlTmFtZTogbWV0ZXJpbmdSZWNvcmRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIGV2ZW50czogW1xuICAgICAgICBuZXcgU3FzRXZlbnRTb3VyY2UobWV0ZXJpbmdSZWNvcmRzUXVldWUsIHtcbiAgICAgICAgICBiYXRjaFNpemU6IDEsXG4gICAgICAgIH0pLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIHNxc01ldGVyaW5nUmVjb3Jkc0VuY3J5cHRpb25LZXkuZ3JhbnREZWNyeXB0KG1ldGVyaW5nU1FTSGFuZGxlcik7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbbWV0ZXJpbmdTUVNIYW5kbGVyXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1MMScsXG4gICAgICAgICAgcmVhc29uOiAnTk9ERUpTIDE4IGlzIHRoZSB2ZXJzaW9uIHVzZWQgaW4gdGhlIG9mZmljaWFsIHF1aWNrc3RhcnQgQ0ZOIHRlbXBsYXRlLicsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdJbmRleCBuYW1lKHMpIG5vdCBrbm93biBiZWZvcmVoYW5kLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICBgUmVzb3VyY2U6Ojwke2Nkay5TdGFjay5vZih0aGlzKS5nZXRMb2dpY2FsSWQobWV0ZXJpbmdSZWNvcmRzVGFibGUubm9kZS5kZWZhdWx0Q2hpbGQgYXMgZHluYW1vZGIuQ2ZuVGFibGUpfS5Bcm4+L2luZGV4LypgLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdVc2VkIGFzIHBhcnQgb2YgdGhlIHBvbGljeSB0aGF0IGFsbG93cyBhd3MtbWFya2V0cGxhY2U6QmF0Y2hNZXRlclVzYWdlLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbJ1Jlc291cmNlOjoqJ10sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcblxuICAgIG1ldGVyaW5nUmVjb3Jkc1RhYmxlLmdyYW50V3JpdGVEYXRhKG1ldGVyaW5nU1FTSGFuZGxlcik7XG4gICAgbWV0ZXJpbmdTUVNIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydhd3MtbWFya2V0cGxhY2U6QmF0Y2hNZXRlclVzYWdlJ10sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBjb25zdCBob3VybHlNZXRlcmluZ0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSG91cmx5Jywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBoYW5kbGVyOiAnbWV0ZXJpbmctaG91cmx5LWpvYi5qb2InLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUJ1Y2tldChcbiAgICAgICAgcHJvcHMuYXNzZXRCdWNrZXQsXG4gICAgICAgICdjbG91ZGZvcm1hdGlvbi1hd3MtbWFya2V0cGxhY2Utc2Fhcy85YzFlMzZmMDZmMDIyYzk1YmNjOTEyOWJiYWNmYTE5NSdcbiAgICAgICksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTUVNNZXRlcmluZ1JlY29yZHNVcmw6IG1ldGVyaW5nUmVjb3Jkc1F1ZXVlLnF1ZXVlVXJsLFxuICAgICAgICBBV1NNYXJrZXRwbGFjZU1ldGVyaW5nUmVjb3Jkc1RhYmxlTmFtZTogbWV0ZXJpbmdSZWNvcmRzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIG1ldGVyaW5nUmVjb3Jkc1RhYmxlLmdyYW50UmVhZERhdGEoaG91cmx5TWV0ZXJpbmdGdW5jdGlvbik7XG4gICAgbWV0ZXJpbmdSZWNvcmRzUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoaG91cmx5TWV0ZXJpbmdGdW5jdGlvbik7XG4gICAgc3FzTWV0ZXJpbmdSZWNvcmRzRW5jcnlwdGlvbktleS5ncmFudEVuY3J5cHQoaG91cmx5TWV0ZXJpbmdGdW5jdGlvbik7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbaG91cmx5TWV0ZXJpbmdGdW5jdGlvbl0sXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU00JyxcbiAgICAgICAgICByZWFzb246ICdTdXBwcmVzcyB1c2FnZSBvZiBBV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUuJyxcbiAgICAgICAgICBhcHBsaWVzVG86IFtcbiAgICAgICAgICAgICdQb2xpY3k6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmlhbTo6YXdzOnBvbGljeS9zZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlJyxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtTDEnLFxuICAgICAgICAgIHJlYXNvbjogJ05PREVKUyAxOCBpcyB0aGUgdmVyc2lvbiB1c2VkIGluIHRoZSBvZmZpY2lhbCBxdWlja3N0YXJ0IENGTiB0ZW1wbGF0ZS4nLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOiAnSW5kZXggbmFtZShzKSBub3Qga25vd24gYmVmb3JlaGFuZC4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgYFJlc291cmNlOjo8JHtjZGsuU3RhY2sub2YodGhpcykuZ2V0TG9naWNhbElkKG1ldGVyaW5nUmVjb3Jkc1RhYmxlLm5vZGUuZGVmYXVsdENoaWxkIGFzIGR5bmFtb2RiLkNmblRhYmxlKX0uQXJuPi9pbmRleC8qYCxcbiAgICAgICAgICAgIGBBY3Rpb246OmttczpSZUVuY3J5cHQqYCxcbiAgICAgICAgICAgIGBBY3Rpb246OmttczpHZW5lcmF0ZURhdGFLZXkqYCxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgJ1RCRDogVGhpcyBpcyBSZXNvdXJjZTo6KiBiZWluZyB1c2VkIHRvIG91dHB1dCBsb2dzIGFuZCB4LXJheSB0cmFjZXMgYW5kIG5vdGhpbmcgZWxzZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogWydSZXNvdXJjZTo6KiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHBvbGljaWVzIGNyZWF0ZWQgZm9yIHRoZSByb2xlLlxuICAgICk7XG5cbiAgICBjb25zdCBtZXRlcmluZ1J1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ01ldGVyaW5nU2NoZWR1bGUnLCB7XG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLnJhdGUoY2RrLkR1cmF0aW9uLmhvdXJzKDEpKSxcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICBtZXRlcmluZ1J1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKGhvdXJseU1ldGVyaW5nRnVuY3Rpb24pKTtcbiAgfVxufVxuIl19
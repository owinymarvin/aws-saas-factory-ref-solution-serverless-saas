"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementLogic = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const sns = require("aws-cdk-lib/aws-sns");
const subscriptions = require("aws-cdk-lib/aws-sns-subscriptions");
const sqs = require("aws-cdk-lib/aws-sqs");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
class EntitlementLogic extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'EntitlementLogic');
        const entitlementSQSQueueEncryptionKey = new cdk.aws_kms.Key(this, 'EntitlementSQSQueueEncryptionKey', {
            enableKeyRotation: true,
        });
        const entitlementQueue = new sqs.Queue(this, 'EntitlementSQSQueue', {
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: entitlementSQSQueueEncryptionKey,
            enforceSSL: true,
            deadLetterQueue: {
                maxReceiveCount: 5,
                queue: new sqs.Queue(this, 'EntitlementSQSQueueDLQ', {
                    enforceSSL: true,
                    retentionPeriod: cdk.Duration.seconds(3000),
                }),
            },
        });
        const entitlementSNSTopic = sns.Topic.fromTopicArn(this, 'EntitlementSNSTopic', props.entitlementSNSTopic);
        entitlementSNSTopic.addSubscription(new subscriptions.SqsSubscription(entitlementQueue));
        const entitlementSQSHandler = new lambda.Function(this, 'EntitlementSQSHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'entitlement-sqs.handler',
            code: lambda.Code.fromBucket(props.assetBucket, 'cloudformation-aws-marketplace-saas/9c1e36f06f022c95bcc9129bbacfa195'),
            environment: {
                NewSubscribersTableName: props.subscribersTable.tableName,
            },
            events: [new aws_lambda_event_sources_1.SqsEventSource(entitlementQueue, { batchSize: 1 })],
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions([entitlementSQSHandler], [
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
                    `Resource::<MarketplaceAWSMarketplaceMeteringRecords3B0F9D94.Arn>/index/*`,
                    `Action::kms:ReEncrypt*`,
                    `Action::kms:GenerateDataKey*`,
                ],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Used as part of IAM policy that allows calling aws-marketplace:GetEntitlements',
                appliesTo: ['Resource::*'],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        entitlementQueue.grantSendMessages(entitlementSQSHandler);
        props.subscribersTable.grantWriteData(entitlementSQSHandler);
        entitlementSQSHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ['aws-marketplace:GetEntitlements'],
            resources: ['*'],
        }));
        props.registerNewMarketplaceCustomer.addEnvironment('ENTITLEMENT_QUEUE_URL', entitlementQueue.queueUrl);
        entitlementSQSQueueEncryptionKey.grantEncrypt(props.registerNewMarketplaceCustomer);
        cdk_nag_1.NagSuppressions.addResourceSuppressions([props.registerNewMarketplaceCustomer], [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Index name(s) not known beforehand.',
                appliesTo: [`Action::kms:ReEncrypt*`, `Action::kms:GenerateDataKey*`],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Used as part of the policy that allows aws-marketplace:GetEntitlements, aws-marketplace:ResolveCustomer, and ses:SendEmail',
                appliesTo: ['Resource::*'],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        entitlementSQSQueueEncryptionKey.grantEncryptDecrypt(entitlementSQSHandler);
        entitlementQueue.grantSendMessages(props.registerNewMarketplaceCustomer);
    }
}
exports.EntitlementLogic = EntitlementLogic;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50aXRsZW1lbnQtbG9naWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udHJvbC1wbGFuZS9hd3MtbWFya2V0cGxhY2UvZW50aXRsZW1lbnQtbG9naWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7OztBQUV0QyxtQ0FBbUM7QUFFbkMsMkNBQTJDO0FBQzNDLGlEQUFpRDtBQUNqRCxtRkFBc0U7QUFFdEUsMkNBQTJDO0FBQzNDLG1FQUFtRTtBQUNuRSwyQ0FBMkM7QUFDM0MscUNBQTBDO0FBQzFDLDJDQUF1QztBQUN2Qyx1Q0FBNkM7QUFTN0MsTUFBYSxnQkFBaUIsU0FBUSxzQkFBUztJQUM3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBQSxzQkFBYyxFQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXpDLE1BQU0sZ0NBQWdDLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDMUQsSUFBSSxFQUNKLGtDQUFrQyxFQUNsQztZQUNFLGlCQUFpQixFQUFFLElBQUk7U0FDeEIsQ0FDRixDQUFDO1FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ2xFLFVBQVUsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUc7WUFDbkMsbUJBQW1CLEVBQUUsZ0NBQWdDO1lBQ3JELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGVBQWUsRUFBRTtnQkFDZixlQUFlLEVBQUUsQ0FBQztnQkFDbEIsS0FBSyxFQUFFLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7b0JBQ25ELFVBQVUsRUFBRSxJQUFJO29CQUNoQixlQUFlLEVBQUUsR0FBRyxDQUFD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QixDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0lBQzNFLENBQUM7Q0FDRjtBQWpIRCw0Q0FpSEMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgU3FzRXZlbnRTb3VyY2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcbmltcG9ydCAqIGFzIHN1YnNjcmlwdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gJ2Nkay1uYWcnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBhZGRUZW1wbGF0ZVRhZyB9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBFbnRpdGxlbWVudExvZ2ljUHJvcHMge1xuICByZWFkb25seSBhc3NldEJ1Y2tldDogczMuSUJ1Y2tldDtcbiAgcmVhZG9ubHkgc3Vic2NyaWJlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJlYWRvbmx5IHJlZ2lzdGVyTmV3TWFya2V0cGxhY2VDdXN0b21lcjogbGFtYmRhLkZ1bmN0aW9uO1xuICByZWFkb25seSBlbnRpdGxlbWVudFNOU1RvcGljOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBFbnRpdGxlbWVudExvZ2ljIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEVudGl0bGVtZW50TG9naWNQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgYWRkVGVtcGxhdGVUYWcodGhpcywgJ0VudGl0bGVtZW50TG9naWMnKTtcblxuICAgIGNvbnN0IGVudGl0bGVtZW50U1FTUXVldWVFbmNyeXB0aW9uS2V5ID0gbmV3IGNkay5hd3Nfa21zLktleShcbiAgICAgIHRoaXMsXG4gICAgICAnRW50aXRsZW1lbnRTUVNRdWV1ZUVuY3J5cHRpb25LZXknLFxuICAgICAge1xuICAgICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgZW50aXRsZW1lbnRRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0VudGl0bGVtZW50U1FTUXVldWUnLCB7XG4gICAgICBlbmNyeXB0aW9uOiBzcXMuUXVldWVFbmNyeXB0aW9uLktNUyxcbiAgICAgIGVuY3J5cHRpb25NYXN0ZXJLZXk6IGVudGl0bGVtZW50U1FTUXVldWVFbmNyeXB0aW9uS2V5LFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDUsXG4gICAgICAgIHF1ZXVlOiBuZXcgc3FzLlF1ZXVlKHRoaXMsICdFbnRpdGxlbWVudFNRU1F1ZXVlRExRJywge1xuICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDAwKSxcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZW50aXRsZW1lbnRTTlNUb3BpYyA9IHNucy5Ub3BpYy5mcm9tVG9waWNBcm4oXG4gICAgICB0aGlzLFxuICAgICAgJ0VudGl0bGVtZW50U05TVG9waWMnLFxuICAgICAgcHJvcHMuZW50aXRsZW1lbnRTTlNUb3BpY1xuICAgICk7XG4gICAgZW50aXRsZW1lbnRTTlNUb3BpYy5hZGRTdWJzY3JpcHRpb24obmV3IHN1YnNjcmlwdGlvbnMuU3FzU3Vic2NyaXB0aW9uKGVudGl0bGVtZW50UXVldWUpKTtcblxuICAgIGNvbnN0IGVudGl0bGVtZW50U1FTSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0VudGl0bGVtZW50U1FTSGFuZGxlcicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgaGFuZGxlcjogJ2VudGl0bGVtZW50LXNxcy5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21CdWNrZXQoXG4gICAgICAgIHByb3BzLmFzc2V0QnVja2V0LFxuICAgICAgICAnY2xvdWRmb3JtYXRpb24tYXdzLW1hcmtldHBsYWNlLXNhYXMvOWMxZTM2ZjA2ZjAyMmM5NWJjYzkxMjliYmFjZmExOTUnXG4gICAgICApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTmV3U3Vic2NyaWJlcnNUYWJsZU5hbWU6IHByb3BzLnN1YnNjcmliZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICAgIGV2ZW50czogW25ldyBTcXNFdmVudFNvdXJjZShlbnRpdGxlbWVudFF1ZXVlLCB7IGJhdGNoU2l6ZTogMSB9KV0sXG4gICAgfSk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbZW50aXRsZW1lbnRTUVNIYW5kbGVyXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1MMScsXG4gICAgICAgICAgcmVhc29uOiAnTk9ERUpTIDE4IGlzIHRoZSB2ZXJzaW9uIHVzZWQgaW4gdGhlIG9mZmljaWFsIHF1aWNrc3RhcnQgQ0ZOIHRlbXBsYXRlLicsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdJbmRleCBuYW1lKHMpIG5vdCBrbm93biBiZWZvcmVoYW5kLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICBgUmVzb3VyY2U6OjxNYXJrZXRwbGFjZUFXU01hcmtldHBsYWNlTWV0ZXJpbmdSZWNvcmRzM0IwRjlEOTQuQXJuPi9pbmRleC8qYCxcbiAgICAgICAgICAgIGBBY3Rpb246OmttczpSZUVuY3J5cHQqYCxcbiAgICAgICAgICAgIGBBY3Rpb246OmttczpHZW5lcmF0ZURhdGFLZXkqYCxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOiAnVXNlZCBhcyBwYXJ0IG9mIElBTSBwb2xpY3kgdGhhdCBhbGxvd3MgY2FsbGluZyBhd3MtbWFya2V0cGxhY2U6R2V0RW50aXRsZW1lbnRzJyxcbiAgICAgICAgICBhcHBsaWVzVG86IFsnUmVzb3VyY2U6OionXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlIC8vIGFwcGx5VG9DaGlsZHJlbiA9IHRydWUsIHNvIHRoYXQgaXQgYXBwbGllcyB0byBwb2xpY2llcyBjcmVhdGVkIGZvciB0aGUgcm9sZS5cbiAgICApO1xuXG4gICAgZW50aXRsZW1lbnRRdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyhlbnRpdGxlbWVudFNRU0hhbmRsZXIpO1xuICAgIHByb3BzLnN1YnNjcmliZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEoZW50aXRsZW1lbnRTUVNIYW5kbGVyKTtcbiAgICBlbnRpdGxlbWVudFNRU0hhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ2F3cy1tYXJrZXRwbGFjZTpHZXRFbnRpdGxlbWVudHMnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIHByb3BzLnJlZ2lzdGVyTmV3TWFya2V0cGxhY2VDdXN0b21lci5hZGRFbnZpcm9ubWVudChcbiAgICAgICdFTlRJVExFTUVOVF9RVUVVRV9VUkwnLFxuICAgICAgZW50aXRsZW1lbnRRdWV1ZS5xdWV1ZVVybFxuICAgICk7XG4gICAgZW50aXRsZW1lbnRTUVNRdWV1ZUVuY3J5cHRpb25LZXkuZ3JhbnRFbmNyeXB0KHByb3BzLnJlZ2lzdGVyTmV3TWFya2V0cGxhY2VDdXN0b21lcik7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbcHJvcHMucmVnaXN0ZXJOZXdNYXJrZXRwbGFjZUN1c3RvbWVyXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTUnLFxuICAgICAgICAgIHJlYXNvbjogJ0luZGV4IG5hbWUocykgbm90IGtub3duIGJlZm9yZWhhbmQuJyxcbiAgICAgICAgICBhcHBsaWVzVG86IFtgQWN0aW9uOjprbXM6UmVFbmNyeXB0KmAsIGBBY3Rpb246OmttczpHZW5lcmF0ZURhdGFLZXkqYF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICAnVXNlZCBhcyBwYXJ0IG9mIHRoZSBwb2xpY3kgdGhhdCBhbGxvd3MgYXdzLW1hcmtldHBsYWNlOkdldEVudGl0bGVtZW50cywgYXdzLW1hcmtldHBsYWNlOlJlc29sdmVDdXN0b21lciwgYW5kIHNlczpTZW5kRW1haWwnLFxuICAgICAgICAgIGFwcGxpZXNUbzogWydSZXNvdXJjZTo6KiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHBvbGljaWVzIGNyZWF0ZWQgZm9yIHRoZSByb2xlLlxuICAgICk7XG4gICAgZW50aXRsZW1lbnRTUVNRdWV1ZUVuY3J5cHRpb25LZXkuZ3JhbnRFbmNyeXB0RGVjcnlwdChlbnRpdGxlbWVudFNRU0hhbmRsZXIpO1xuICAgIGVudGl0bGVtZW50UXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMocHJvcHMucmVnaXN0ZXJOZXdNYXJrZXRwbGFjZUN1c3RvbWVyKTtcbiAgfVxufVxuIl19
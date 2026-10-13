"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirehoseAggregator = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const path = require("path");
const firehose = require("@aws-cdk/aws-kinesisfirehose-alpha");
const destinations = require("@aws-cdk/aws-kinesisfirehose-destinations-alpha");
const lambda_python = require("@aws-cdk/aws-lambda-python-alpha");
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");
const s3n = require("aws-cdk-lib/aws-s3-notifications");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
 * Creates a Kinesis Firehose to accept high-volume data, which it then routes to an s3 bucket.
 * The s3 bucket triggers a lambda which processes the data and stores it in a DynamoDB table
 * containing the aggregated data.
 */
class FirehoseAggregator extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'FirehoseAggregator');
        const serviceName = 'FirehoseAggregator';
        const firehoseDestinationBucket = new s3.Bucket(this, 'FirehoseDestinationBucket', {
            enforceSSL: true,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(firehoseDestinationBucket, [
            {
                id: 'AwsSolutions-S1',
                reason: 'Server access logs not required.',
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        this.dataIngestor = new firehose.DeliveryStream(this, 'Firehose', {
            encryption: firehose.StreamEncryption.AWS_OWNED,
            destinations: [new destinations.S3Bucket(firehoseDestinationBucket)],
        });
        this.dataIngestorName = this.dataIngestor.deliveryStreamName;
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.dataIngestor, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'S3 object resource name(s) not known beforehand.',
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        this.dataRepository = new dynamodb.Table(this, 'Data', {
            partitionKey: { name: props.primaryKeyColumn, type: dynamodb.AttributeType.STRING },
            pointInTimeRecovery: true,
        });
        // https://docs.powertools.aws.dev/lambda/python/2.31.0/#lambda-layer
        const lambdaPowerToolsLayerARN = `arn:aws:lambda:${cdk.Stack.of(this).region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`;
        this.dataAggregator = new lambda_python.PythonFunction(this, 'DataAggregatorLambda', {
            entry: path.join(__dirname, '../../../resources/functions/data-aggregator'),
            runtime: lambda.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'handler',
            tracing: lambda.Tracing.ACTIVE,
            timeout: cdk.Duration.seconds(30),
            environment: {
                SERVICE_NAME: serviceName,
                DATA_TABLE: this.dataRepository.tableName,
                PRIMARY_KEY_COLUMN: props.primaryKeyColumn,
                PRIMARY_KEY_PATH: props.primaryKeyPath,
                AGGREGATE_KEY_PATH: props.aggregateKeyPath,
                AGGREGATE_VALUE_PATH: props.aggregateValuePath,
            },
            logGroup: new cdk.aws_logs.LogGroup(this, 'DataAggregatorLambdaLogGroup', {
                retention: cdk.aws_logs.RetentionDays.FIVE_DAYS,
            }),
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(this, 'LambdaPowerTools', lambdaPowerToolsLayerARN),
            ],
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions([this.dataAggregator.role], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                ],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'This is Resource::* being used to output logs and x-ray traces and nothing else.',
                appliesTo: [
                    'Resource::*',
                    'Action::s3:GetBucket*',
                    'Action::s3:GetObject*',
                    'Action::s3:List*',
                    `Resource::<${cdk.Stack.of(this).getLogicalId(firehoseDestinationBucket.node.defaultChild)}.Arn>/*`,
                ],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        this.dataRepository.grantReadWriteData(this.dataAggregator);
        firehoseDestinationBucket.grantRead(this.dataAggregator);
        firehoseDestinationBucket.addObjectCreatedNotification(new s3n.LambdaDestination(this.dataAggregator));
        cdk_nag_1.NagSuppressions.addResourceSuppressions([
            cdk.Stack.of(scope).node.findChild(
            // logicalId for cdk-managed resource:
            // https://github.com/aws/aws-cdk/blob/6a7a24afcc1ebebf71c267b890732a455e865cc8/packages/aws-cdk-lib/aws-s3/lib/notifications-resource/notifications-resource-handler.ts#L39
            'BucketNotificationsHandler050a0587b7544547bf325f094a3db834'),
        ], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Where required, the Control Plane API uses a custom authorizer. It does not use a cognito authorizer.',
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Where required, the Control Plane API uses a custom authorizer. It does not use a cognito authorizer.',
            },
        ], true // applyToChildren = true, so that it applies to the APIGW role created by cdk in the controlPlaneAPI construct
        );
    }
}
exports.FirehoseAggregator = FirehoseAggregator;
_a = JSII_RTTI_SYMBOL_1;
FirehoseAggregator[_a] = { fqn: "@cdklabs/sbt-aws.FirehoseAggregator", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlyZWhvc2UtaW5nZXN0b3ItYWdncmVnYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb250cm9sLXBsYW5lL2luZ2VzdG9yLWFnZ3JlZ2F0b3IvZmlyZWhvc2UtaW5nZXN0b3ItYWdncmVnYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7QUFFdEMsNkJBQTZCO0FBQzdCLCtEQUErRDtBQUMvRCxnRkFBZ0Y7QUFDaEYsa0VBQWtFO0FBQ2xFLG1DQUFtQztBQUNuQyxxREFBcUQ7QUFDckQsaURBQWlEO0FBQ2pELHlDQUF5QztBQUN6Qyx3REFBd0Q7QUFDeEQscUNBQTBDO0FBQzFDLDJDQUF1QztBQUV2Qyx1Q0FBNkM7QUEyQjdDOzs7O0dBSUc7QUFDSCxNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBc0IvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBQSxzQkFBYyxFQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDO1FBRXpDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNqRixVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUM7UUFFSCx5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyx5QkFBeUIsRUFDekI7WUFDRTtnQkFDRSxFQUFFLEVBQUUsaUJBQWlCO2dCQUNyQixNQUFNLEVBQUUsa0NBQWtDO2FBQzNDO1NBQ0YsRUFDRCxJQUFJLENBQUMsK0VBQStFO1NBQ3JGLENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2hFLFVB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aUJBQ1g7YUFDRjtTQUNGLEVBQ0QsSUFBSSxDQUFDLCtFQUErRTtTQUNyRixDQUFDO1FBRUYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUQseUJBQXlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUV6RCx5QkFBeUIsQ0FBQyw0QkFBNEIsQ0FDcEQsSUFBSSxHQUFHLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUMvQyxDQUFDO1FBRUYseUJBQWUsQ0FBQyx1QkFBdUIsQ0FDckM7WUFDRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUztZQUNoQyxzQ0FBc0M7WUFDdEMsNEtBQTRLO1lBQzVLLDREQUE0RCxDQUM3RDtTQUNGLEVBQ0Q7WUFDRTtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0osdUdBQXVHO2FBQzFHO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLHVHQUF1RzthQUMxRztTQUNGLEVBQ0QsSUFBSSxDQUFDLCtHQUErRztTQUNySCxDQUFDO0lBQ0osQ0FBQzs7QUF2SkgsZ0RBd0pDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZmlyZWhvc2UgZnJvbSAnQGF3cy1jZGsvYXdzLWtpbmVzaXNmaXJlaG9zZS1hbHBoYSc7XG5pbXBvcnQgKiBhcyBkZXN0aW5hdGlvbnMgZnJvbSAnQGF3cy1jZGsvYXdzLWtpbmVzaXNmaXJlaG9zZS1kZXN0aW5hdGlvbnMtYWxwaGEnO1xuaW1wb3J0ICogYXMgbGFtYmRhX3B5dGhvbiBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhLXB5dGhvbi1hbHBoYSc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBzM24gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLW5vdGlmaWNhdGlvbnMnO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSAnY2RrLW5hZyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IElEYXRhSW5nZXN0b3JBZ2dyZWdhdG9yIH0gZnJvbSAnLi9pbmdlc3Rvci1hZ2dyZWdhdG9yLWludGVyZmFjZSc7XG5pbXBvcnQgeyBhZGRUZW1wbGF0ZVRhZyB9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuLyoqXG4gKiBFbmNhcHN1bGF0ZXMgdGhlIGxpc3Qgb2YgcHJvcGVydGllcyBmb3IgYSBGaXJlaG9zZUFnZ3JlZ2F0b3IgY29uc3RydWN0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpcmVob3NlQWdncmVnYXRvclByb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBuYW1lIHRvIHVzZSBmb3IgdGhlIHByaW1hcnkga2V5IGNvbHVtbiBmb3IgdGhlIGR5bmFtb0RCIGRhdGFiYXNlLlxuICAgKi9cbiAgcmVhZG9ubHkgcHJpbWFyeUtleUNvbHVtbjogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgSk1FU1BhdGggdG8gZmluZCB0aGUgcHJpbWFyeSBrZXkgdmFsdWUgaW4gdGhlIGluY29taW5nIGRhdGEgc3RyZWFtLlxuICAgKi9cbiAgcmVhZG9ubHkgcHJpbWFyeUtleVBhdGg6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEpNRVNQYXRoIHRvIGZpbmQgdGhlIGtleSB2YWx1ZSBpbiB0aGUgaW5jb21pbmcgZGF0YSBzdHJlYW0gdGhhdCB3aWxsIGJlIGFnZ3JlZ2F0ZWQuXG4gICAqL1xuICByZWFkb25seSBhZ2dyZWdhdGVLZXlQYXRoOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBKTUVTUGF0aCB0byBmaW5kIHRoZSBudW1lcmljIHZhbHVlIG9mIGtleSBpbiB0aGUgaW5jb21pbmcgZGF0YSBzdHJlYW0gdGhhdCB3aWxsIGJlIGFnZ3JlZ2F0ZWQuXG4gICAqL1xuICByZWFkb25seSBhZ2dyZWdhdGVWYWx1ZVBhdGg6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgS2luZXNpcyBGaXJlaG9zZSB0byBhY2NlcHQgaGlnaC12b2x1bWUgZGF0YSwgd2hpY2ggaXQgdGhlbiByb3V0ZXMgdG8gYW4gczMgYnVja2V0LlxuICogVGhlIHMzIGJ1Y2tldCB0cmlnZ2VycyBhIGxhbWJkYSB3aGljaCBwcm9jZXNzZXMgdGhlIGRhdGEgYW5kIHN0b3JlcyBpdCBpbiBhIER5bmFtb0RCIHRhYmxlXG4gKiBjb250YWluaW5nIHRoZSBhZ2dyZWdhdGVkIGRhdGEuXG4gKi9cbmV4cG9ydCBjbGFzcyBGaXJlaG9zZUFnZ3JlZ2F0b3IgZXh0ZW5kcyBDb25zdHJ1Y3QgaW1wbGVtZW50cyBJRGF0YUluZ2VzdG9yQWdncmVnYXRvciB7XG4gIC8qKlxuICAgKiBUaGUgRHluYW1vREIgdGFibGUgY29udGFpbmluZyB0aGUgYWdncmVnYXRlZCBkYXRhLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGRhdGFSZXBvc2l0b3J5OiBkeW5hbW9kYi5JVGFibGU7XG5cbiAgLyoqXG4gICAqIFRoZSBQeXRob24gTGFtYmRhIGZ1bmN0aW9uIHJlc3BvbnNpYmxlIGZvciBhZ2dyZWdhdGluZyB0aGUgcmF3IGRhdGEgY29taW5nIGluXG4gICAqIHZpYSB0aGUgZGF0YUluZ2VzdG9yLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IGRhdGFBZ2dyZWdhdG9yOiBsYW1iZGEuSUZ1bmN0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgRmlyZWhvc2UgRGVsaXZlcnlTdHJlYW0gaW5nZXN0b3IgcmVzcG9uc2libGUgZm9yIGFjY2VwdGluZyB0aGUgaW5jb21pbmcgZGF0YS5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBkYXRhSW5nZXN0b3I6IGZpcmVob3NlLkRlbGl2ZXJ5U3RyZWFtO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgZGF0YUluZ2VzdG9yLiBUaGlzIGlzIHVzZWQgZm9yIHZpc2liaWxpdHkuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZGF0YUluZ2VzdG9yTmFtZTogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBGaXJlaG9zZUFnZ3JlZ2F0b3JQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgYWRkVGVtcGxhdGVUYWcodGhpcywgJ0ZpcmVob3NlQWdncmVnYXRvcicpO1xuXG4gICAgY29uc3Qgc2VydmljZU5hbWUgPSAnRmlyZWhvc2VBZ2dyZWdhdG9yJztcblxuICAgIGNvbnN0IGZpcmVob3NlRGVzdGluYXRpb25CdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdGaXJlaG9zZURlc3RpbmF0aW9uQnVja2V0Jywge1xuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGZpcmVob3NlRGVzdGluYXRpb25CdWNrZXQsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1TMScsXG4gICAgICAgICAgcmVhc29uOiAnU2VydmVyIGFjY2VzcyBsb2dzIG5vdCByZXF1aXJlZC4nLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHBvbGljaWVzIGNyZWF0ZWQgZm9yIHRoZSByb2xlLlxuICAgICk7XG5cbiAgICB0aGlzLmRhdGFJbmdlc3RvciA9IG5ldyBmaXJlaG9zZS5EZWxpdmVyeVN0cmVhbSh0aGlzLCAnRmlyZWhvc2UnLCB7XG4gICAgICBlbmNyeXB0aW9uOiBmaXJlaG9zZS5TdHJlYW1FbmNyeXB0aW9uLkFXU19PV05FRCxcbiAgICAgIGRlc3RpbmF0aW9uczogW25ldyBkZXN0aW5hdGlvbnMuUzNCdWNrZXQoZmlyZWhvc2VEZXN0aW5hdGlvbkJ1Y2tldCldLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kYXRhSW5nZXN0b3JOYW1lID0gdGhpcy5kYXRhSW5nZXN0b3IuZGVsaXZlcnlTdHJlYW1OYW1lO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGhpcy5kYXRhSW5nZXN0b3IsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdTMyBvYmplY3QgcmVzb3VyY2UgbmFtZShzKSBub3Qga25vd24gYmVmb3JlaGFuZC4nLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHBvbGljaWVzIGNyZWF0ZWQgZm9yIHRoZSByb2xlLlxuICAgICk7XG5cbiAgICB0aGlzLmRhdGFSZXBvc2l0b3J5ID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdEYXRhJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IHByb3BzLnByaW1hcnlLZXlDb2x1bW4sIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gaHR0cHM6Ly9kb2NzLnBvd2VydG9vbHMuYXdzLmRldi9sYW1iZGEvcHl0aG9uLzIuMzEuMC8jbGFtYmRhLWxheWVyXG4gICAgY29uc3QgbGFtYmRhUG93ZXJUb29sc0xheWVyQVJOID0gYGFybjphd3M6bGFtYmRhOiR7XG4gICAgICBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uXG4gICAgfTowMTcwMDA4MDE0NDY6bGF5ZXI6QVdTTGFtYmRhUG93ZXJ0b29sc1B5dGhvblYyOjU5YDtcblxuICAgIHRoaXMuZGF0YUFnZ3JlZ2F0b3IgPSBuZXcgbGFtYmRhX3B5dGhvbi5QeXRob25GdW5jdGlvbih0aGlzLCAnRGF0YUFnZ3JlZ2F0b3JMYW1iZGEnLCB7XG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3Jlc291cmNlcy9mdW5jdGlvbnMvZGF0YS1hZ2dyZWdhdG9yJyksXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcbiAgICAgIGluZGV4OiAnaW5kZXgucHknLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU0VSVklDRV9OQU1FOiBzZXJ2aWNlTmFtZSxcbiAgICAgICAgREFUQV9UQUJMRTogdGhpcy5kYXRhUmVwb3NpdG9yeS50YWJsZU5hbWUsXG4gICAgICAgIFBSSU1BUllfS0VZX0NPTFVNTjogcHJvcHMucHJpbWFyeUtleUNvbHVtbixcbiAgICAgICAgUFJJTUFSWV9LRVlfUEFUSDogcHJvcHMucHJpbWFyeUtleVBhdGgsXG4gICAgICAgIEFHR1JFR0FURV9LRVlfUEFUSDogcHJvcHMuYWdncmVnYXRlS2V5UGF0aCxcbiAgICAgICAgQUdHUkVHQVRFX1ZBTFVFX1BBVEg6IHByb3BzLmFnZ3JlZ2F0ZVZhbHVlUGF0aCxcbiAgICAgIH0sXG4gICAgICBsb2dHcm91cDogbmV3IGNkay5hd3NfbG9ncy5Mb2dHcm91cCh0aGlzLCAnRGF0YUFnZ3JlZ2F0b3JMYW1iZGFMb2dHcm91cCcsIHtcbiAgICAgICAgcmV0ZW50aW9uOiBjZGsuYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5GSVZFX0RBWVMsXG4gICAgICB9KSxcbiAgICAgIGxheWVyczogW1xuICAgICAgICBsYW1iZGEuTGF5ZXJWZXJzaW9uLmZyb21MYXllclZlcnNpb25Bcm4odGhpcywgJ0xhbWJkYVBvd2VyVG9vbHMnLCBsYW1iZGFQb3dlclRvb2xzTGF5ZXJBUk4pLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIFt0aGlzLmRhdGFBZ2dyZWdhdG9yLnJvbGUhXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICAnVGhpcyBpcyBSZXNvdXJjZTo6KiBiZWluZyB1c2VkIHRvIG91dHB1dCBsb2dzIGFuZCB4LXJheSB0cmFjZXMgYW5kIG5vdGhpbmcgZWxzZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1Jlc291cmNlOjoqJyxcbiAgICAgICAgICAgICdBY3Rpb246OnMzOkdldEJ1Y2tldConLFxuICAgICAgICAgICAgJ0FjdGlvbjo6czM6R2V0T2JqZWN0KicsXG4gICAgICAgICAgICAnQWN0aW9uOjpzMzpMaXN0KicsXG4gICAgICAgICAgICBgUmVzb3VyY2U6Ojwke2Nkay5TdGFjay5vZih0aGlzKS5nZXRMb2dpY2FsSWQoXG4gICAgICAgICAgICAgIGZpcmVob3NlRGVzdGluYXRpb25CdWNrZXQubm9kZS5kZWZhdWx0Q2hpbGQgYXMgczMuQ2ZuQnVja2V0XG4gICAgICAgICAgICApfS5Bcm4+LypgLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcblxuICAgIHRoaXMuZGF0YVJlcG9zaXRvcnkuZ3JhbnRSZWFkV3JpdGVEYXRhKHRoaXMuZGF0YUFnZ3JlZ2F0b3IpO1xuICAgIGZpcmVob3NlRGVzdGluYXRpb25CdWNrZXQuZ3JhbnRSZWFkKHRoaXMuZGF0YUFnZ3JlZ2F0b3IpO1xuXG4gICAgZmlyZWhvc2VEZXN0aW5hdGlvbkJ1Y2tldC5hZGRPYmplY3RDcmVhdGVkTm90aWZpY2F0aW9uKFxuICAgICAgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbih0aGlzLmRhdGFBZ2dyZWdhdG9yKVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbXG4gICAgICAgIGNkay5TdGFjay5vZihzY29wZSkubm9kZS5maW5kQ2hpbGQoXG4gICAgICAgICAgLy8gbG9naWNhbElkIGZvciBjZGstbWFuYWdlZCByZXNvdXJjZTpcbiAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvYmxvYi82YTdhMjRhZmNjMWViZWJmNzFjMjY3Yjg5MDczMmE0NTVlODY1Y2M4L3BhY2thZ2VzL2F3cy1jZGstbGliL2F3cy1zMy9saWIvbm90aWZpY2F0aW9ucy1yZXNvdXJjZS9ub3RpZmljYXRpb25zLXJlc291cmNlLWhhbmRsZXIudHMjTDM5XG4gICAgICAgICAgJ0J1Y2tldE5vdGlmaWNhdGlvbnNIYW5kbGVyMDUwYTA1ODdiNzU0NDU0N2JmMzI1ZjA5NGEzZGI4MzQnXG4gICAgICAgICksXG4gICAgICBdLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNCcsXG4gICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgJ1doZXJlIHJlcXVpcmVkLCB0aGUgQ29udHJvbCBQbGFuZSBBUEkgdXNlcyBhIGN1c3RvbSBhdXRob3JpemVyLiBJdCBkb2VzIG5vdCB1c2UgYSBjb2duaXRvIGF1dGhvcml6ZXIuJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTUnLFxuICAgICAgICAgIHJlYXNvbjpcbiAgICAgICAgICAgICdXaGVyZSByZXF1aXJlZCwgdGhlIENvbnRyb2wgUGxhbmUgQVBJIHVzZXMgYSBjdXN0b20gYXV0aG9yaXplci4gSXQgZG9lcyBub3QgdXNlIGEgY29nbml0byBhdXRob3JpemVyLicsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gdGhlIEFQSUdXIHJvbGUgY3JlYXRlZCBieSBjZGsgaW4gdGhlIGNvbnRyb2xQbGFuZUFQSSBjb25zdHJ1Y3RcbiAgICApO1xuICB9XG59XG4iXX0=
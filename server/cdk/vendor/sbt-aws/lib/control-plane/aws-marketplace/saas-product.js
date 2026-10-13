"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSMarketplaceSaaSProduct = exports.AWSMarketplaceSaaSPricingModel = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const path = require("path");
const aws_lambda_python_alpha_1 = require("@aws-cdk/aws-lambda-python-alpha");
const cdk = require("aws-cdk-lib");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const s3 = require("aws-cdk-lib/aws-s3");
const sns = require("aws-cdk-lib/aws-sns");
const subscriptions = require("aws-cdk-lib/aws-sns-subscriptions");
const sqs = require("aws-cdk-lib/aws-sqs");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const entitlement_logic_1 = require("./entitlement-logic");
const subscription_logic_1 = require("./subscription-logic");
const utils_1 = require("../../utils");
/**
 * Enum representing the pricing models for an AWS Marketplace SaaS product.
 * @enum {string}
 */
var AWSMarketplaceSaaSPricingModel;
(function (AWSMarketplaceSaaSPricingModel) {
    /** Contracts pricing model */
    AWSMarketplaceSaaSPricingModel["CONTRACTS"] = "contracts";
    /** Subscriptions pricing model */
    AWSMarketplaceSaaSPricingModel["SUBSCRIPTIONS"] = "subscriptions";
    /** Contracts with subscription pricing model */
    AWSMarketplaceSaaSPricingModel["CONTRACTS_WITH_SUBSCRIPTION"] = "contracts_with_subscription";
})(AWSMarketplaceSaaSPricingModel || (exports.AWSMarketplaceSaaSPricingModel = AWSMarketplaceSaaSPricingModel = {}));
/**
 * Construct for creating an AWS Marketplace SaaS product.
 * @class
 */
class AWSMarketplaceSaaSProduct extends constructs_1.Construct {
    /**
     * Creates an instance of the AWSMarketplaceSaaSProduct construct.
     * @param {Construct} scope - The scope in which to define this construct.
     * @param {string} id - The unique identifier for this construct.
     * @param {AWSMarketplaceSaaSProductProps} props - The properties for configuring the AWS Marketplace SaaS product.
     */
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'AWSMarketplaceSaaSProduct');
        const region = cdk.Stack.of(this).region;
        if (cdk.Token.isUnresolved(region) || region != 'us-east-1') {
            // must use us-east-1 as quickstartBucket is located in us-east-1 region.
            throw new Error('Region not specified. Use "env" to specify region. Note that region must be set to us-east-1 in order to use this construct.');
        }
        const quickstartBucket = s3.Bucket.fromBucketName(this, 'CodeBucket', 'aws-quickstart');
        const createEntitlementLogic = props.pricingModel === AWSMarketplaceSaaSPricingModel.CONTRACTS_WITH_SUBSCRIPTION ||
            props.pricingModel === AWSMarketplaceSaaSPricingModel.CONTRACTS;
        const createSubscriptionLogic = props.pricingModel === AWSMarketplaceSaaSPricingModel.CONTRACTS_WITH_SUBSCRIPTION ||
            props.pricingModel === AWSMarketplaceSaaSPricingModel.SUBSCRIPTIONS;
        this.subscribersTable = new dynamodb.Table(this, 'AWSMarketplaceSubscribers', {
            partitionKey: { name: 'customerIdentifier', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            pointInTimeRecovery: true,
        });
        if (createSubscriptionLogic) {
            new subscription_logic_1.SubscriptionLogic(this, 'SubscriptionLogic', {
                productCode: props.productCode,
                assetBucket: quickstartBucket,
            });
        }
        const supportTopicMasterKey = new cdk.aws_kms.Key(this, 'SupportTopicMasterKey', {
            enableKeyRotation: true,
        });
        const supportTopic = new sns.Topic(this, 'SupportSNSTopic', {
            masterKey: supportTopicMasterKey,
        });
        supportTopic.addSubscription(new subscriptions.EmailSubscription(props.marketplaceTechAdminEmail));
        // https://docs.powertools.aws.dev/lambda/python/2.31.0/#lambda-layer
        const lambdaPowerToolsLayerARN = `arn:aws:lambda:${cdk.Stack.of(this).region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`;
        const powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'LambdaPowerTools', lambdaPowerToolsLayerARN);
        const grantOrRevokeAccessFunctionPython = new aws_lambda_python_alpha_1.PythonFunction(this, 'GrantOrRevokeAccessFunctionPython', {
            entry: path.join(__dirname, '../../../resources/aws-marketplace/functions/grant-revoke-access-to-product'),
            runtime: lambda.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'lambda_handler',
            timeout: cdk.Duration.seconds(60),
            layers: [powerToolsLayer],
            environment: {
                SupportSNSArn: supportTopic.topicArn,
            },
            events: [
                new aws_lambda_event_sources_1.DynamoEventSource(this.subscribersTable, {
                    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
                    batchSize: 1,
                }),
            ],
        });
        if (props.eventManager) {
            grantOrRevokeAccessFunctionPython.addEnvironment('EVENTBUS_NAME', props.eventManager.busName);
            grantOrRevokeAccessFunctionPython.addEnvironment('EVENT_SOURCE', props.eventManager.controlPlaneEventSource);
            grantOrRevokeAccessFunctionPython.addEnvironment('OFFBOARDING_DETAIL_TYPE', utils_1.DetailType.OFFBOARDING_REQUEST);
            props.eventManager.grantPutEventsTo(grantOrRevokeAccessFunctionPython);
        }
        const baseRequiredFieldsForRegistration = ['regToken'];
        this.userProvidedRequiredFieldsForRegistration = ['contactEmail'];
        const requiredFields = [
            ...baseRequiredFieldsForRegistration,
            ...this.userProvidedRequiredFieldsForRegistration,
            ...(props.requiredFieldsForRegistration || []),
        ];
        this.userProvidedRequiredFieldsForRegistration.push(...(props.requiredFieldsForRegistration || []));
        const registerNewMarketplaceCustomerPython = new aws_lambda_python_alpha_1.PythonFunction(this, 'RegisterNewMarketplaceCustomerPython', {
            entry: path.join(__dirname, '../../../resources/aws-marketplace/functions/register-new-subscriber'),
            runtime: lambda.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'lambda_handler',
            timeout: cdk.Duration.seconds(60),
            layers: [powerToolsLayer],
            environment: {
                NEW_SUBSCRIBERS_TABLE_NAME: this.subscribersTable.tableName,
                REQUIRED_FIELDS: requiredFields.join(','),
            },
        });
        if (props.eventManager) {
            registerNewMarketplaceCustomerPython.addEnvironment('EVENTBUS_NAME', props.eventManager.busName);
            registerNewMarketplaceCustomerPython.addEnvironment('EVENT_SOURCE', props.eventManager.controlPlaneEventSource);
            registerNewMarketplaceCustomerPython.addEnvironment('ONBOARDING_DETAIL_TYPE', utils_1.DetailType.ONBOARDING_REQUEST);
            props.eventManager.grantPutEventsTo(registerNewMarketplaceCustomerPython);
        }
        let options = {
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
            },
        };
        if (props.disableAPILogging) {
            options.cloudWatchRole = false;
            cdk_nag_1.NagSuppressions.addStackSuppressions(cdk.Stack.of(this), [
                {
                    id: 'AwsSolutions-APIG1',
                    reason: 'Customer has explicitly opted out of logging',
                },
            ]);
        }
        else {
            const registerCustomerAPILogGroup = new aws_logs_1.LogGroup(this, 'RegisterCustomerAPILogGroup', {
                logGroupName: `/aws/vendedlogs/api/${this.node.id}-${this.node.addr}`,
                retention: aws_logs_1.RetentionDays.ONE_WEEK,
            });
            options.cloudWatchRole = true;
            options.deployOptions = {
                accessLogDestination: new apigateway.LogGroupLogDestination(registerCustomerAPILogGroup),
                methodOptions: {
                    '/*/*': {
                        dataTraceEnabled: true,
                        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
                    },
                },
            };
        }
        this.registerCustomerAPI = new apigateway.RestApi(this, 'RegisterCustomerAPI', options);
        this.registerCustomerAPI.addRequestValidator('request-validator', {
            requestValidatorName: 'register-customer-validator',
            validateRequestBody: true,
            validateRequestParameters: true,
        });
        const redirectHandler = new lambda.Function(this, 'RedirectHandler', {
            code: lambda.Code.fromInline(`
exports.redirecthandler = async(event, context, callback) => {

  const redirectUrl = "/?" + event['body'];
  const response = {
      statusCode: 302,
      headers: {
          Location: redirectUrl
      },
  };

  return response;

};`),
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.redirecthandler',
        });
        const redirectResource = this.registerCustomerAPI.root.addResource('redirectmarketplacetoken');
        redirectResource.addMethod('POST', new apigateway.LambdaIntegration(redirectHandler));
        new cdk.CfnOutput(this, 'APIGWMarketplaceFulfillmentURL', {
            value: this.registerCustomerAPI.urlForPath(redirectResource.path),
            description: 'URL to access your landing page',
        });
        const subscriberResource = this.registerCustomerAPI.root.addResource('subscriber');
        subscriberResource.addMethod('POST', new apigateway.LambdaIntegration(registerNewMarketplaceCustomerPython));
        cdk_nag_1.NagSuppressions.addResourceSuppressions([this], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Role used to simplify pushing logs to CloudWatch.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
                ],
            },
        ], true // applyToChildren = true, so that it applies to the APIGW role created by cdk
        );
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(cdk.Stack.of(this), [
            `${this.registerCustomerAPI.root}/OPTIONS/Resource`,
            `${subscriberResource}/OPTIONS/Resource`,
            `${subscriberResource}/POST/Resource`,
            `${redirectResource}/OPTIONS/Resource`,
            `${redirectResource}/POST/Resource`,
        ], [
            {
                id: 'AwsSolutions-APIG4',
                reason: 'Authorization not needed for OPTION method.',
            },
            {
                id: 'AwsSolutions-COG4',
                reason: 'Cognito Authorization not needed for OPTION method.',
            },
        ]);
        const cfnWAF = new cdk.aws_wafv2.CfnWebACL(this, 'WAF', {
            defaultAction: { allow: {} },
            scope: 'REGIONAL',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                sampledRequestsEnabled: true,
                metricName: 'WAF-RegisterCustomerAPI',
            },
            rules: [
                // generateAWSManagedRuleSet('AWSManagedRulesBotControlRuleSet', 0), // enable to block curl requests
                (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesKnownBadInputsRuleSet', 1),
                (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesCommonRuleSet', 2),
                (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesAnonymousIpList', 3),
                (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesAmazonIpReputationList', 4),
                (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesAdminProtectionRuleSet', 5),
                (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesSQLiRuleSet', 6),
            ],
        });
        new cdk.aws_wafv2.CfnWebACLAssociation(this, 'WAFAssociation', {
            webAclArn: cfnWAF.attrArn,
            resourceArn: this.registerCustomerAPI.deploymentStage.stageArn,
        });
        new cdk.CfnOutput(this, 'APIUrl', {
            value: this.registerCustomerAPI.url,
            description: 'API gateway URL to replace baseUrl value in web/script.js',
        });
        if (props.marketplaceSellerEmail) {
            registerNewMarketplaceCustomerPython.addEnvironment('MARKETPLACE_SELLER_EMAIL', props.marketplaceSellerEmail);
        }
        this.subscribersTable.grantWriteData(registerNewMarketplaceCustomerPython);
        registerNewMarketplaceCustomerPython.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'aws-marketplace:GetEntitlements',
                'aws-marketplace:ResolveCustomer',
                'ses:SendEmail',
            ],
            resources: ['*'],
        }));
        if (createEntitlementLogic) {
            new entitlement_logic_1.EntitlementLogic(this, 'EntitlementLogic', {
                assetBucket: quickstartBucket,
                subscribersTable: this.subscribersTable,
                registerNewMarketplaceCustomer: registerNewMarketplaceCustomerPython,
                entitlementSNSTopic: props.entitlementSNSTopic,
            });
        }
        cdk_nag_1.NagSuppressions.addResourceSuppressions([registerNewMarketplaceCustomerPython, redirectHandler], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                ],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        const subscriptionSQSQueueEncryptionKey = new cdk.aws_kms.Key(this, 'SubscriptionSQSQueueEncryptionKey', {
            enableKeyRotation: true,
        });
        const subscriptionSQSQueue = new sqs.Queue(this, 'SubscriptionSQSQueue', {
            encryption: sqs.QueueEncryption.KMS,
            encryptionMasterKey: subscriptionSQSQueueEncryptionKey,
            enforceSSL: true,
            deadLetterQueue: {
                maxReceiveCount: 5,
                queue: new sqs.Queue(this, 'SubscriptionSQSQueueDLQ', {
                    enforceSSL: true,
                    retentionPeriod: cdk.Duration.seconds(3000),
                }),
            },
        });
        const subscriptionSNSTopic = sns.Topic.fromTopicArn(this, 'SubscriptionSNSTopic', props.subscriptionSNSTopic);
        subscriptionSNSTopic.addSubscription(new subscriptions.SqsSubscription(subscriptionSQSQueue));
        const subscriptionSQSHandler = new lambda.Function(this, 'SubscriptionSQSHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'subscription-sqs.SQSHandler',
            code: lambda.Code.fromBucket(quickstartBucket, 'cloudformation-aws-marketplace-saas/9c1e36f06f022c95bcc9129bbacfa195'),
            environment: {
                NewSubscribersTableName: this.subscribersTable.tableName,
                SupportSNSArn: supportTopic.topicArn,
            },
            events: [new aws_lambda_event_sources_1.SqsEventSource(subscriptionSQSQueue, { batchSize: 1 })],
        });
        this.subscribersTable.grantWriteData(subscriptionSQSHandler);
        supportTopicMasterKey.grantEncrypt(subscriptionSQSHandler);
        supportTopic.grantPublish(subscriptionSQSHandler);
        supportTopicMasterKey.grantEncryptDecrypt(grantOrRevokeAccessFunctionPython);
        supportTopic.grantPublish(grantOrRevokeAccessFunctionPython);
        cdk_nag_1.NagSuppressions.addResourceSuppressions([grantOrRevokeAccessFunctionPython, subscriptionSQSHandler], [
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
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        cdk_nag_1.NagSuppressions.addResourceSuppressions([grantOrRevokeAccessFunctionPython], [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Used as part of the policy that allows dynamodb:ListStreams.',
                appliesTo: ['Resource::*'],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
    }
}
exports.AWSMarketplaceSaaSProduct = AWSMarketplaceSaaSProduct;
_a = JSII_RTTI_SYMBOL_1;
AWSMarketplaceSaaSProduct[_a] = { fqn: "@cdklabs/sbt-aws.AWSMarketplaceSaaSProduct", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Fhcy1wcm9kdWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnRyb2wtcGxhbmUvYXdzLW1hcmtldHBsYWNlL3NhYXMtcHJvZHVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7QUFFdEMsNkJBQTZCO0FBQzdCLDhFQUFrRTtBQUNsRSxtQ0FBbUM7QUFDbkMseURBQXlEO0FBQ3pELHFEQUFxRDtBQUNyRCwyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELG1GQUF5RjtBQUN6RixtREFBK0Q7QUFDL0QseUNBQXlDO0FBQ3pDLDJDQUEyQztBQUMzQyxtRUFBbUU7QUFDbkUsMkNBQTJDO0FBQzNDLHFDQUEwQztBQUMxQywyQ0FBdUM7QUFDdkMsMkRBQXVEO0FBQ3ZELDZEQUF5RDtBQUN6RCx1Q0FBbUc7QUFFbkc7OztHQUdHO0FBQ0gsSUFBWSw4QkFTWDtBQVRELFdBQVksOEJBQThCO0lBQ3hDLDhCQUE4QjtJQUM5Qix5REFBdUIsQ0FBQTtJQUV2QixrQ0FBa0M7SUFDbEMsaUVBQStCLENBQUE7SUFFL0IsZ0RBQWdEO0lBQ2hELDZGQUEyRCxDQUFBO0FBQzdELENBQUMsRUFUVyw4QkFBOEIsOENBQTlCLDhCQUE4QixRQVN6QztBQXlDRDs7O0dBR0c7QUFDSCxNQUFhLHlCQUEwQixTQUFRLHNCQUFTO0lBY3REOzs7OztPQUtHO0lBQ0gsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFxQztRQUM3RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUEsc0JBQWMsRUFBQyxJQUFJLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUVsRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDekMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFN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WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQeXRob25GdW5jdGlvbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEtcHl0aG9uLWFscGhhJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBEeW5hbW9FdmVudFNvdXJjZSwgU3FzRXZlbnRTb3VyY2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xuaW1wb3J0IHsgTG9nR3JvdXAsIFJldGVudGlvbkRheXMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zLXN1YnNjcmlwdGlvbnMnO1xuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSAnY2RrLW5hZyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEVudGl0bGVtZW50TG9naWMgfSBmcm9tICcuL2VudGl0bGVtZW50LWxvZ2ljJztcbmltcG9ydCB7IFN1YnNjcmlwdGlvbkxvZ2ljIH0gZnJvbSAnLi9zdWJzY3JpcHRpb24tbG9naWMnO1xuaW1wb3J0IHsgRGV0YWlsVHlwZSwgSUV2ZW50TWFuYWdlciwgYWRkVGVtcGxhdGVUYWcsIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQgfSBmcm9tICcuLi8uLi91dGlscyc7XG5cbi8qKlxuICogRW51bSByZXByZXNlbnRpbmcgdGhlIHByaWNpbmcgbW9kZWxzIGZvciBhbiBBV1MgTWFya2V0cGxhY2UgU2FhUyBwcm9kdWN0LlxuICogQGVudW0ge3N0cmluZ31cbiAqL1xuZXhwb3J0IGVudW0gQVdTTWFya2V0cGxhY2VTYWFTUHJpY2luZ01vZGVsIHtcbiAgLyoqIENvbnRyYWN0cyBwcmljaW5nIG1vZGVsICovXG4gIENPTlRSQUNUUyA9ICdjb250cmFjdHMnLFxuXG4gIC8qKiBTdWJzY3JpcHRpb25zIHByaWNpbmcgbW9kZWwgKi9cbiAgU1VCU0NSSVBUSU9OUyA9ICdzdWJzY3JpcHRpb25zJyxcblxuICAvKiogQ29udHJhY3RzIHdpdGggc3Vic2NyaXB0aW9uIHByaWNpbmcgbW9kZWwgKi9cbiAgQ09OVFJBQ1RTX1dJVEhfU1VCU0NSSVBUSU9OID0gJ2NvbnRyYWN0c193aXRoX3N1YnNjcmlwdGlvbicsXG59XG5cbi8qKlxuICogUHJvcGVydGllcyBmb3IgY29uZmlndXJpbmcgYW4gQVdTIE1hcmtldHBsYWNlIFNhYVMgcHJvZHVjdC5cbiAqIEBpbnRlcmZhY2VcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBBV1NNYXJrZXRwbGFjZVNhYVNQcm9kdWN0UHJvcHMge1xuICAvKiogUHJvZHVjdCBjb2RlIHByb3ZpZGVkIGZyb20gQVdTIE1hcmtldHBsYWNlICovXG4gIHJlYWRvbmx5IHByb2R1Y3RDb2RlOiBzdHJpbmc7XG5cbiAgLyoqIFRoZSBwcmljaW5nIG1vZGVsIGZvciB0aGUgQVdTIE1hcmtldHBsYWNlIFNhYVMgcHJvZHVjdC4gKi9cbiAgcmVhZG9ubHkgcHJpY2luZ01vZGVsOiBBV1NNYXJrZXRwbGFjZVNhYVNQcmljaW5nTW9kZWw7XG5cbiAgLyoqIEVtYWlsIHRvIGJlIG5vdGlmaWVkIG9uIGNoYW5nZXMgcmVxdWlyaW5nIGFjdGlvbiAqL1xuICByZWFkb25seSBtYXJrZXRwbGFjZVRlY2hBZG1pbkVtYWlsOiBzdHJpbmc7XG5cbiAgLyoqIFNlbGxlciBlbWFpbCBhZGRyZXNzLCB2ZXJpZmllZCBpbiBTRVMgYW5kIGluICdQcm9kdWN0aW9uJyBtb2RlICovXG4gIHJlYWRvbmx5IG1hcmtldHBsYWNlU2VsbGVyRW1haWw/OiBzdHJpbmc7XG5cbiAgLyoqIFNOUyB0b3BpYyBBUk4gcHJvdmlkZWQgZnJvbSBBV1MgTWFya2V0cGxhY2UuIE11c3QgZXhpc3QuICovXG4gIHJlYWRvbmx5IGVudGl0bGVtZW50U05TVG9waWM6IHN0cmluZztcblxuICAvKiogU05TIHRvcGljIEFSTiBwcm92aWRlZCBmcm9tIEFXUyBNYXJrZXRwbGFjZS4gTXVzdCBleGlzdC4gKi9cbiAgcmVhZG9ubHkgc3Vic2NyaXB0aW9uU05TVG9waWM6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEV2ZW50TWFuYWdlciBmb3IgdGhlIEFXUyBNYXJrZXRwbGFjZSBTYWFTIHByb2R1Y3QuXG4gICAqIFRoaXMgaXMgdXNlZCB0byBlbmFibGUgaW50ZWdyYXRpb24gd2l0aCBzYnQtYXdzLlxuICAgKi9cbiAgcmVhZG9ubHkgZXZlbnRNYW5hZ2VyPzogSUV2ZW50TWFuYWdlcjtcblxuICAvKiogRmxhZyB0byBkaXNhYmxlIEFQSSBsb2dnaW5nLiAqL1xuICByZWFkb25seSBkaXNhYmxlQVBJTG9nZ2luZz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgcmVxdWlyZWQgZmllbGRzIGZvciByZWdpc3RyYXRpb24uIFRoZSBleGlzdGVuY2Ugb2YgdGhlc2VcbiAgICogZmllbGRzIGlzIGNoZWNrZWQgd2hlbiBhIG5ldyBjdXN0b21lciBpcyByZWdpc3RlcmVkLlxuICAgKi9cbiAgcmVhZG9ubHkgcmVxdWlyZWRGaWVsZHNGb3JSZWdpc3RyYXRpb24/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3QgZm9yIGNyZWF0aW5nIGFuIEFXUyBNYXJrZXRwbGFjZSBTYWFTIHByb2R1Y3QuXG4gKiBAY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIEFXU01hcmtldHBsYWNlU2FhU1Byb2R1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKiogVGhlIEFQSSBHYXRld2F5IFJFU1QgQVBJIGZvciByZWdpc3RlcmluZyBjdXN0b21lcnMuICovXG4gIHJlYWRvbmx5IHJlZ2lzdGVyQ3VzdG9tZXJBUEk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcblxuICAvKiogVGhlIER5bmFtb0RCIHRhYmxlIGZvciBzdG9yaW5nIHN1YnNjcmliZXIgaW5mb3JtYXRpb24uICovXG4gIHJlYWRvbmx5IHN1YnNjcmliZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuXG4gIC8qKlxuICAgKiBUaGUgbGlzdCBvZiByZXF1aXJlZCB1c2VyLXByb3ZpZGVkIGZpZWxkcyBmb3IgcmVnaXN0cmF0aW9uLlxuICAgKiBUaGlzIGNvbnRhaW5zIHRoZSBzZXQgb2YgZmllbGRzIHRoYXQgbXVzdCBiZSBwcm92aWRlZCBieSB0aGUgdXNlclxuICAgKiB3aGVuIHJlZ2lzdGVyaW5nIGEgbmV3IGN1c3RvbWVyLlxuICAgKi9cbiAgcmVhZG9ubHkgdXNlclByb3ZpZGVkUmVxdWlyZWRGaWVsZHNGb3JSZWdpc3RyYXRpb246IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIHRoZSBBV1NNYXJrZXRwbGFjZVNhYVNQcm9kdWN0IGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHtDb25zdHJ1Y3R9IHNjb3BlIC0gVGhlIHNjb3BlIGluIHdoaWNoIHRvIGRlZmluZSB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGlzIGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHtBV1NNYXJrZXRwbGFjZVNhYVNQcm9kdWN0UHJvcHN9IHByb3BzIC0gVGhlIHByb3BlcnRpZXMgZm9yIGNvbmZpZ3VyaW5nIHRoZSBBV1MgTWFya2V0cGxhY2UgU2FhUyBwcm9kdWN0LlxuICAgKi9cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFXU01hcmtldHBsYWNlU2FhU1Byb2R1Y3RQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgYWRkVGVtcGxhdGVUYWcodGhpcywgJ0FXU01hcmtldHBsYWNlU2FhU1Byb2R1Y3QnKTtcblxuICAgIGNvbnN0IHJlZ2lvbiA9IGNkay5TdGFjay5vZih0aGlzKS5yZWdpb247XG4gICAgaWYgKGNkay5Ub2tlbi5pc1VucmVzb2x2ZWQocmVnaW9uKSB8fCByZWdpb24gIT0gJ3VzLWVhc3QtMScpIHtcbiAgICAgIC8vIG11c3QgdXNlIHVzLWVhc3QtMSBhcyBxdWlja3N0YXJ0QnVja2V0IGlzIGxvY2F0ZWQgaW4gdXMtZWFzdC0xIHJlZ2lvbi5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1JlZ2lvbiBub3Qgc3BlY2lmaWVkLiBVc2UgXCJlbnZcIiB0byBzcGVjaWZ5IHJlZ2lvbi4gTm90ZSB0aGF0IHJlZ2lvbiBtdXN0IGJlIHNldCB0byB1cy1lYXN0LTEgaW4gb3JkZXIgdG8gdXNlIHRoaXMgY29uc3RydWN0LidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgcXVpY2tzdGFydEJ1Y2tldCA9IHMzLkJ1Y2tldC5mcm9tQnVja2V0TmFtZSh0aGlzLCAnQ29kZUJ1Y2tldCcsICdhd3MtcXVpY2tzdGFydCcpO1xuXG4gICAgY29uc3QgY3JlYXRlRW50aXRsZW1lbnRMb2dpYyA9XG4gICAgICBwcm9wcy5wcmljaW5nTW9kZWwgPT09IEFXU01hcmtldHBsYWNlU2FhU1ByaWNpbmdNb2RlbC5DT05UUkFDVFNfV0lUSF9TVUJTQ1JJUFRJT04gfHxcbiAgICAgIHByb3BzLnByaWNpbmdNb2RlbCA9PT0gQVdTTWFya2V0cGxhY2VTYWFTUHJpY2luZ01vZGVsLkNPTlRSQUNUUztcblxuICAgIGNvbnN0IGNyZWF0ZVN1YnNjcmlwdGlvbkxvZ2ljID1cbiAgICAgIHByb3BzLnByaWNpbmdNb2RlbCA9PT0gQVdTTWFya2V0cGxhY2VTYWFTUHJpY2luZ01vZGVsLkNPTlRSQUNUU19XSVRIX1NVQlNDUklQVElPTiB8fFxuICAgICAgcHJvcHMucHJpY2luZ01vZGVsID09PSBBV1NNYXJrZXRwbGFjZVNhYVNQcmljaW5nTW9kZWwuU1VCU0NSSVBUSU9OUztcblxuICAgIHRoaXMuc3Vic2NyaWJlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQVdTTWFya2V0cGxhY2VTdWJzY3JpYmVycycsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY3VzdG9tZXJJZGVudGlmaWVyJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgfSk7XG5cbiAgICBpZiAoY3JlYXRlU3Vic2NyaXB0aW9uTG9naWMpIHtcbiAgICAgIG5ldyBTdWJzY3JpcHRpb25Mb2dpYyh0aGlzLCAnU3Vic2NyaXB0aW9uTG9naWMnLCB7XG4gICAgICAgIHByb2R1Y3RDb2RlOiBwcm9wcy5wcm9kdWN0Q29kZSxcbiAgICAgICAgYXNzZXRCdWNrZXQ6IHF1aWNrc3RhcnRCdWNrZXQsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzdXBwb3J0VG9waWNNYXN0ZXJLZXkgPSBuZXcgY2RrLmF3c19rbXMuS2V5KHRoaXMsICdTdXBwb3J0VG9waWNNYXN0ZXJLZXknLCB7XG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcbiAgICB9KTtcbiAgICBjb25zdCBzdXBwb3J0VG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdTdXBwb3J0U05TVG9waWMnLCB7XG4gICAgICBtYXN0ZXJLZXk6IHN1cHBvcnRUb3BpY01hc3RlcktleSxcbiAgICB9KTtcblxuICAgIHN1cHBvcnRUb3BpYy5hZGRTdWJzY3JpcHRpb24oXG4gICAgICBuZXcgc3Vic2NyaXB0aW9ucy5FbWFpbFN1YnNjcmlwdGlvbihwcm9wcy5tYXJrZXRwbGFjZVRlY2hBZG1pbkVtYWlsKVxuICAgICk7XG5cbiAgICAvLyBodHRwczovL2RvY3MucG93ZXJ0b29scy5hd3MuZGV2L2xhbWJkYS9weXRob24vMi4zMS4wLyNsYW1iZGEtbGF5ZXJcbiAgICBjb25zdCBsYW1iZGFQb3dlclRvb2xzTGF5ZXJBUk4gPSBgYXJuOmF3czpsYW1iZGE6JHtcbiAgICAgIGNkay5TdGFjay5vZih0aGlzKS5yZWdpb25cbiAgICB9OjAxNzAwMDgwMTQ0NjpsYXllcjpBV1NMYW1iZGFQb3dlcnRvb2xzUHl0aG9uVjI6NTlgO1xuXG4gICAgY29uc3QgcG93ZXJUb29sc0xheWVyID0gbGFtYmRhLkxheWVyVmVyc2lvbi5mcm9tTGF5ZXJWZXJzaW9uQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdMYW1iZGFQb3dlclRvb2xzJyxcbiAgICAgIGxhbWJkYVBvd2VyVG9vbHNMYXllckFSTlxuICAgICk7XG5cbiAgICBjb25zdCBncmFudE9yUmV2b2tlQWNjZXNzRnVuY3Rpb25QeXRob24gPSBuZXcgUHl0aG9uRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgJ0dyYW50T3JSZXZva2VBY2Nlc3NGdW5jdGlvblB5dGhvbicsXG4gICAgICB7XG4gICAgICAgIGVudHJ5OiBwYXRoLmpvaW4oXG4gICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICcuLi8uLi8uLi9yZXNvdXJjZXMvYXdzLW1hcmtldHBsYWNlL2Z1bmN0aW9ucy9ncmFudC1yZXZva2UtYWNjZXNzLXRvLXByb2R1Y3QnXG4gICAgICAgICksXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgICBpbmRleDogJ2luZGV4LnB5JyxcbiAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9oYW5kbGVyJyxcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgICBsYXllcnM6IFtwb3dlclRvb2xzTGF5ZXJdLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIFN1cHBvcnRTTlNBcm46IHN1cHBvcnRUb3BpYy50b3BpY0FybixcbiAgICAgICAgfSxcbiAgICAgICAgZXZlbnRzOiBbXG4gICAgICAgICAgbmV3IER5bmFtb0V2ZW50U291cmNlKHRoaXMuc3Vic2NyaWJlcnNUYWJsZSwge1xuICAgICAgICAgICAgc3RhcnRpbmdQb3NpdGlvbjogbGFtYmRhLlN0YXJ0aW5nUG9zaXRpb24uVFJJTV9IT1JJWk9OLFxuICAgICAgICAgICAgYmF0Y2hTaXplOiAxLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAocHJvcHMuZXZlbnRNYW5hZ2VyKSB7XG4gICAgICBncmFudE9yUmV2b2tlQWNjZXNzRnVuY3Rpb25QeXRob24uYWRkRW52aXJvbm1lbnQoJ0VWRU5UQlVTX05BTUUnLCBwcm9wcy5ldmVudE1hbmFnZXIuYnVzTmFtZSk7XG4gICAgICBncmFudE9yUmV2b2tlQWNjZXNzRnVuY3Rpb25QeXRob24uYWRkRW52aXJvbm1lbnQoXG4gICAgICAgICdFVkVOVF9TT1VSQ0UnLFxuICAgICAgICBwcm9wcy5ldmVudE1hbmFnZXIuY29udHJvbFBsYW5lRXZlbnRTb3VyY2VcbiAgICAgICk7XG4gICAgICBncmFudE9yUmV2b2tlQWNjZXNzRnVuY3Rpb25QeXRob24uYWRkRW52aXJvbm1lbnQoXG4gICAgICAgICdPRkZCT0FSRElOR19ERVRBSUxfVFlQRScsXG4gICAgICAgIERldGFpbFR5cGUuT0ZGQk9BUkRJTkdfUkVRVUVTVFxuICAgICAgKTtcblxuICAgICAgcHJvcHMuZXZlbnRNYW5hZ2VyLmdyYW50UHV0RXZlbnRzVG8oZ3JhbnRPclJldm9rZUFjY2Vzc0Z1bmN0aW9uUHl0aG9uKTtcbiAgICB9XG5cbiAgICBjb25zdCBiYXNlUmVxdWlyZWRGaWVsZHNGb3JSZWdpc3RyYXRpb24gPSBbJ3JlZ1Rva2VuJ107XG4gICAgdGhpcy51c2VyUHJvdmlkZWRSZXF1aXJlZEZpZWxkc0ZvclJlZ2lzdHJhdGlvbiA9IFsnY29udGFjdEVtYWlsJ107XG4gICAgY29uc3QgcmVxdWlyZWRGaWVsZHMgPSBbXG4gICAgICAuLi5iYXNlUmVxdWlyZWRGaWVsZHNGb3JSZWdpc3RyYXRpb24sXG4gICAgICAuLi50aGlzLnVzZXJQcm92aWRlZFJlcXVpcmVkRmllbGRzRm9yUmVnaXN0cmF0aW9uLFxuICAgICAgLi4uKHByb3BzLnJlcXVpcmVkRmllbGRzRm9yUmVnaXN0cmF0aW9uIHx8IFtdKSxcbiAgICBdO1xuICAgIHRoaXMudXNlclByb3ZpZGVkUmVxdWlyZWRGaWVsZHNGb3JSZWdpc3RyYXRpb24ucHVzaChcbiAgICAgIC4uLihwcm9wcy5yZXF1aXJlZEZpZWxkc0ZvclJlZ2lzdHJhdGlvbiB8fCBbXSlcbiAgICApO1xuXG4gICAgY29uc3QgcmVnaXN0ZXJOZXdNYXJrZXRwbGFjZUN1c3RvbWVyUHl0aG9uID0gbmV3IFB5dGhvbkZ1bmN0aW9uKFxuICAgICAgdGhpcyxcbiAgICAgICdSZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24nLFxuICAgICAge1xuICAgICAgICBlbnRyeTogcGF0aC5qb2luKFxuICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICAnLi4vLi4vLi4vcmVzb3VyY2VzL2F3cy1tYXJrZXRwbGFjZS9mdW5jdGlvbnMvcmVnaXN0ZXItbmV3LXN1YnNjcmliZXInXG4gICAgICAgICksXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgICBpbmRleDogJ2luZGV4LnB5JyxcbiAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9oYW5kbGVyJyxcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgICBsYXllcnM6IFtwb3dlclRvb2xzTGF5ZXJdLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIE5FV19TVUJTQ1JJQkVSU19UQUJMRV9OQU1FOiB0aGlzLnN1YnNjcmliZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICAgIFJFUVVJUkVEX0ZJRUxEUzogcmVxdWlyZWRGaWVsZHMuam9pbignLCcpLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgICBpZiAocHJvcHMuZXZlbnRNYW5hZ2VyKSB7XG4gICAgICByZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24uYWRkRW52aXJvbm1lbnQoXG4gICAgICAgICdFVkVOVEJVU19OQU1FJyxcbiAgICAgICAgcHJvcHMuZXZlbnRNYW5hZ2VyLmJ1c05hbWVcbiAgICAgICk7XG4gICAgICByZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24uYWRkRW52aXJvbm1lbnQoXG4gICAgICAgICdFVkVOVF9TT1VSQ0UnLFxuICAgICAgICBwcm9wcy5ldmVudE1hbmFnZXIuY29udHJvbFBsYW5lRXZlbnRTb3VyY2VcbiAgICAgICk7XG4gICAgICByZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24uYWRkRW52aXJvbm1lbnQoXG4gICAgICAgICdPTkJPQVJESU5HX0RFVEFJTF9UWVBFJyxcbiAgICAgICAgRGV0YWlsVHlwZS5PTkJPQVJESU5HX1JFUVVFU1RcbiAgICAgICk7XG4gICAgICBwcm9wcy5ldmVudE1hbmFnZXIuZ3JhbnRQdXRFdmVudHNUbyhyZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24pO1xuICAgIH1cblxuICAgIGxldCBvcHRpb25zOiBhbnkgPSB7XG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICBpZiAocHJvcHMuZGlzYWJsZUFQSUxvZ2dpbmcpIHtcbiAgICAgIG9wdGlvbnMuY2xvdWRXYXRjaFJvbGUgPSBmYWxzZTtcbiAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRTdGFja1N1cHByZXNzaW9ucyhjZGsuU3RhY2sub2YodGhpcyksIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUFQSUcxJyxcbiAgICAgICAgICByZWFzb246ICdDdXN0b21lciBoYXMgZXhwbGljaXRseSBvcHRlZCBvdXQgb2YgbG9nZ2luZycsXG4gICAgICAgIH0sXG4gICAgICBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVnaXN0ZXJDdXN0b21lckFQSUxvZ0dyb3VwID0gbmV3IExvZ0dyb3VwKHRoaXMsICdSZWdpc3RlckN1c3RvbWVyQVBJTG9nR3JvdXAnLCB7XG4gICAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvdmVuZGVkbG9ncy9hcGkvJHt0aGlzLm5vZGUuaWR9LSR7dGhpcy5ub2RlLmFkZHJ9YCxcbiAgICAgICAgcmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgfSk7XG4gICAgICBvcHRpb25zLmNsb3VkV2F0Y2hSb2xlID0gdHJ1ZTtcbiAgICAgIG9wdGlvbnMuZGVwbG95T3B0aW9ucyA9IHtcbiAgICAgICAgYWNjZXNzTG9nRGVzdGluYXRpb246IG5ldyBhcGlnYXRld2F5LkxvZ0dyb3VwTG9nRGVzdGluYXRpb24ocmVnaXN0ZXJDdXN0b21lckFQSUxvZ0dyb3VwKSxcbiAgICAgICAgbWV0aG9kT3B0aW9uczoge1xuICAgICAgICAgICcvKi8qJzoge1xuICAgICAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuRVJST1IsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5yZWdpc3RlckN1c3RvbWVyQVBJID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnUmVnaXN0ZXJDdXN0b21lckFQSScsIG9wdGlvbnMpO1xuICAgIHRoaXMucmVnaXN0ZXJDdXN0b21lckFQSS5hZGRSZXF1ZXN0VmFsaWRhdG9yKCdyZXF1ZXN0LXZhbGlkYXRvcicsIHtcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3JOYW1lOiAncmVnaXN0ZXItY3VzdG9tZXItdmFsaWRhdG9yJyxcbiAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXG4gICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVkaXJlY3RIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVkaXJlY3RIYW5kbGVyJywge1xuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXG5leHBvcnRzLnJlZGlyZWN0aGFuZGxlciA9IGFzeW5jKGV2ZW50LCBjb250ZXh0LCBjYWxsYmFjaykgPT4ge1xuXG4gIGNvbnN0IHJlZGlyZWN0VXJsID0gXCIvP1wiICsgZXZlbnRbJ2JvZHknXTtcbiAgY29uc3QgcmVzcG9uc2UgPSB7XG4gICAgICBzdGF0dXNDb2RlOiAzMDIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgTG9jYXRpb246IHJlZGlyZWN0VXJsXG4gICAgICB9LFxuICB9O1xuXG4gIHJldHVybiByZXNwb25zZTtcblxufTtgKSxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LnJlZGlyZWN0aGFuZGxlcicsXG4gICAgfSk7XG4gICAgY29uc3QgcmVkaXJlY3RSZXNvdXJjZSA9IHRoaXMucmVnaXN0ZXJDdXN0b21lckFQSS5yb290LmFkZFJlc291cmNlKCdyZWRpcmVjdG1hcmtldHBsYWNldG9rZW4nKTtcbiAgICByZWRpcmVjdFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlZGlyZWN0SGFuZGxlcikpO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBUElHV01hcmtldHBsYWNlRnVsZmlsbG1lbnRVUkwnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZWdpc3RlckN1c3RvbWVyQVBJLnVybEZvclBhdGgocmVkaXJlY3RSZXNvdXJjZS5wYXRoKSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVVJMIHRvIGFjY2VzcyB5b3VyIGxhbmRpbmcgcGFnZScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBzdWJzY3JpYmVyUmVzb3VyY2UgPSB0aGlzLnJlZ2lzdGVyQ3VzdG9tZXJBUEkucm9vdC5hZGRSZXNvdXJjZSgnc3Vic2NyaWJlcicpO1xuICAgIHN1YnNjcmliZXJSZXNvdXJjZS5hZGRNZXRob2QoXG4gICAgICAnUE9TVCcsXG4gICAgICBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24pXG4gICAgKTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIFt0aGlzXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1JvbGUgdXNlZCB0byBzaW1wbGlmeSBwdXNoaW5nIGxvZ3MgdG8gQ2xvdWRXYXRjaC4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BbWF6b25BUElHYXRld2F5UHVzaFRvQ2xvdWRXYXRjaExvZ3MnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gdGhlIEFQSUdXIHJvbGUgY3JlYXRlZCBieSBjZGtcbiAgICApO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgY2RrLlN0YWNrLm9mKHRoaXMpLFxuICAgICAgW1xuICAgICAgICBgJHt0aGlzLnJlZ2lzdGVyQ3VzdG9tZXJBUEkucm9vdH0vT1BUSU9OUy9SZXNvdXJjZWAsXG4gICAgICAgIGAke3N1YnNjcmliZXJSZXNvdXJjZX0vT1BUSU9OUy9SZXNvdXJjZWAsXG4gICAgICAgIGAke3N1YnNjcmliZXJSZXNvdXJjZX0vUE9TVC9SZXNvdXJjZWAsXG4gICAgICAgIGAke3JlZGlyZWN0UmVzb3VyY2V9L09QVElPTlMvUmVzb3VyY2VgLFxuICAgICAgICBgJHtyZWRpcmVjdFJlc291cmNlfS9QT1NUL1Jlc291cmNlYCxcbiAgICAgIF0sXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1BUElHNCcsXG4gICAgICAgICAgcmVhc29uOiAnQXV0aG9yaXphdGlvbiBub3QgbmVlZGVkIGZvciBPUFRJT04gbWV0aG9kLicsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1DT0c0JyxcbiAgICAgICAgICByZWFzb246ICdDb2duaXRvIEF1dGhvcml6YXRpb24gbm90IG5lZWRlZCBmb3IgT1BUSU9OIG1ldGhvZC4nLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgICk7XG5cbiAgICBjb25zdCBjZm5XQUYgPSBuZXcgY2RrLmF3c193YWZ2Mi5DZm5XZWJBQ0wodGhpcywgJ1dBRicsIHtcbiAgICAgIGRlZmF1bHRBY3Rpb246IHsgYWxsb3c6IHt9IH0sXG4gICAgICBzY29wZTogJ1JFR0lPTkFMJyxcbiAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICBtZXRyaWNOYW1lOiAnV0FGLVJlZ2lzdGVyQ3VzdG9tZXJBUEknLFxuICAgICAgfSxcbiAgICAgIHJ1bGVzOiBbXG4gICAgICAgIC8vIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc0JvdENvbnRyb2xSdWxlU2V0JywgMCksIC8vIGVuYWJsZSB0byBibG9jayBjdXJsIHJlcXVlc3RzXG4gICAgICAgIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsIDEpLFxuICAgICAgICBnZW5lcmF0ZUFXU01hbmFnZWRSdWxlU2V0KCdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JywgMiksXG4gICAgICAgIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc0Fub255bW91c0lwTGlzdCcsIDMpLFxuICAgICAgICBnZW5lcmF0ZUFXU01hbmFnZWRSdWxlU2V0KCdBV1NNYW5hZ2VkUnVsZXNBbWF6b25JcFJlcHV0YXRpb25MaXN0JywgNCksXG4gICAgICAgIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc0FkbWluUHJvdGVjdGlvblJ1bGVTZXQnLCA1KSxcbiAgICAgICAgZ2VuZXJhdGVBV1NNYW5hZ2VkUnVsZVNldCgnQVdTTWFuYWdlZFJ1bGVzU1FMaVJ1bGVTZXQnLCA2KSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLmF3c193YWZ2Mi5DZm5XZWJBQ0xBc3NvY2lhdGlvbih0aGlzLCAnV0FGQXNzb2NpYXRpb24nLCB7XG4gICAgICB3ZWJBY2xBcm46IGNmbldBRi5hdHRyQXJuLFxuICAgICAgcmVzb3VyY2VBcm46IHRoaXMucmVnaXN0ZXJDdXN0b21lckFQSS5kZXBsb3ltZW50U3RhZ2Uuc3RhZ2VBcm4sXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQVBJVXJsJywge1xuICAgICAgdmFsdWU6IHRoaXMucmVnaXN0ZXJDdXN0b21lckFQSS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBnYXRld2F5IFVSTCB0byByZXBsYWNlIGJhc2VVcmwgdmFsdWUgaW4gd2ViL3NjcmlwdC5qcycsXG4gICAgfSk7XG5cbiAgICBpZiAocHJvcHMubWFya2V0cGxhY2VTZWxsZXJFbWFpbCkge1xuICAgICAgcmVnaXN0ZXJOZXdNYXJrZXRwbGFjZUN1c3RvbWVyUHl0aG9uLmFkZEVudmlyb25tZW50KFxuICAgICAgICAnTUFSS0VUUExBQ0VfU0VMTEVSX0VNQUlMJyxcbiAgICAgICAgcHJvcHMubWFya2V0cGxhY2VTZWxsZXJFbWFpbFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0aGlzLnN1YnNjcmliZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEocmVnaXN0ZXJOZXdNYXJrZXRwbGFjZUN1c3RvbWVyUHl0aG9uKTtcbiAgICByZWdpc3Rlck5ld01hcmtldHBsYWNlQ3VzdG9tZXJQeXRob24uYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2F3cy1tYXJrZXRwbGFjZTpHZXRFbnRpdGxlbWVudHMnLFxuICAgICAgICAgICdhd3MtbWFya2V0cGxhY2U6UmVzb2x2ZUN1c3RvbWVyJyxcbiAgICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBpZiAoY3JlYXRlRW50aXRsZW1lbnRMb2dpYykge1xuICAgICAgbmV3IEVudGl0bGVtZW50TG9naWModGhpcywgJ0VudGl0bGVtZW50TG9naWMnLCB7XG4gICAgICAgIGFzc2V0QnVja2V0OiBxdWlja3N0YXJ0QnVja2V0LFxuICAgICAgICBzdWJzY3JpYmVyc1RhYmxlOiB0aGlzLnN1YnNjcmliZXJzVGFibGUsXG4gICAgICAgIHJlZ2lzdGVyTmV3TWFya2V0cGxhY2VDdXN0b21lcjogcmVnaXN0ZXJOZXdNYXJrZXRwbGFjZUN1c3RvbWVyUHl0aG9uLFxuICAgICAgICBlbnRpdGxlbWVudFNOU1RvcGljOiBwcm9wcy5lbnRpdGxlbWVudFNOU1RvcGljLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgW3JlZ2lzdGVyTmV3TWFya2V0cGxhY2VDdXN0b21lclB5dGhvbiwgcmVkaXJlY3RIYW5kbGVyXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcblxuICAgIGNvbnN0IHN1YnNjcmlwdGlvblNRU1F1ZXVlRW5jcnlwdGlvbktleSA9IG5ldyBjZGsuYXdzX2ttcy5LZXkoXG4gICAgICB0aGlzLFxuICAgICAgJ1N1YnNjcmlwdGlvblNRU1F1ZXVlRW5jcnlwdGlvbktleScsXG4gICAgICB7XG4gICAgICAgIGVuYWJsZUtleVJvdGF0aW9uOiB0cnVlLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBzdWJzY3JpcHRpb25TUVNRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ1N1YnNjcmlwdGlvblNRU1F1ZXVlJywge1xuICAgICAgZW5jcnlwdGlvbjogc3FzLlF1ZXVlRW5jcnlwdGlvbi5LTVMsXG4gICAgICBlbmNyeXB0aW9uTWFzdGVyS2V5OiBzdWJzY3JpcHRpb25TUVNRdWV1ZUVuY3J5cHRpb25LZXksXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogNSxcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUodGhpcywgJ1N1YnNjcmlwdGlvblNRU1F1ZXVlRExRJywge1xuICAgICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDAwKSxcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uU05TVG9waWMgPSBzbnMuVG9waWMuZnJvbVRvcGljQXJuKFxuICAgICAgdGhpcyxcbiAgICAgICdTdWJzY3JpcHRpb25TTlNUb3BpYycsXG4gICAgICBwcm9wcy5zdWJzY3JpcHRpb25TTlNUb3BpY1xuICAgICk7XG4gICAgc3Vic2NyaXB0aW9uU05TVG9waWMuYWRkU3Vic2NyaXB0aW9uKG5ldyBzdWJzY3JpcHRpb25zLlNxc1N1YnNjcmlwdGlvbihzdWJzY3JpcHRpb25TUVNRdWV1ZSkpO1xuXG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uU1FTSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1N1YnNjcmlwdGlvblNRU0hhbmRsZXInLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdzdWJzY3JpcHRpb24tc3FzLlNRU0hhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUJ1Y2tldChcbiAgICAgICAgcXVpY2tzdGFydEJ1Y2tldCxcbiAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uLWF3cy1tYXJrZXRwbGFjZS1zYWFzLzljMWUzNmYwNmYwMjJjOTViY2M5MTI5YmJhY2ZhMTk1J1xuICAgICAgKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIE5ld1N1YnNjcmliZXJzVGFibGVOYW1lOiB0aGlzLnN1YnNjcmliZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBTdXBwb3J0U05TQXJuOiBzdXBwb3J0VG9waWMudG9waWNBcm4sXG4gICAgICB9LFxuICAgICAgZXZlbnRzOiBbbmV3IFNxc0V2ZW50U291cmNlKHN1YnNjcmlwdGlvblNRU1F1ZXVlLCB7IGJhdGNoU2l6ZTogMSB9KV0sXG4gICAgfSk7XG5cbiAgICB0aGlzLnN1YnNjcmliZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEoc3Vic2NyaXB0aW9uU1FTSGFuZGxlcik7XG4gICAgc3VwcG9ydFRvcGljTWFzdGVyS2V5LmdyYW50RW5jcnlwdChzdWJzY3JpcHRpb25TUVNIYW5kbGVyKTtcbiAgICBzdXBwb3J0VG9waWMuZ3JhbnRQdWJsaXNoKHN1YnNjcmlwdGlvblNRU0hhbmRsZXIpO1xuXG4gICAgc3VwcG9ydFRvcGljTWFzdGVyS2V5LmdyYW50RW5jcnlwdERlY3J5cHQoZ3JhbnRPclJldm9rZUFjY2Vzc0Z1bmN0aW9uUHl0aG9uKTtcbiAgICBzdXBwb3J0VG9waWMuZ3JhbnRQdWJsaXNoKGdyYW50T3JSZXZva2VBY2Nlc3NGdW5jdGlvblB5dGhvbik7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbZ3JhbnRPclJldm9rZUFjY2Vzc0Z1bmN0aW9uUHl0aG9uLCBzdWJzY3JpcHRpb25TUVNIYW5kbGVyXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1MMScsXG4gICAgICAgICAgcmVhc29uOiAnTk9ERUpTIDE4IGlzIHRoZSB2ZXJzaW9uIHVzZWQgaW4gdGhlIG9mZmljaWFsIHF1aWNrc3RhcnQgQ0ZOIHRlbXBsYXRlLicsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdJbmRleCBuYW1lKHMpIG5vdCBrbm93biBiZWZvcmVoYW5kLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICBgUmVzb3VyY2U6OjxNYXJrZXRwbGFjZUFXU01hcmtldHBsYWNlTWV0ZXJpbmdSZWNvcmRzM0IwRjlEOTQuQXJuPi9pbmRleC8qYCxcbiAgICAgICAgICAgIGBBY3Rpb246OmttczpSZUVuY3J5cHQqYCxcbiAgICAgICAgICAgIGBBY3Rpb246OmttczpHZW5lcmF0ZURhdGFLZXkqYCxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHBvbGljaWVzIGNyZWF0ZWQgZm9yIHRoZSByb2xlLlxuICAgICk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgW2dyYW50T3JSZXZva2VBY2Nlc3NGdW5jdGlvblB5dGhvbl0sXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdVc2VkIGFzIHBhcnQgb2YgdGhlIHBvbGljeSB0aGF0IGFsbG93cyBkeW5hbW9kYjpMaXN0U3RyZWFtcy4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogWydSZXNvdXJjZTo6KiddLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHBvbGljaWVzIGNyZWF0ZWQgZm9yIHRoZSByb2xlLlxuICAgICk7XG4gIH1cbn1cbiJdfQ==
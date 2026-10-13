"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantManagementLambda = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const path = require("path");
const aws_lambda_python_alpha_1 = require("@aws-cdk/aws-lambda-python-alpha");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
Represents the Tenant Management Lambda construct.
@class TenantManagementLambda
@extends {Construct}
@property {Function} tenantManagementFunc - The Tenant Management Lambda function.
@param {Construct} scope - The scope in which this construct is defined.
@param {string} id - The construct's identifier.
@param {TenantManagementLambdaProps} props - The properties required for the Tenant Management Lambda.
*/
class TenantManagementLambda extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        /**
         * Creates an IAM role for the Tenant Management Lambda function.
         * The role is granted read and write access to the Tenant Details table,
         * and the ability to put events to the Event Manager.
         * The role is also assigned the AWSLambdaBasicExecutionRole,
         * CloudWatchLambdaInsightsExecutionRolePolicy, and AWSXrayWriteOnlyAccess
         * managed policies.
         */
        const tenantManagementExecRole = new aws_iam_1.Role(this, 'tenantManagementExecRole', {
            assumedBy: new aws_iam_1.ServicePrincipal('lambda.amazonaws.com'),
        });
        props.table.tenantDetails.grantReadWriteData(tenantManagementExecRole);
        props.eventManager.grantPutEventsTo(tenantManagementExecRole);
        tenantManagementExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
        tenantManagementExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLambdaInsightsExecutionRolePolicy'));
        tenantManagementExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'));
        cdk_nag_1.NagSuppressions.addResourceSuppressions(tenantManagementExecRole, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Index name(s) not known beforehand.',
                appliesTo: [
                    `Resource::<ControlPlanetenantManagementServicvestenantManagementTableTenantDetails974E95B8.Arn>/index/*`,
                ],
            },
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole, CloudWatchLambdaInsightsExecutionRolePolicy, and AWSXrayWriteOnlyAccess.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy',
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/AWSXrayWriteOnlyAccess',
                ],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        // https://docs.powertools.aws.dev/lambda/python/2.31.0/#lambda-layer
        const lambdaPowerToolsLayerARN = `arn:aws:lambda:${aws_cdk_lib_1.Stack.of(this).region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`;
        /**
         * Creates the Tenant Management Lambda function.
         * The function is configured with the necessary environment variables,
         * the Tenant Management execution role, and the AWS Lambda Powertools layer.
         */
        const tenantManagementFunc = new aws_lambda_python_alpha_1.PythonFunction(this, 'TenantManagementServices', {
            entry: path.join(__dirname, '../../../resources/functions/tenant-management'),
            runtime: aws_lambda_1.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'lambda_handler',
            timeout: aws_cdk_lib_1.Duration.seconds(60),
            role: tenantManagementExecRole,
            layers: [
                aws_lambda_1.LayerVersion.fromLayerVersionArn(this, 'LambdaPowerTools', lambdaPowerToolsLayerARN),
            ],
            environment: {
                EVENTBUS_NAME: props.eventManager.busName,
                EVENT_SOURCE: props.eventManager.controlPlaneEventSource,
                TENANT_DETAILS_TABLE: props.table.tenantDetails.tableName,
                ONBOARDING_DETAIL_TYPE: utils_1.DetailType.ONBOARDING_REQUEST,
                OFFBOARDING_DETAIL_TYPE: utils_1.DetailType.OFFBOARDING_REQUEST,
                ACTIVATE_DETAIL_TYPE: utils_1.DetailType.ACTIVATE_REQUEST,
                DEACTIVATE_DETAIL_TYPE: utils_1.DetailType.DEACTIVATE_SUCCESS,
            },
        });
        this.tenantManagementFunc = tenantManagementFunc;
    }
}
exports.TenantManagementLambda = TenantManagementLambda;
_a = JSII_RTTI_SYMBOL_1;
TenantManagementLambda[_a] = { fqn: "@cdklabs/sbt-aws.TenantManagementLambda", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LW1hbmFnZW1lbnQtZnVuY3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udHJvbC1wbGFuZS90ZW5hbnQtbWFuYWdlbWVudC90ZW5hbnQtbWFuYWdlbWVudC1mdW5jcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7QUFFdEMsNkJBQTZCO0FBQzdCLDhFQUFrRTtBQUNsRSw2Q0FBOEM7QUFDOUMsaURBQTRFO0FBQzVFLHVEQUF5RTtBQUN6RSxxQ0FBMEM7QUFDMUMsMkNBQXVDO0FBRXZDLHVDQUF3RDtBQVl4RDs7Ozs7Ozs7RUFRRTtBQUNGLE1BQWEsc0JBQXVCLFNBQVEsc0JBQVM7SUFHbkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQztRQUMxRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCOzs7Ozs7O1dBT0c7UUFDSCxNQUFNLHdCQUF3QixHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUMxRSxTQUFTLEVBQUUsSUFBSSwwQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztTQUN4RCxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3ZFLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUU5RCx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FDdkMsdUJBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQyxDQUNuRixDQUFDO1FBQ0Ysd0JBQXdCLENBQUMsZ0JBQWdCLENBQ3ZDLHVCQUFhLENBQUMsd0JBQXdCLENBQUMsNkNBQTZDLENBQUMsQ0FDdEYsQ0FBQztRQUNGLHdCQUF3QixDQUFDLGdCQUFnQixDQUN2Qyx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHdCQUF3QixDQUFDLENBQ2pFLENBQUM7UUFFRix5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyx3QkFBd0IsRUFDeEI7WUFDRTtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUscUNBQXFDO2dCQUM3QyxTQUFTLEVBQUU7b0JBQ1QseUdBQXlHO2lCQUMxRzthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLHlIQUF5SDtnQkFDM0gsU0FBUyxFQUFFO29CQUNULHVGQUF1RjtvQkFDdkYsMEZBQTBGO29CQUMxRixxRUFBcUU7aUJBQ3RFO2FBQ0Y7U0FDRixFQUNELElBQUksQ0FBQywrRUFBK0U7U0FDckYsQ0FBQztRQUVGLHFFQUFxRTtRQUNyRSxNQUFNLHdCQUF3QixHQUFHLGtCQUMvQixtQkFBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUNqQixvREFBb0QsQ0FBQztRQUVyRDs7OztXQUlHO1FBQ0gsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLHdDQUFjLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2hGLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxnREFBZ0QsQ0FBQztZQUM3RSxPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLEtBQUssRUFBRSxVQUFVO1lBQ2pCLE9BQU8sRUFBRSxnQkFBZ0I7WUFDekIsT0FBTyxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3QixJQUFJLEVBQUUsd0JBQXdCO1lBQzlCLE1BQU0sRUFBRTtnQkFDTix5QkFBWSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSx3QkFBd0IsQ0FBQzthQUNyRjtZQUNELFdBQVcsRUFBRTtnQkFDWCxhQUFhLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxPQUFPO2dCQUN6QyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyx1QkFBdUI7Z0JBQ3hELG9CQUFvQixFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVM7Z0JBQ3pELHNCQUFzQixFQUFFLGtCQUFVLENBQUMsa0JBQWtCO2dCQUNyRCx1QkFBdUIsRUFBRSxrQkFBVSxDQUFDLG1CQUFtQjtnQkFDdkQsb0JBQW9CLEVBQUUsa0JBQVUsQ0FBQyxnQkFBZ0I7Z0JBQ2pELHNCQUFzQixFQUFFLGtCQUFVLENBQUMsa0JBQWtCO2FBQ3REO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO0lBQ25ELENBQUM7O0FBdkZILHdEQXdGQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcblxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFB5dGhvbkZ1bmN0aW9uIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWxhbWJkYS1weXRob24tYWxwaGEnO1xuaW1wb3J0IHsgRHVyYXRpb24sIFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgTWFuYWdlZFBvbGljeSwgUm9sZSwgU2VydmljZVByaW5jaXBhbCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgRnVuY3Rpb24sIExheWVyVmVyc2lvbiwgUnVudGltZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSAnY2RrLW5hZyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFRlbmFudE1hbmFnZW1lbnRUYWJsZSB9IGZyb20gJy4vdGVuYW50LW1hbmFnZW1lbnQudGFibGUnO1xuaW1wb3J0IHsgRGV0YWlsVHlwZSwgSUV2ZW50TWFuYWdlciB9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuLyoqXG5SZXByZXNlbnRzIHRoZSBwcm9wZXJ0aWVzIHJlcXVpcmVkIGZvciB0aGUgVGVuYW50IE1hbmFnZW1lbnQgTGFtYmRhIGZ1bmN0aW9uLlxuQGludGVyZmFjZSBUZW5hbnRNYW5hZ2VtZW50TGFtYmRhUHJvcHNcbkBwcm9wZXJ0eSB7VGVuYW50TWFuYWdlbWVudFRhYmxlfSB0YWJsZSAtIFRoZSB0YWJsZSB1c2VkIGZvciBUZW5hbnQgTWFuYWdlbWVudC5cbkBwcm9wZXJ0eSB7SUV2ZW50TWFuYWdlcn0gZXZlbnRNYW5hZ2VyIC0gVGhlIGV2ZW50IG1hbmFnZXIgdXNlZCBmb3IgaGFuZGxpbmcgZXZlbnRzIGluIFRlbmFudCBNYW5hZ2VtZW50LiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW5hbnRNYW5hZ2VtZW50TGFtYmRhUHJvcHMge1xuICByZWFkb25seSB0YWJsZTogVGVuYW50TWFuYWdlbWVudFRhYmxlO1xuICByZWFkb25seSBldmVudE1hbmFnZXI6IElFdmVudE1hbmFnZXI7XG59XG5cbi8qKlxuUmVwcmVzZW50cyB0aGUgVGVuYW50IE1hbmFnZW1lbnQgTGFtYmRhIGNvbnN0cnVjdC5cbkBjbGFzcyBUZW5hbnRNYW5hZ2VtZW50TGFtYmRhXG5AZXh0ZW5kcyB7Q29uc3RydWN0fVxuQHByb3BlcnR5IHtGdW5jdGlvbn0gdGVuYW50TWFuYWdlbWVudEZ1bmMgLSBUaGUgVGVuYW50IE1hbmFnZW1lbnQgTGFtYmRhIGZ1bmN0aW9uLlxuQHBhcmFtIHtDb25zdHJ1Y3R9IHNjb3BlIC0gVGhlIHNjb3BlIGluIHdoaWNoIHRoaXMgY29uc3RydWN0IGlzIGRlZmluZWQuXG5AcGFyYW0ge3N0cmluZ30gaWQgLSBUaGUgY29uc3RydWN0J3MgaWRlbnRpZmllci5cbkBwYXJhbSB7VGVuYW50TWFuYWdlbWVudExhbWJkYVByb3BzfSBwcm9wcyAtIFRoZSBwcm9wZXJ0aWVzIHJlcXVpcmVkIGZvciB0aGUgVGVuYW50IE1hbmFnZW1lbnQgTGFtYmRhLlxuKi9cbmV4cG9ydCBjbGFzcyBUZW5hbnRNYW5hZ2VtZW50TGFtYmRhIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgdGVuYW50TWFuYWdlbWVudEZ1bmM6IEZ1bmN0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBUZW5hbnRNYW5hZ2VtZW50TGFtYmRhUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBJQU0gcm9sZSBmb3IgdGhlIFRlbmFudCBNYW5hZ2VtZW50IExhbWJkYSBmdW5jdGlvbi5cbiAgICAgKiBUaGUgcm9sZSBpcyBncmFudGVkIHJlYWQgYW5kIHdyaXRlIGFjY2VzcyB0byB0aGUgVGVuYW50IERldGFpbHMgdGFibGUsXG4gICAgICogYW5kIHRoZSBhYmlsaXR5IHRvIHB1dCBldmVudHMgdG8gdGhlIEV2ZW50IE1hbmFnZXIuXG4gICAgICogVGhlIHJvbGUgaXMgYWxzbyBhc3NpZ25lZCB0aGUgQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlLFxuICAgICAqIENsb3VkV2F0Y2hMYW1iZGFJbnNpZ2h0c0V4ZWN1dGlvblJvbGVQb2xpY3ksIGFuZCBBV1NYcmF5V3JpdGVPbmx5QWNjZXNzXG4gICAgICogbWFuYWdlZCBwb2xpY2llcy5cbiAgICAgKi9cbiAgICBjb25zdCB0ZW5hbnRNYW5hZ2VtZW50RXhlY1JvbGUgPSBuZXcgUm9sZSh0aGlzLCAndGVuYW50TWFuYWdlbWVudEV4ZWNSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIHByb3BzLnRhYmxlLnRlbmFudERldGFpbHMuZ3JhbnRSZWFkV3JpdGVEYXRhKHRlbmFudE1hbmFnZW1lbnRFeGVjUm9sZSk7XG4gICAgcHJvcHMuZXZlbnRNYW5hZ2VyLmdyYW50UHV0RXZlbnRzVG8odGVuYW50TWFuYWdlbWVudEV4ZWNSb2xlKTtcblxuICAgIHRlbmFudE1hbmFnZW1lbnRFeGVjUm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKVxuICAgICk7XG4gICAgdGVuYW50TWFuYWdlbWVudEV4ZWNSb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICBNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQ2xvdWRXYXRjaExhbWJkYUluc2lnaHRzRXhlY3V0aW9uUm9sZVBvbGljeScpXG4gICAgKTtcbiAgICB0ZW5hbnRNYW5hZ2VtZW50RXhlY1JvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBV1NYcmF5V3JpdGVPbmx5QWNjZXNzJylcbiAgICApO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGVuYW50TWFuYWdlbWVudEV4ZWNSb2xlLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOiAnSW5kZXggbmFtZShzKSBub3Qga25vd24gYmVmb3JlaGFuZC4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgYFJlc291cmNlOjo8Q29udHJvbFBsYW5ldGVuYW50TWFuYWdlbWVudFNlcnZpY3Zlc3RlbmFudE1hbmFnZW1lbnRUYWJsZVRlbmFudERldGFpbHM5NzRFOTVCOC5Bcm4+L2luZGV4LypgLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU00JyxcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICAnU3VwcHJlc3MgdXNhZ2Ugb2YgQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlLCBDbG91ZFdhdGNoTGFtYmRhSW5zaWdodHNFeGVjdXRpb25Sb2xlUG9saWN5LCBhbmQgQVdTWHJheVdyaXRlT25seUFjY2Vzcy4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L0Nsb3VkV2F0Y2hMYW1iZGFJbnNpZ2h0c0V4ZWN1dGlvblJvbGVQb2xpY3knLFxuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L0FXU1hyYXlXcml0ZU9ubHlBY2Nlc3MnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcblxuICAgIC8vIGh0dHBzOi8vZG9jcy5wb3dlcnRvb2xzLmF3cy5kZXYvbGFtYmRhL3B5dGhvbi8yLjMxLjAvI2xhbWJkYS1sYXllclxuICAgIGNvbnN0IGxhbWJkYVBvd2VyVG9vbHNMYXllckFSTiA9IGBhcm46YXdzOmxhbWJkYToke1xuICAgICAgU3RhY2sub2YodGhpcykucmVnaW9uXG4gICAgfTowMTcwMDA4MDE0NDY6bGF5ZXI6QVdTTGFtYmRhUG93ZXJ0b29sc1B5dGhvblYyOjU5YDtcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgdGhlIFRlbmFudCBNYW5hZ2VtZW50IExhbWJkYSBmdW5jdGlvbi5cbiAgICAgKiBUaGUgZnVuY3Rpb24gaXMgY29uZmlndXJlZCB3aXRoIHRoZSBuZWNlc3NhcnkgZW52aXJvbm1lbnQgdmFyaWFibGVzLFxuICAgICAqIHRoZSBUZW5hbnQgTWFuYWdlbWVudCBleGVjdXRpb24gcm9sZSwgYW5kIHRoZSBBV1MgTGFtYmRhIFBvd2VydG9vbHMgbGF5ZXIuXG4gICAgICovXG4gICAgY29uc3QgdGVuYW50TWFuYWdlbWVudEZ1bmMgPSBuZXcgUHl0aG9uRnVuY3Rpb24odGhpcywgJ1RlbmFudE1hbmFnZW1lbnRTZXJ2aWNlcycsIHtcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vcmVzb3VyY2VzL2Z1bmN0aW9ucy90ZW5hbnQtbWFuYWdlbWVudCcpLFxuICAgICAgcnVudGltZTogUnVudGltZS5QWVRIT05fM18xMixcbiAgICAgIGluZGV4OiAnaW5kZXgucHknLFxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9oYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgcm9sZTogdGVuYW50TWFuYWdlbWVudEV4ZWNSb2xlLFxuICAgICAgbGF5ZXJzOiBbXG4gICAgICAgIExheWVyVmVyc2lvbi5mcm9tTGF5ZXJWZXJzaW9uQXJuKHRoaXMsICdMYW1iZGFQb3dlclRvb2xzJywgbGFtYmRhUG93ZXJUb29sc0xheWVyQVJOKSxcbiAgICAgIF0sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBFVkVOVEJVU19OQU1FOiBwcm9wcy5ldmVudE1hbmFnZXIuYnVzTmFtZSxcbiAgICAgICAgRVZFTlRfU09VUkNFOiBwcm9wcy5ldmVudE1hbmFnZXIuY29udHJvbFBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICAgIFRFTkFOVF9ERVRBSUxTX1RBQkxFOiBwcm9wcy50YWJsZS50ZW5hbnREZXRhaWxzLnRhYmxlTmFtZSxcbiAgICAgICAgT05CT0FSRElOR19ERVRBSUxfVFlQRTogRGV0YWlsVHlwZS5PTkJPQVJESU5HX1JFUVVFU1QsXG4gICAgICAgIE9GRkJPQVJESU5HX0RFVEFJTF9UWVBFOiBEZXRhaWxUeXBlLk9GRkJPQVJESU5HX1JFUVVFU1QsXG4gICAgICAgIEFDVElWQVRFX0RFVEFJTF9UWVBFOiBEZXRhaWxUeXBlLkFDVElWQVRFX1JFUVVFU1QsXG4gICAgICAgIERFQUNUSVZBVEVfREVUQUlMX1RZUEU6IERldGFpbFR5cGUuREVBQ1RJVkFURV9TVUNDRVNTLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMudGVuYW50TWFuYWdlbWVudEZ1bmMgPSB0ZW5hbnRNYW5hZ2VtZW50RnVuYztcbiAgfVxufVxuIl19
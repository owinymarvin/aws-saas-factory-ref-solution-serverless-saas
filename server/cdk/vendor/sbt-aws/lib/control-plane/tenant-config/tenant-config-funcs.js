"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantConfigLambdas = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const path = require("path");
const lambda_python = require("@aws-cdk/aws-lambda-python-alpha");
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
 * Represents a set of Lambda functions for managing tenant configurations.
 *
 * @class TenantConfigLambdas
 * @extends Construct
 */
class TenantConfigLambdas extends constructs_1.Construct {
    /**
     * Constructs a new instance of the TenantConfigLambdas.
     *
     * @param {Construct} scope - The parent construct.
     * @param {string} id - The ID of the construct.
     * @param {TenantConfigLambdasProps} props - The properties required to initialize the TenantConfigLambdas.
     */
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'TenantConfigService');
        // https://docs.powertools.aws.dev/lambda/python/2.31.0/#lambda-layer
        const lambdaPowerToolsLayerARN = `arn:aws:lambda:${cdk.Stack.of(this).region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`;
        this.tenantConfigFunction = new lambda_python.PythonFunction(this, 'TenantConfigServiceLambda', {
            entry: path.join(__dirname, '../../../resources/functions/tenant-config/'),
            runtime: lambda.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'handler',
            tracing: lambda.Tracing.ACTIVE,
            environment: {
                TENANT_DETAILS_TABLE: props.tenantDetails.tableName,
                TENANT_CONFIG_INDEX_NAME: props.tenantConfigIndexName,
                TENANT_NAME_COLUMN: props.tenantDetailsTenantNameColumn,
                TENANT_CONFIG_COLUMN: props.tenantDetailsTenantConfigColumn,
            },
            logGroup: new cdk.aws_logs.LogGroup(this, 'BillingIngestorLogGroup', {
                retention: cdk.aws_logs.RetentionDays.FIVE_DAYS,
            }),
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(this, 'LambdaPowerTools', lambdaPowerToolsLayerARN),
            ],
        });
        props.tenantDetails.grantReadData(this.tenantConfigFunction);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.tenantConfigFunction.role, [
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
                appliesTo: ['Resource::*'],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Index name(s) not known beforehand.',
                appliesTo: [
                    `Resource::<ControlPlanetenantManagementServicvestenantManagementTableTenantDetails974E95B8.Arn>/index/*`,
                ],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
    }
}
exports.TenantConfigLambdas = TenantConfigLambdas;
_a = JSII_RTTI_SYMBOL_1;
TenantConfigLambdas[_a] = { fqn: "@cdklabs/sbt-aws.TenantConfigLambdas", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LWNvbmZpZy1mdW5jcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb250cm9sLXBsYW5lL3RlbmFudC1jb25maWcvdGVuYW50LWNvbmZpZy1mdW5jcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7QUFFdEMsNkJBQTZCO0FBQzdCLGtFQUFrRTtBQUNsRSxtQ0FBbUM7QUFFbkMsaURBQWlEO0FBQ2pELHFDQUEwQztBQUMxQywyQ0FBdUM7QUFDdkMsdUNBQTZDO0FBa0I3Qzs7Ozs7R0FLRztBQUNILE1BQWEsbUJBQW9CLFNBQVEsc0JBQVM7SUFRaEQ7Ozs7OztPQU1HO0lBQ0gsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUEsc0JBQWMsRUFBQyxJQUFJLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUU1QyxxRUFBcUU7UUFDckUsTUFBTSx3QkFBd0IsR0FBRyxrQkFDL0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFDckIsb0RBQW9ELENBQUM7UUFFckQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksYUFBYSxDQUFDLGNBQWMsQ0FDMUQsSUFBSSxFQUNKLDJCQUEyQixFQUMzQjtZQUNFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSw2Q0FBNkMsQ0FBQztZQUMxRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEtBQUssRUFBRSxVQUFVO1lBQ2pCLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU07WUFDOUIsV0FBVyxFQUFFO2dCQUNYLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUztnQkFDbkQsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLHFCQUFxQjtnQkFDckQsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLDZCQUE2QjtnQkFDdkQsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLCtCQUErQjthQUM1RDtZQUNELFFBQVEsRUFBRSxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtnQkFDbkUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFNBQVM7YUFDaEQsQ0FBQztZQUNGLE1BQU0sRUFBRTtnQkFDTixNQUFNLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUNyQyxJQUFJLEVBQ0osa0JBQWtCLEVBQ2xCLHdCQUF3QixDQUN6QjthQUNGO1NBQ0YsQ0FDRixDQUFDO1FBRUYsS0FBSyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFN0QseUJBQWUsQ0FBQyx1QkFBdUIsQ0FDckMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUssRUFDL0I7WUFDRTtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUsZ0RBQWdEO2dCQUN4RCxTQUFTLEVBQUU7b0JBQ1QsdUZBQXVGO2lCQUN4RjthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLGtGQUFrRjtnQkFDcEYsU0FBUyxFQUFFLENBQUMsYUFBYSxDQUFDO2FBQzNCO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUFFLHFDQUFxQztnQkFDN0MsU0FBUyxFQUFFO29CQUNULHlHQUF5RztpQkFDMUc7YUFDRjtTQUNGLEVBQ0QsSUFBSSxDQUFDLCtFQUErRTtTQUNyRixDQUFDO0lBQ0osQ0FBQzs7QUFoRkgsa0RBaUZDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgbGFtYmRhX3B5dGhvbiBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhLXB5dGhvbi1hbHBoYSc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGFibGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSAnY2RrLW5hZyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IGFkZFRlbXBsYXRlVGFnIH0gZnJvbSAnLi4vLi4vdXRpbHMnO1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHByb3BlcnRpZXMgcmVxdWlyZWQgdG8gaW5pdGlhbGl6ZSB0aGUgVGVuYW50Q29uZmlnTGFtYmRhcy5cbiAqXG4gKiBAaW50ZXJmYWNlIFRlbmFudENvbmZpZ0xhbWJkYXNQcm9wc1xuICogQHByb3BlcnR5IHtUYWJsZX0gdGVuYW50RGV0YWlscyAtIFRoZSB0YWJsZSB0aGF0IHN0b3JlcyB0aGUgdGVuYW50IGRldGFpbHMuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gdGVuYW50Q29uZmlnSW5kZXhOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGdsb2JhbCBzZWNvbmRhcnkgaW5kZXggZm9yIHRoZSB0ZW5hbnQgY29uZmlndXJhdGlvbi5cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0ZW5hbnREZXRhaWxzVGVuYW50TmFtZUNvbHVtbiAtIFRoZSBuYW1lIG9mIHRoZSBjb2x1bW4gdGhhdCBzdG9yZXMgdGhlIHRlbmFudCBuYW1lLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHRlbmFudERldGFpbHNUZW5hbnRDb25maWdDb2x1bW4gLSBUaGUgbmFtZSBvZiB0aGUgY29sdW1uIHRoYXQgc3RvcmVzIHRoZSB0ZW5hbnQgY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUZW5hbnRDb25maWdMYW1iZGFzUHJvcHMge1xuICByZWFkb25seSB0ZW5hbnREZXRhaWxzOiBUYWJsZTtcbiAgcmVhZG9ubHkgdGVuYW50Q29uZmlnSW5kZXhOYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHRlbmFudERldGFpbHNUZW5hbnROYW1lQ29sdW1uOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHRlbmFudERldGFpbHNUZW5hbnRDb25maWdDb2x1bW46IHN0cmluZztcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc2V0IG9mIExhbWJkYSBmdW5jdGlvbnMgZm9yIG1hbmFnaW5nIHRlbmFudCBjb25maWd1cmF0aW9ucy5cbiAqXG4gKiBAY2xhc3MgVGVuYW50Q29uZmlnTGFtYmRhc1xuICogQGV4dGVuZHMgQ29uc3RydWN0XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW5hbnRDb25maWdMYW1iZGFzIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqXG4gICAqIFRoZSBMYW1iZGEgZnVuY3Rpb24gcmVzcG9uc2libGUgZm9yIG1hbmFnaW5nIHRlbmFudCBjb25maWd1cmF0aW9ucy5cbiAgICpcbiAgICogQHR5cGUge2xhbWJkYS5GdW5jdGlvbn1cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0ZW5hbnRDb25maWdGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBUZW5hbnRDb25maWdMYW1iZGFzLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnN0cnVjdH0gc2NvcGUgLSBUaGUgcGFyZW50IGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSB7VGVuYW50Q29uZmlnTGFtYmRhc1Byb3BzfSBwcm9wcyAtIFRoZSBwcm9wZXJ0aWVzIHJlcXVpcmVkIHRvIGluaXRpYWxpemUgdGhlIFRlbmFudENvbmZpZ0xhbWJkYXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogVGVuYW50Q29uZmlnTGFtYmRhc1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICBhZGRUZW1wbGF0ZVRhZyh0aGlzLCAnVGVuYW50Q29uZmlnU2VydmljZScpO1xuXG4gICAgLy8gaHR0cHM6Ly9kb2NzLnBvd2VydG9vbHMuYXdzLmRldi9sYW1iZGEvcHl0aG9uLzIuMzEuMC8jbGFtYmRhLWxheWVyXG4gICAgY29uc3QgbGFtYmRhUG93ZXJUb29sc0xheWVyQVJOID0gYGFybjphd3M6bGFtYmRhOiR7XG4gICAgICBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uXG4gICAgfTowMTcwMDA4MDE0NDY6bGF5ZXI6QVdTTGFtYmRhUG93ZXJ0b29sc1B5dGhvblYyOjU5YDtcblxuICAgIHRoaXMudGVuYW50Q29uZmlnRnVuY3Rpb24gPSBuZXcgbGFtYmRhX3B5dGhvbi5QeXRob25GdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICAnVGVuYW50Q29uZmlnU2VydmljZUxhbWJkYScsXG4gICAgICB7XG4gICAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vcmVzb3VyY2VzL2Z1bmN0aW9ucy90ZW5hbnQtY29uZmlnLycpLFxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcbiAgICAgICAgaW5kZXg6ICdpbmRleC5weScsXG4gICAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIFRFTkFOVF9ERVRBSUxTX1RBQkxFOiBwcm9wcy50ZW5hbnREZXRhaWxzLnRhYmxlTmFtZSxcbiAgICAgICAgICBURU5BTlRfQ09ORklHX0lOREVYX05BTUU6IHByb3BzLnRlbmFudENvbmZpZ0luZGV4TmFtZSxcbiAgICAgICAgICBURU5BTlRfTkFNRV9DT0xVTU46IHByb3BzLnRlbmFudERldGFpbHNUZW5hbnROYW1lQ29sdW1uLFxuICAgICAgICAgIFRFTkFOVF9DT05GSUdfQ09MVU1OOiBwcm9wcy50ZW5hbnREZXRhaWxzVGVuYW50Q29uZmlnQ29sdW1uLFxuICAgICAgICB9LFxuICAgICAgICBsb2dHcm91cDogbmV3IGNkay5hd3NfbG9ncy5Mb2dHcm91cCh0aGlzLCAnQmlsbGluZ0luZ2VzdG9yTG9nR3JvdXAnLCB7XG4gICAgICAgICAgcmV0ZW50aW9uOiBjZGsuYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5GSVZFX0RBWVMsXG4gICAgICAgIH0pLFxuICAgICAgICBsYXllcnM6IFtcbiAgICAgICAgICBsYW1iZGEuTGF5ZXJWZXJzaW9uLmZyb21MYXllclZlcnNpb25Bcm4oXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgJ0xhbWJkYVBvd2VyVG9vbHMnLFxuICAgICAgICAgICAgbGFtYmRhUG93ZXJUb29sc0xheWVyQVJOXG4gICAgICAgICAgKSxcbiAgICAgICAgXSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgcHJvcHMudGVuYW50RGV0YWlscy5ncmFudFJlYWREYXRhKHRoaXMudGVuYW50Q29uZmlnRnVuY3Rpb24pO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGhpcy50ZW5hbnRDb25maWdGdW5jdGlvbi5yb2xlISxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICAnVGhpcyBpcyBSZXNvdXJjZTo6KiBiZWluZyB1c2VkIHRvIG91dHB1dCBsb2dzIGFuZCB4LXJheSB0cmFjZXMgYW5kIG5vdGhpbmcgZWxzZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogWydSZXNvdXJjZTo6KiddLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOiAnSW5kZXggbmFtZShzKSBub3Qga25vd24gYmVmb3JlaGFuZC4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgYFJlc291cmNlOjo8Q29udHJvbFBsYW5ldGVuYW50TWFuYWdlbWVudFNlcnZpY3Zlc3RlbmFudE1hbmFnZW1lbnRUYWJsZVRlbmFudERldGFpbHM5NzRFOTVCOC5Bcm4+L2luZGV4LypgLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcbiAgfVxufVxuIl19
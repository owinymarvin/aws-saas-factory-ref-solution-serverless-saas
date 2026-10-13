"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantManagementService = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const apigatewayV2 = require("aws-cdk-lib/aws-apigatewayv2");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const events = require("aws-cdk-lib/aws-events");
const aws_events_targets_1 = require("aws-cdk-lib/aws-events-targets");
const constructs_1 = require("constructs");
const tenant_management_funcs_1 = require("./tenant-management-funcs");
const tenant_management_table_1 = require("./tenant-management.table");
const utils_1 = require("../../utils");
/**
 * Represents a service for managing tenants in the application.
 *
 * @class TenantManagementService
 * @extends Construct
 */
class TenantManagementService extends constructs_1.Construct {
    /**
     * Constructs a new instance of the TenantManagementService.
     *
     * @param {Construct} scope - The parent construct.
     * @param {string} id - The ID of the construct.
     * @param {TenantManagementServiceProps} props - The properties required to initialize the service.
     */
    constructor(scope, id, props) {
        super(scope, id);
        const table = new tenant_management_table_1.TenantManagementTable(this, 'tenantManagementTable');
        const lambda = new tenant_management_funcs_1.TenantManagementLambda(this, 'tenantManagementLambda', {
            eventManager: props.eventManager,
            table,
        });
        const tenantsHttpLambdaIntegration = new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('tenantsHttpLambdaIntegration', lambda.tenantManagementFunc);
        const tenantsPath = '/tenants';
        const tenantIdPath = `${tenantsPath}/{tenantId}`;
        const routes = [
            {
                method: apigatewayV2.HttpMethod.GET,
                scope: props.auth.fetchAllTenantsScope,
                path: tenantsPath,
                integration: tenantsHttpLambdaIntegration,
            },
            {
                method: apigatewayV2.HttpMethod.POST,
                scope: props.auth.createTenantScope,
                path: tenantsPath,
                integration: tenantsHttpLambdaIntegration,
            },
            {
                method: apigatewayV2.HttpMethod.DELETE,
                scope: props.auth.deleteTenantScope,
                path: tenantIdPath,
                integration: tenantsHttpLambdaIntegration,
            },
            {
                method: apigatewayV2.HttpMethod.GET,
                scope: props.auth.fetchTenantScope,
                path: tenantIdPath,
                integration: tenantsHttpLambdaIntegration,
            },
            {
                method: apigatewayV2.HttpMethod.PUT,
                scope: props.auth.updateTenantScope,
                path: tenantIdPath,
                integration: tenantsHttpLambdaIntegration,
            },
            {
                method: apigatewayV2.HttpMethod.PUT,
                scope: props.auth.deactivateTenantScope,
                path: `${tenantIdPath}/deactivate`,
                integration: tenantsHttpLambdaIntegration,
            },
            {
                method: apigatewayV2.HttpMethod.PUT,
                scope: props.auth.activateTenantScope,
                path: `${tenantIdPath}/activate`,
                integration: tenantsHttpLambdaIntegration,
            },
        ];
        (0, utils_1.generateRoutes)(props.api, routes, props.authorizer);
        const connection = new events.Connection(this, 'connection', {
            authorization: events.Authorization.oauth({
                authorizationEndpoint: props.auth.tokenEndpoint,
                clientId: props.auth.machineClientId,
                clientSecret: props.auth.machineClientSecret,
                httpMethod: events.HttpMethod.POST,
                bodyParameters: {
                    grant_type: events.HttpParameter.fromString('client_credentials'),
                    ...(props.auth.updateTenantScope && {
                        scope: events.HttpParameter.fromString(props.auth.updateTenantScope),
                    }),
                },
            }),
        });
        const putTenantAPIDestination = new events.ApiDestination(this, 'destination', {
            connection: connection,
            httpMethod: events.HttpMethod.PUT,
            endpoint: `${props.api.url}${tenantsPath.substring(1)}/*`, // skip the first '/' in tenantIdPath
        });
        const tenantUpdateServiceTarget = new aws_events_targets_1.ApiDestination(putTenantAPIDestination, {
            pathParameterValues: ['$.detail.tenantId'],
            event: events.RuleTargetInput.fromEventPath('$.detail.tenantOutput'),
        });
        props.eventManager.addTargetToEvent(this, utils_1.DetailType.PROVISION_SUCCESS, tenantUpdateServiceTarget);
        props.eventManager.addTargetToEvent(this, utils_1.DetailType.DEPROVISION_SUCCESS, tenantUpdateServiceTarget);
        this.table = table;
    }
}
exports.TenantManagementService = TenantManagementService;
_a = JSII_RTTI_SYMBOL_1;
TenantManagementService[_a] = { fqn: "@cdklabs/sbt-aws.TenantManagementService", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LW1hbmFnZW1lbnQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb250cm9sLXBsYW5lL3RlbmFudC1tYW5hZ2VtZW50L3RlbmFudC1tYW5hZ2VtZW50LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxxRUFBcUU7QUFDckUsc0NBQXNDO0FBRXRDLDZEQUE2RDtBQUM3RCw2RkFBa0Y7QUFDbEYsaURBQWlEO0FBQ2pELHVFQUFnRTtBQUNoRSwyQ0FBdUM7QUFDdkMsdUVBQW1FO0FBQ25FLHVFQUFrRTtBQUNsRSx1Q0FBZ0Y7QUFtQmhGOzs7OztHQUtHO0FBQ0gsTUFBYSx1QkFBd0IsU0FBUSxzQkFBUztJQVFwRDs7Ozs7O09BTUc7SUFDSCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1DO1FBQzNFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxLQUFLLEdBQUcsSUFBSSwrQ0FBcUIsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUN2RSxNQUFNLE1BQU0sR0FBRyxJQUFJLGdEQUFzQixDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUN4RSxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7WUFDaEMsS0FBSztTQUNOLENBQUMsQ0FBQztRQUVILE1BQU0sNEJBQTRCLEdBQUcsSUFBSSxxREFBcUIsQ0FDNUQsOEJBQThCLEVBQzlCLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDNUIsQ0FBQztRQUNGLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQztRQUMvQixNQUFNLFlBQVksR0FBRyxHQUFHLFdBQVcsYUFBYSxDQUFDO1FBRWpELE1BQU0sTUFBTSxHQUFhO1lBQ3ZCO2dCQUNFLE1BQU0sRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUc7Z0JBQ25DLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLG9CQUFvQjtnQkFD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LElBQUksbUNBQWMsQ0FBQyx1QkFBdUIsRUFBRTtZQUM1RSxtQkFBbUIsRUFBRSxDQUFDLG1CQUFtQixDQUFDO1lBQzFDLEtBQUssRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztTQUNyRSxDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUNqQyxJQUFJLEVBQ0osa0JBQVUsQ0FBQyxpQkFBaUIsRUFDNUIseUJBQXlCLENBQzFCLENBQUM7UUFFRixLQUFLLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUNqQyxJQUFJLEVBQ0osa0JBQVUsQ0FBQyxtQkFBbUIsRUFDOUIseUJBQXlCLENBQzFCLENBQUM7UUFFRixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDOztBQXBISCwwREFxSEMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbmltcG9ydCAqIGFzIGFwaWdhdGV3YXlWMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCB7IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCB7IEFwaURlc3RpbmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgVGVuYW50TWFuYWdlbWVudExhbWJkYSB9IGZyb20gJy4vdGVuYW50LW1hbmFnZW1lbnQtZnVuY3MnO1xuaW1wb3J0IHsgVGVuYW50TWFuYWdlbWVudFRhYmxlIH0gZnJvbSAnLi90ZW5hbnQtbWFuYWdlbWVudC50YWJsZSc7XG5pbXBvcnQgeyBEZXRhaWxUeXBlLCBJRXZlbnRNYW5hZ2VyLCBJUm91dGUsIGdlbmVyYXRlUm91dGVzIH0gZnJvbSAnLi4vLi4vdXRpbHMnO1xuaW1wb3J0IHsgSUF1dGggfSBmcm9tICcuLi9hdXRoL2F1dGgtaW50ZXJmYWNlJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBwcm9wZXJ0aWVzIHJlcXVpcmVkIHRvIGluaXRpYWxpemUgdGhlIFRlbmFudE1hbmFnZW1lbnRTZXJ2aWNlLlxuICpcbiAqIEBpbnRlcmZhY2UgVGVuYW50TWFuYWdlbWVudFNlcnZpY2VQcm9wc1xuICogQHByb3BlcnR5IHthcGlnYXRld2F5VjIuSHR0cEFwaX0gYXBpIC0gVGhlIEhUVFAgQVBJIEdhdGV3YXkgaW5zdGFuY2UuXG4gKiBAcHJvcGVydHkge0lBdXRofSBhdXRoIC0gVGhlIGF1dGhlbnRpY2F0aW9uIG1lY2hhbmlzbSBmb3IgdGhlIHNlcnZpY2UuXG4gKiBAcHJvcGVydHkge2FwaWdhdGV3YXlWMi5JSHR0cFJvdXRlQXV0aG9yaXplcn0gYXV0aG9yaXplciAtIFRoZSBIVFRQIHJvdXRlIGF1dGhvcml6ZXIgZm9yIHRoZSBzZXJ2aWNlLlxuICogQHByb3BlcnR5IHtJRXZlbnRNYW5hZ2VyfSBldmVudE1hbmFnZXIgLSBUaGUgZXZlbnQgbWFuYWdlciBmb3IgaGFuZGxpbmcgdGVuYW50LXJlbGF0ZWQgZXZlbnRzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFRlbmFudE1hbmFnZW1lbnRTZXJ2aWNlUHJvcHMge1xuICByZWFkb25seSBhcGk6IGFwaWdhdGV3YXlWMi5IdHRwQXBpO1xuICByZWFkb25seSBhdXRoOiBJQXV0aDtcbiAgcmVhZG9ubHkgYXV0aG9yaXplcjogYXBpZ2F0ZXdheVYyLklIdHRwUm91dGVBdXRob3JpemVyO1xuICByZWFkb25seSBldmVudE1hbmFnZXI6IElFdmVudE1hbmFnZXI7XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHNlcnZpY2UgZm9yIG1hbmFnaW5nIHRlbmFudHMgaW4gdGhlIGFwcGxpY2F0aW9uLlxuICpcbiAqIEBjbGFzcyBUZW5hbnRNYW5hZ2VtZW50U2VydmljZVxuICogQGV4dGVuZHMgQ29uc3RydWN0XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW5hbnRNYW5hZ2VtZW50U2VydmljZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIC8qKlxuICAgKiBUaGUgdGVuYW50IG1hbmFnZW1lbnQgdGFibGUgaW5zdGFuY2UuXG4gICAqXG4gICAqIEB0eXBlIHtUZW5hbnRNYW5hZ2VtZW50VGFibGV9XG4gICAqL1xuICB0YWJsZTogVGVuYW50TWFuYWdlbWVudFRhYmxlO1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBUZW5hbnRNYW5hZ2VtZW50U2VydmljZS5cbiAgICpcbiAgICogQHBhcmFtIHtDb25zdHJ1Y3R9IHNjb3BlIC0gVGhlIHBhcmVudCBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgY29uc3RydWN0LlxuICAgKiBAcGFyYW0ge1RlbmFudE1hbmFnZW1lbnRTZXJ2aWNlUHJvcHN9IHByb3BzIC0gVGhlIHByb3BlcnRpZXMgcmVxdWlyZWQgdG8gaW5pdGlhbGl6ZSB0aGUgc2VydmljZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBUZW5hbnRNYW5hZ2VtZW50U2VydmljZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHRhYmxlID0gbmV3IFRlbmFudE1hbmFnZW1lbnRUYWJsZSh0aGlzLCAndGVuYW50TWFuYWdlbWVudFRhYmxlJyk7XG4gICAgY29uc3QgbGFtYmRhID0gbmV3IFRlbmFudE1hbmFnZW1lbnRMYW1iZGEodGhpcywgJ3RlbmFudE1hbmFnZW1lbnRMYW1iZGEnLCB7XG4gICAgICBldmVudE1hbmFnZXI6IHByb3BzLmV2ZW50TWFuYWdlcixcbiAgICAgIHRhYmxlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAndGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbicsXG4gICAgICBsYW1iZGEudGVuYW50TWFuYWdlbWVudEZ1bmNcbiAgICApO1xuICAgIGNvbnN0IHRlbmFudHNQYXRoID0gJy90ZW5hbnRzJztcbiAgICBjb25zdCB0ZW5hbnRJZFBhdGggPSBgJHt0ZW5hbnRzUGF0aH0ve3RlbmFudElkfWA7XG5cbiAgICBjb25zdCByb3V0ZXM6IElSb3V0ZVtdID0gW1xuICAgICAge1xuICAgICAgICBtZXRob2Q6IGFwaWdhdGV3YXlWMi5IdHRwTWV0aG9kLkdFVCxcbiAgICAgICAgc2NvcGU6IHByb3BzLmF1dGguZmV0Y2hBbGxUZW5hbnRzU2NvcGUsXG4gICAgICAgIHBhdGg6IHRlbmFudHNQYXRoLFxuICAgICAgICBpbnRlZ3JhdGlvbjogdGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG1ldGhvZDogYXBpZ2F0ZXdheVYyLkh0dHBNZXRob2QuUE9TVCxcbiAgICAgICAgc2NvcGU6IHByb3BzLmF1dGguY3JlYXRlVGVuYW50U2NvcGUsXG4gICAgICAgIHBhdGg6IHRlbmFudHNQYXRoLFxuICAgICAgICBpbnRlZ3JhdGlvbjogdGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG1ldGhvZDogYXBpZ2F0ZXdheVYyLkh0dHBNZXRob2QuREVMRVRFLFxuICAgICAgICBzY29wZTogcHJvcHMuYXV0aC5kZWxldGVUZW5hbnRTY29wZSxcbiAgICAgICAgcGF0aDogdGVuYW50SWRQYXRoLFxuICAgICAgICBpbnRlZ3JhdGlvbjogdGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG1ldGhvZDogYXBpZ2F0ZXdheVYyLkh0dHBNZXRob2QuR0VULFxuICAgICAgICBzY29wZTogcHJvcHMuYXV0aC5mZXRjaFRlbmFudFNjb3BlLFxuICAgICAgICBwYXRoOiB0ZW5hbnRJZFBhdGgsXG4gICAgICAgIGludGVncmF0aW9uOiB0ZW5hbnRzSHR0cExhbWJkYUludGVncmF0aW9uLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBhcGlnYXRld2F5VjIuSHR0cE1ldGhvZC5QVVQsXG4gICAgICAgIHNjb3BlOiBwcm9wcy5hdXRoLnVwZGF0ZVRlbmFudFNjb3BlLFxuICAgICAgICBwYXRoOiB0ZW5hbnRJZFBhdGgsXG4gICAgICAgIGludGVncmF0aW9uOiB0ZW5hbnRzSHR0cExhbWJkYUludGVncmF0aW9uLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBhcGlnYXRld2F5VjIuSHR0cE1ldGhvZC5QVVQsXG4gICAgICAgIHNjb3BlOiBwcm9wcy5hdXRoLmRlYWN0aXZhdGVUZW5hbnRTY29wZSxcbiAgICAgICAgcGF0aDogYCR7dGVuYW50SWRQYXRofS9kZWFjdGl2YXRlYCxcbiAgICAgICAgaW50ZWdyYXRpb246IHRlbmFudHNIdHRwTGFtYmRhSW50ZWdyYXRpb24sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBtZXRob2Q6IGFwaWdhdGV3YXlWMi5IdHRwTWV0aG9kLlBVVCxcbiAgICAgICAgc2NvcGU6IHByb3BzLmF1dGguYWN0aXZhdGVUZW5hbnRTY29wZSxcbiAgICAgICAgcGF0aDogYCR7dGVuYW50SWRQYXRofS9hY3RpdmF0ZWAsXG4gICAgICAgIGludGVncmF0aW9uOiB0ZW5hbnRzSHR0cExhbWJkYUludGVncmF0aW9uLFxuICAgICAgfSxcbiAgICBdO1xuICAgIGdlbmVyYXRlUm91dGVzKHByb3BzLmFwaSwgcm91dGVzLCBwcm9wcy5hdXRob3JpemVyKTtcblxuICAgIGNvbnN0IGNvbm5lY3Rpb24gPSBuZXcgZXZlbnRzLkNvbm5lY3Rpb24odGhpcywgJ2Nvbm5lY3Rpb24nLCB7XG4gICAgICBhdXRob3JpemF0aW9uOiBldmVudHMuQXV0aG9yaXphdGlvbi5vYXV0aCh7XG4gICAgICAgIGF1dGhvcml6YXRpb25FbmRwb2ludDogcHJvcHMuYXV0aC50b2tlbkVuZHBvaW50LFxuICAgICAgICBjbGllbnRJZDogcHJvcHMuYXV0aC5tYWNoaW5lQ2xpZW50SWQsXG4gICAgICAgIGNsaWVudFNlY3JldDogcHJvcHMuYXV0aC5tYWNoaW5lQ2xpZW50U2VjcmV0LFxuICAgICAgICBodHRwTWV0aG9kOiBldmVudHMuSHR0cE1ldGhvZC5QT1NULFxuICAgICAgICBib2R5UGFyYW1ldGVyczoge1xuICAgICAgICAgIGdyYW50X3R5cGU6IGV2ZW50cy5IdHRwUGFyYW1ldGVyLmZyb21TdHJpbmcoJ2NsaWVudF9jcmVkZW50aWFscycpLFxuICAgICAgICAgIC4uLihwcm9wcy5hdXRoLnVwZGF0ZVRlbmFudFNjb3BlICYmIHtcbiAgICAgICAgICAgIHNjb3BlOiBldmVudHMuSHR0cFBhcmFtZXRlci5mcm9tU3RyaW5nKHByb3BzLmF1dGgudXBkYXRlVGVuYW50U2NvcGUpLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBwdXRUZW5hbnRBUElEZXN0aW5hdGlvbiA9IG5ldyBldmVudHMuQXBpRGVzdGluYXRpb24odGhpcywgJ2Rlc3RpbmF0aW9uJywge1xuICAgICAgY29ubmVjdGlvbjogY29ubmVjdGlvbixcbiAgICAgIGh0dHBNZXRob2Q6IGV2ZW50cy5IdHRwTWV0aG9kLlBVVCxcbiAgICAgIGVuZHBvaW50OiBgJHtwcm9wcy5hcGkudXJsfSR7dGVuYW50c1BhdGguc3Vic3RyaW5nKDEpfS8qYCwgLy8gc2tpcCB0aGUgZmlyc3QgJy8nIGluIHRlbmFudElkUGF0aFxuICAgIH0pO1xuXG4gICAgY29uc3QgdGVuYW50VXBkYXRlU2VydmljZVRhcmdldCA9IG5ldyBBcGlEZXN0aW5hdGlvbihwdXRUZW5hbnRBUElEZXN0aW5hdGlvbiwge1xuICAgICAgcGF0aFBhcmFtZXRlclZhbHVlczogWyckLmRldGFpbC50ZW5hbnRJZCddLFxuICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbUV2ZW50UGF0aCgnJC5kZXRhaWwudGVuYW50T3V0cHV0JyksXG4gICAgfSk7XG5cbiAgICBwcm9wcy5ldmVudE1hbmFnZXIuYWRkVGFyZ2V0VG9FdmVudChcbiAgICAgIHRoaXMsXG4gICAgICBEZXRhaWxUeXBlLlBST1ZJU0lPTl9TVUNDRVNTLFxuICAgICAgdGVuYW50VXBkYXRlU2VydmljZVRhcmdldFxuICAgICk7XG5cbiAgICBwcm9wcy5ldmVudE1hbmFnZXIuYWRkVGFyZ2V0VG9FdmVudChcbiAgICAgIHRoaXMsXG4gICAgICBEZXRhaWxUeXBlLkRFUFJPVklTSU9OX1NVQ0NFU1MsXG4gICAgICB0ZW5hbnRVcGRhdGVTZXJ2aWNlVGFyZ2V0XG4gICAgKTtcblxuICAgIHRoaXMudGFibGUgPSB0YWJsZTtcbiAgfVxufVxuIl19
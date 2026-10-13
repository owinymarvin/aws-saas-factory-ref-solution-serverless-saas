"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementService = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const apigatewayV2 = require("aws-cdk-lib/aws-apigatewayv2");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
 * Represents a service for managing users in the application.
 *
 * @class UserManagementService
 * @extends Construct
 */
class UserManagementService extends constructs_1.Construct {
    /**
     * Constructs a new instance of the UserManagementService.
     *
     * @param {Construct} scope - The parent construct.
     * @param {string} id - The ID of the construct.
     * @param {UserManagementServiceProps} props - The properties required to initialize the service.
     */
    constructor(scope, id, props) {
        super(scope, id);
        const usersPath = '/users';
        const userIdPath = `${usersPath}/{userId}`;
        const routes = [
            {
                method: apigatewayV2.HttpMethod.POST,
                scope: props.auth.createUserScope,
                path: usersPath,
                integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('tenantsHttpLambdaIntegration', props.auth.createUserFunction),
            },
            {
                method: apigatewayV2.HttpMethod.GET,
                scope: props.auth.fetchAllUsersScope,
                path: usersPath,
                integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('tenantsHttpLambdaIntegration', props.auth.fetchAllUsersFunction),
            },
            {
                method: apigatewayV2.HttpMethod.GET,
                scope: props.auth.fetchUserScope,
                path: userIdPath,
                integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('tenantsHttpLambdaIntegration', props.auth.fetchUserFunction),
            },
            {
                method: apigatewayV2.HttpMethod.PUT,
                scope: props.auth.updateUserScope,
                path: userIdPath,
                integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('tenantsHttpLambdaIntegration', props.auth.updateUserFunction),
            },
            {
                method: apigatewayV2.HttpMethod.DELETE,
                scope: props.auth.deleteUserScope,
                path: userIdPath,
                integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('tenantsHttpLambdaIntegration', props.auth.deleteUserFunction),
            },
        ];
        (0, utils_1.generateRoutes)(props.api, routes, props.jwtAuthorizer);
    }
}
exports.UserManagementService = UserManagementService;
_a = JSII_RTTI_SYMBOL_1;
UserManagementService[_a] = { fqn: "@cdklabs/sbt-aws.UserManagementService", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1tYW5hZ2VtZW50LnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udHJvbC1wbGFuZS91c2VyLW1hbmFnZW1lbnQvdXNlci1tYW5hZ2VtZW50LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxxRUFBcUU7QUFDckUsc0NBQXNDO0FBRXRDLDZEQUE2RDtBQUM3RCw2RkFBa0Y7QUFDbEYsMkNBQXVDO0FBRXZDLHVDQUFxRDtBQWdCckQ7Ozs7O0dBS0c7QUFDSCxNQUFhLHFCQUFzQixTQUFRLHNCQUFTO0lBQ2xEOzs7Ozs7T0FNRztJQUNILFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBaUM7UUFDekUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDM0IsTUFBTSxVQUFVLEdBQUcsR0FBRyxTQUFTLFdBQVcsQ0FBQztRQUMzQyxNQUFNLE1BQU0sR0FBYTtZQUN2QjtnQkFDRSxNQUFNLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJO2dCQUNwQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlO2dCQUNqQyxJQUFJLEVBQUUsU0FBUztnQkFDZixXQUFXLEVBQUUsSUFBSSxxREFBcUIsQ0FDcEMsOEJBQThCLEVBQzlCLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQzlCO2FBQ0Y7WUFDRDtnQkFDRSxNQUFNLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHO2dCQUNuQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0I7Z0JBQ3BDLElBQUksRUFBRSxTQUFTO2dCQUNmLFdBQVcsRUFBRSxJQUFJLHFEQUFxQixDQUNwQyw4QkFBOEIsRUFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FDakM7YUFDRjtZQUNEO2dCQUNFLE1BQU0sRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUc7Z0JBQ25DLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWM7Z0JBQ2hDLElBQUksRUFBRSxVQUFVO2dCQUNoQixXQUFXLEVBQUUsSUFBSSxxREFBcUIsQ0FDcEMsOEJBQThCLEVBQzlCLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQzdCO2FBQ0Y7WUFDRDtnQkFDRSxNQUFNLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHO2dCQUNuQyxLQUFLLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlO2dCQUNqQyxJQUFJLEVBQUUsVUFBVTtnQkFDaEIsV0FBVyxFQUFFLElBQUkscURBQXFCLENBQ3BDLDhCQUE4QixFQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUM5QjthQUNGO1lBQ0Q7Z0JBQ0UsTUFBTSxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsTUFBTTtnQkFDdEMsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZTtnQkFDakMsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLFdBQVcsRUFBRSxJQUFJLHFEQUFxQixDQUNwQyw4QkFBOEIsRUFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FDOUI7YUFDRjtTQUNGLENBQUM7UUFFRixJQUFBLHNCQUFjLEVBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELENBQUM7O0FBOURILHNEQStEQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcblxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheVYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0IHsgSHR0cExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBJQXV0aCB9IGZyb20gJy4uJztcbmltcG9ydCB7IElSb3V0ZSwgZ2VuZXJhdGVSb3V0ZXMgfSBmcm9tICcuLi8uLi91dGlscyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgcHJvcGVydGllcyByZXF1aXJlZCB0byBpbml0aWFsaXplIHRoZSBVc2VyTWFuYWdlbWVudFNlcnZpY2UuXG4gKlxuICogQGludGVyZmFjZSBVc2VyTWFuYWdlbWVudFNlcnZpY2VQcm9wc1xuICogQHByb3BlcnR5IHthcGlnYXRld2F5VjIuSHR0cEFwaX0gYXBpIC0gVGhlIEhUVFAgQVBJIEdhdGV3YXkgaW5zdGFuY2UuXG4gKiBAcHJvcGVydHkge0lBdXRofSBhdXRoIC0gVGhlIGF1dGhlbnRpY2F0aW9uIG1lY2hhbmlzbSBmb3IgdGhlIHNlcnZpY2UuXG4gKiBAcHJvcGVydHkge2FwaWdhdGV3YXlWMi5JSHR0cFJvdXRlQXV0aG9yaXplcn0gand0QXV0aG9yaXplciAtIFRoZSBKV1QgYXV0aG9yaXplciBmb3IgdGhlIHNlcnZpY2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVXNlck1hbmFnZW1lbnRTZXJ2aWNlUHJvcHMge1xuICByZWFkb25seSBhcGk6IGFwaWdhdGV3YXlWMi5IdHRwQXBpO1xuICByZWFkb25seSBhdXRoOiBJQXV0aDtcbiAgcmVhZG9ubHkgand0QXV0aG9yaXplcjogYXBpZ2F0ZXdheVYyLklIdHRwUm91dGVBdXRob3JpemVyO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYSBzZXJ2aWNlIGZvciBtYW5hZ2luZyB1c2VycyBpbiB0aGUgYXBwbGljYXRpb24uXG4gKlxuICogQGNsYXNzIFVzZXJNYW5hZ2VtZW50U2VydmljZVxuICogQGV4dGVuZHMgQ29uc3RydWN0XG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VyTWFuYWdlbWVudFNlcnZpY2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgVXNlck1hbmFnZW1lbnRTZXJ2aWNlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnN0cnVjdH0gc2NvcGUgLSBUaGUgcGFyZW50IGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBjb25zdHJ1Y3QuXG4gICAqIEBwYXJhbSB7VXNlck1hbmFnZW1lbnRTZXJ2aWNlUHJvcHN9IHByb3BzIC0gVGhlIHByb3BlcnRpZXMgcmVxdWlyZWQgdG8gaW5pdGlhbGl6ZSB0aGUgc2VydmljZS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBVc2VyTWFuYWdlbWVudFNlcnZpY2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCB1c2Vyc1BhdGggPSAnL3VzZXJzJztcbiAgICBjb25zdCB1c2VySWRQYXRoID0gYCR7dXNlcnNQYXRofS97dXNlcklkfWA7XG4gICAgY29uc3Qgcm91dGVzOiBJUm91dGVbXSA9IFtcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBhcGlnYXRld2F5VjIuSHR0cE1ldGhvZC5QT1NULFxuICAgICAgICBzY29wZTogcHJvcHMuYXV0aC5jcmVhdGVVc2VyU2NvcGUsXG4gICAgICAgIHBhdGg6IHVzZXJzUGF0aCxcbiAgICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAgICAgJ3RlbmFudHNIdHRwTGFtYmRhSW50ZWdyYXRpb24nLFxuICAgICAgICAgIHByb3BzLmF1dGguY3JlYXRlVXNlckZ1bmN0aW9uXG4gICAgICAgICksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBtZXRob2Q6IGFwaWdhdGV3YXlWMi5IdHRwTWV0aG9kLkdFVCxcbiAgICAgICAgc2NvcGU6IHByb3BzLmF1dGguZmV0Y2hBbGxVc2Vyc1Njb3BlLFxuICAgICAgICBwYXRoOiB1c2Vyc1BhdGgsXG4gICAgICAgIGludGVncmF0aW9uOiBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKFxuICAgICAgICAgICd0ZW5hbnRzSHR0cExhbWJkYUludGVncmF0aW9uJyxcbiAgICAgICAgICBwcm9wcy5hdXRoLmZldGNoQWxsVXNlcnNGdW5jdGlvblxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBhcGlnYXRld2F5VjIuSHR0cE1ldGhvZC5HRVQsXG4gICAgICAgIHNjb3BlOiBwcm9wcy5hdXRoLmZldGNoVXNlclNjb3BlLFxuICAgICAgICBwYXRoOiB1c2VySWRQYXRoLFxuICAgICAgICBpbnRlZ3JhdGlvbjogbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICAgICAndGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbicsXG4gICAgICAgICAgcHJvcHMuYXV0aC5mZXRjaFVzZXJGdW5jdGlvblxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBhcGlnYXRld2F5VjIuSHR0cE1ldGhvZC5QVVQsXG4gICAgICAgIHNjb3BlOiBwcm9wcy5hdXRoLnVwZGF0ZVVzZXJTY29wZSxcbiAgICAgICAgcGF0aDogdXNlcklkUGF0aCxcbiAgICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAgICAgJ3RlbmFudHNIdHRwTGFtYmRhSW50ZWdyYXRpb24nLFxuICAgICAgICAgIHByb3BzLmF1dGgudXBkYXRlVXNlckZ1bmN0aW9uXG4gICAgICAgICksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBtZXRob2Q6IGFwaWdhdGV3YXlWMi5IdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgICAgc2NvcGU6IHByb3BzLmF1dGguZGVsZXRlVXNlclNjb3BlLFxuICAgICAgICBwYXRoOiB1c2VySWRQYXRoLFxuICAgICAgICBpbnRlZ3JhdGlvbjogbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICAgICAndGVuYW50c0h0dHBMYW1iZGFJbnRlZ3JhdGlvbicsXG4gICAgICAgICAgcHJvcHMuYXV0aC5kZWxldGVVc2VyRnVuY3Rpb25cbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGdlbmVyYXRlUm91dGVzKHByb3BzLmFwaSwgcm91dGVzLCBwcm9wcy5qd3RBdXRob3JpemVyKTtcbiAgfVxufVxuIl19
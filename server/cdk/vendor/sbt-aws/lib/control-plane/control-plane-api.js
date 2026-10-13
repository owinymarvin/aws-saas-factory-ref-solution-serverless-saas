"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlPlaneAPI = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const cdk = require("aws-cdk-lib");
const apigatewayV2 = require("aws-cdk-lib/aws-apigatewayv2");
const apigatewayV2Authorizers = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../utils");
class ControlPlaneAPI extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'ControlPlaneAPI');
        this.api = new apigatewayV2.HttpApi(this, 'controlPlaneAPI', {
            corsPreflight: props.apiCorsConfig,
        });
        if (props.disableAPILogging) {
            cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(cdk.Stack.of(this), [this.api.defaultStage?.node.path], [
                {
                    id: 'AwsSolutions-APIG1',
                    reason: 'Customer has explicitly opted out of logging',
                },
            ]);
        }
        else {
            const controlPlaneAPILogGroup = new aws_logs_1.LogGroup(this, 'controlPlaneAPILogGroup', {
                retention: aws_logs_1.RetentionDays.ONE_WEEK,
                logGroupName: `/aws/vendedlogs/api/${this.node.id}-${this.node.addr}`,
            });
            const accessLogSettings = {
                destinationArn: controlPlaneAPILogGroup.logGroupArn,
                format: JSON.stringify({
                    requestId: '$context.requestId',
                    ip: '$context.identity.sourceIp',
                    requestTime: '$context.requestTime',
                    httpMethod: '$context.httpMethod',
                    routeKey: '$context.routeKey',
                    status: '$context.status',
                    protocol: '$context.protocol',
                    responseLength: '$context.responseLength',
                }),
            };
            const stage = this.api.defaultStage?.node.defaultChild;
            stage.accessLogSettings = accessLogSettings;
        }
        this.apiUrl = this.api.url;
        new cdk.CfnOutput(this, 'controlPlaneAPIEndpoint', {
            value: this.apiUrl,
            key: 'controlPlaneAPIEndpoint',
        });
        this.jwtAuthorizer = new apigatewayV2Authorizers.HttpJwtAuthorizer('tenantsAuthorizer', props.auth.jwtIssuer, {
            jwtAudience: props.auth.jwtAudience,
        });
    }
}
exports.ControlPlaneAPI = ControlPlaneAPI;
_a = JSII_RTTI_SYMBOL_1;
ControlPlaneAPI[_a] = { fqn: "@cdklabs/sbt-aws.ControlPlaneAPI", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbC1wbGFuZS1hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbC1wbGFuZS9jb250cm9sLXBsYW5lLWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7QUFFdEMsbUNBQW1DO0FBQ25DLDZEQUE2RDtBQUM3RCxvRkFBb0Y7QUFDcEYsbURBQStEO0FBQy9ELHFDQUEwQztBQUMxQywyQ0FBdUM7QUFFdkMsb0NBQTBDO0FBWTFDLE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQUk1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTJCO1FBQ25FLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBQSxzQkFBYyxFQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUMzRCxhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWE7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1Qix5QkFBZSxDQUFDLDZCQUE2QixDQUMzQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFDbEIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSyxDQUFDLEVBQ25DO2dCQUNFO29CQUNFLEVBQUUsRUFBRSxvQkFBb0I7b0JBQ3hCLE1BQU0sRUFBRSw4Q0FBOEM7aUJBQ3ZEO2FBQ0YsQ0FDRixDQUFDO1FBQ0osQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLHVCQUF1QixHQUFHLElBQUksbUJBQVEsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7Z0JBQzVFLFNBQVMsRUFBRSx3QkFBYSxDQUFDLFFBQVE7Z0JBQ2pDLFlBQVksRUFBRSx1QkFBdUIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7YUFDdEUsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxpQkFBaUIsR0FBRztnQkFDeEIsY0FBYyxFQUFFLHVCQUF1QixDQUFDLFdBQVc7Z0JBQ25ELE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNyQixTQUFTLEVBQUUsb0JBQW9CO29CQUMvQixFQUFFLEVBQUUsNEJBQTRCO29CQUNoQyxXQUFXLEVBQUUsc0JBQXNCO29CQUNuQyxVQUFVLEVBQUUscUJBQXFCO29CQUNqQyxRQUFRLEVBQUUsbUJBQW1CO29CQUM3QixNQUFNLEVBQUUsaUJBQWlCO29CQUN6QixRQUFRLEVBQUUsbUJBQW1CO29CQUM3QixjQUFjLEVBQUUseUJBQXlCO2lCQUMxQyxDQUFDO2FBQ0gsQ0FBQztZQUNGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFxQyxDQUFDO1lBQ2hGLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQztRQUM5QyxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztRQUMzQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNsQixHQUFHLEVBQUUseUJBQXlCO1NBQy9CLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FDaEUsbUJBQW1CLEVBQ25CLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUNwQjtZQUNFLFdBQVcsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVc7U0FDcEMsQ0FDRixDQUFDO0lBQ0osQ0FBQzs7QUF6REgsMENBMERDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheVYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheVYyQXV0aG9yaXplcnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XG5pbXBvcnQgeyBMb2dHcm91cCwgUmV0ZW50aW9uRGF5cyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gJ2Nkay1uYWcnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBJQXV0aCB9IGZyb20gJy4vYXV0aC9hdXRoLWludGVyZmFjZSc7XG5pbXBvcnQgeyBhZGRUZW1wbGF0ZVRhZyB9IGZyb20gJy4uL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBDb250cm9sUGxhbmVBUElQcm9wcyB7XG4gIHJlYWRvbmx5IGF1dGg6IElBdXRoO1xuICByZWFkb25seSBkaXNhYmxlQVBJTG9nZ2luZz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFNldHRpbmdzIGZvciBDb3JzIENvbmZpZ3VyYXRpb24gZm9yIHRoZSBDb250cm9sUGxhbmUgQVBJLlxuICAgKi9cbiAgcmVhZG9ubHkgYXBpQ29yc0NvbmZpZz86IGFwaWdhdGV3YXlWMi5Db3JzUHJlZmxpZ2h0T3B0aW9ucztcbn1cblxuZXhwb3J0IGNsYXNzIENvbnRyb2xQbGFuZUFQSSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIGFwaVVybDogYW55O1xuICBqd3RBdXRob3JpemVyOiBhcGlnYXRld2F5VjIuSUh0dHBSb3V0ZUF1dGhvcml6ZXI7XG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwaWdhdGV3YXlWMi5IdHRwQXBpO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29udHJvbFBsYW5lQVBJUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIGFkZFRlbXBsYXRlVGFnKHRoaXMsICdDb250cm9sUGxhbmVBUEknKTtcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlnYXRld2F5VjIuSHR0cEFwaSh0aGlzLCAnY29udHJvbFBsYW5lQVBJJywge1xuICAgICAgY29yc1ByZWZsaWdodDogcHJvcHMuYXBpQ29yc0NvbmZpZyxcbiAgICB9KTtcblxuICAgIGlmIChwcm9wcy5kaXNhYmxlQVBJTG9nZ2luZykge1xuICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICBjZGsuU3RhY2sub2YodGhpcyksXG4gICAgICAgIFt0aGlzLmFwaS5kZWZhdWx0U3RhZ2U/Lm5vZGUucGF0aCFdLFxuICAgICAgICBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtQVBJRzEnLFxuICAgICAgICAgICAgcmVhc29uOiAnQ3VzdG9tZXIgaGFzIGV4cGxpY2l0bHkgb3B0ZWQgb3V0IG9mIGxvZ2dpbmcnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGNvbnRyb2xQbGFuZUFQSUxvZ0dyb3VwID0gbmV3IExvZ0dyb3VwKHRoaXMsICdjb250cm9sUGxhbmVBUElMb2dHcm91cCcsIHtcbiAgICAgICAgcmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3ZlbmRlZGxvZ3MvYXBpLyR7dGhpcy5ub2RlLmlkfS0ke3RoaXMubm9kZS5hZGRyfWAsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGFjY2Vzc0xvZ1NldHRpbmdzID0ge1xuICAgICAgICBkZXN0aW5hdGlvbkFybjogY29udHJvbFBsYW5lQVBJTG9nR3JvdXAubG9nR3JvdXBBcm4sXG4gICAgICAgIGZvcm1hdDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHJlcXVlc3RJZDogJyRjb250ZXh0LnJlcXVlc3RJZCcsXG4gICAgICAgICAgaXA6ICckY29udGV4dC5pZGVudGl0eS5zb3VyY2VJcCcsXG4gICAgICAgICAgcmVxdWVzdFRpbWU6ICckY29udGV4dC5yZXF1ZXN0VGltZScsXG4gICAgICAgICAgaHR0cE1ldGhvZDogJyRjb250ZXh0Lmh0dHBNZXRob2QnLFxuICAgICAgICAgIHJvdXRlS2V5OiAnJGNvbnRleHQucm91dGVLZXknLFxuICAgICAgICAgIHN0YXR1czogJyRjb250ZXh0LnN0YXR1cycsXG4gICAgICAgICAgcHJvdG9jb2w6ICckY29udGV4dC5wcm90b2NvbCcsXG4gICAgICAgICAgcmVzcG9uc2VMZW5ndGg6ICckY29udGV4dC5yZXNwb25zZUxlbmd0aCcsXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHN0YWdlID0gdGhpcy5hcGkuZGVmYXVsdFN0YWdlPy5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnYXRld2F5VjIuQ2ZuU3RhZ2U7XG4gICAgICBzdGFnZS5hY2Nlc3NMb2dTZXR0aW5ncyA9IGFjY2Vzc0xvZ1NldHRpbmdzO1xuICAgIH1cblxuICAgIHRoaXMuYXBpVXJsID0gdGhpcy5hcGkudXJsO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdjb250cm9sUGxhbmVBUElFbmRwb2ludCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFwaVVybCxcbiAgICAgIGtleTogJ2NvbnRyb2xQbGFuZUFQSUVuZHBvaW50JyxcbiAgICB9KTtcblxuICAgIHRoaXMuand0QXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5VjJBdXRob3JpemVycy5IdHRwSnd0QXV0aG9yaXplcihcbiAgICAgICd0ZW5hbnRzQXV0aG9yaXplcicsXG4gICAgICBwcm9wcy5hdXRoLmp3dElzc3VlcixcbiAgICAgIHtcbiAgICAgICAgand0QXVkaWVuY2U6IHByb3BzLmF1dGguand0QXVkaWVuY2UsXG4gICAgICB9XG4gICAgKTtcbiAgfVxufVxuIl19
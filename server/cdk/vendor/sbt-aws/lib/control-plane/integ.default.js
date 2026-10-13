"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_events_1 = require("aws-cdk-lib/aws-events");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const cdk_nag_1 = require("cdk-nag");
const _1 = require(".");
const destroy_policy_setter_1 = require("../cdk-aspect/destroy-policy-setter");
class IntegStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const cognitoAuth = new _1.CognitoAuth(this, 'CognitoAuth', {
            setAPIGWScopes: false, // only for testing purposes!
        });
        const controlPlane = new _1.ControlPlane(this, 'ControlPlane', {
            auth: cognitoAuth,
            systemAdminEmail: props.systemAdminEmail,
        });
        // for monitoring purposes
        const eventBusWatcherRule = new aws_events_1.Rule(this, 'EventBusWatcherRule', {
            eventBus: aws_events_1.EventBus.fromEventBusArn(this, 'eventBus', controlPlane.eventManager.busArn),
            enabled: true,
            eventPattern: {
                source: [
                    controlPlane.eventManager.controlPlaneEventSource,
                    controlPlane.eventManager.applicationPlaneEventSource,
                ],
            },
        });
        const eventBusWatcherLogGroup = new aws_logs_1.LogGroup(this, 'EventBusWatcherLogGroup', {
            logGroupName: `/aws/events/EventBusWatcher-${this.node.addr}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: aws_logs_1.RetentionDays.ONE_WEEK,
        });
        // use escape-hatch instead of native addTarget functionality to avoid
        // unpredictable resource names that emit cdk-nag errors
        // https://github.com/aws/aws-cdk/issues/17002#issuecomment-1144066244
        const cfnRule = eventBusWatcherRule.node.defaultChild;
        cfnRule.targets = [
            {
                arn: eventBusWatcherLogGroup.logGroupArn,
                id: this.node.addr,
            },
        ];
    }
}
exports.IntegStack = IntegStack;
if (!process.env.CDK_PARAM_SYSTEM_ADMIN_EMAIL) {
    throw new Error('Please provide system admin email');
}
const app = new cdk.App();
const integStack = new IntegStack(app, process.env.CDK_PARAM_STACK_ID ?? 'ControlPlane-integ', {
    systemAdminEmail: process.env.CDK_PARAM_SYSTEM_ADMIN_EMAIL,
    stackName: process.env.CDK_PARAM_STACK_NAME,
});
// Ensure that we remove all resources (like DDB tables, s3 buckets) when deleting the stack.
cdk.Aspects.of(integStack).add(new destroy_policy_setter_1.DestroyPolicySetter());
cdk.Aspects.of(integStack).add(new cdk_nag_1.AwsSolutionsChecks({ verbose: true }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sLXBsYW5lL2ludGVnLmRlZmF1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7OztBQUV0QyxtQ0FBbUM7QUFDbkMsdURBQWlFO0FBQ2pFLG1EQUErRDtBQUMvRCxxQ0FBNkM7QUFDN0Msd0JBQThDO0FBQzlDLCtFQUEwRTtBQU0xRSxNQUFhLFVBQVcsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN2QyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxjQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUN2RCxjQUFjLEVBQUUsS0FBSyxFQUFFLDZCQUE2QjtTQUNyRCxDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQVksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQzFELElBQUksRUFBRSxXQUFXO1lBQ2pCLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxnQkFBZ0I7U0FDekMsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxpQkFBSSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNoRSxRQUFRLEVBQUUscUJBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztZQUN0RixPQUFPLEVBQUUsSUFBSTtZQUNiLFlBQVksRUFBRTtnQkFDWixNQUFNLEVBQUU7b0JBQ04sWUFBWSxDQUFDLFlBQVksQ0FBQyx1QkFBdUI7b0JBQ2pELFlBQVksQ0FBQyxZQUFZLENBQUMsMkJBQTJCO2lCQUN0RDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLG1CQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQzVFLFlBQVksRUFBRSwrQkFBK0IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDN0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxTQUFTLEVBQUUsd0JBQWEsQ0FBQyxRQUFRO1NBQ2xDLENBQUMsQ0FBQztRQUVILHNFQUFzRTtRQUN0RSx3REFBd0Q7UUFDeEQsc0VBQXNFO1FBQ3RFLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxZQUF1QixDQUFDO1FBQ2pFLE9BQU8sQ0FBQyxPQUFPLEdBQUc7WUFDaEI7Z0JBQ0UsR0FBRyxFQUFFLHVCQUF1QixDQUFDLFdBQVc7Z0JBQ3hDLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7YUFDbkI7U0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBMUNELGdDQTBDQztBQUVELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLENBQUM7SUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUM7QUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxvQkFBb0IsRUFBRTtJQUM3RixnQkFBZ0IsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QjtJQUMxRCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0I7Q0FDNUMsQ0FBQyxDQUFDO0FBRUgsNkZBQTZGO0FBQzdGLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDJDQUFtQixFQUFFLENBQUMsQ0FBQztBQUMxRCxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSw0QkFBa0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDZm5SdWxlLCBFdmVudEJ1cywgUnVsZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0IHsgTG9nR3JvdXAsIFJldGVudGlvbkRheXMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgeyBBd3NTb2x1dGlvbnNDaGVja3MgfSBmcm9tICdjZGstbmFnJztcbmltcG9ydCB7IENvZ25pdG9BdXRoLCBDb250cm9sUGxhbmUgfSBmcm9tICcuJztcbmltcG9ydCB7IERlc3Ryb3lQb2xpY3lTZXR0ZXIgfSBmcm9tICcuLi9jZGstYXNwZWN0L2Rlc3Ryb3ktcG9saWN5LXNldHRlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW50ZWdTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBzeXN0ZW1BZG1pbkVtYWlsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzOiBJbnRlZ1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGNvZ25pdG9BdXRoID0gbmV3IENvZ25pdG9BdXRoKHRoaXMsICdDb2duaXRvQXV0aCcsIHtcbiAgICAgIHNldEFQSUdXU2NvcGVzOiBmYWxzZSwgLy8gb25seSBmb3IgdGVzdGluZyBwdXJwb3NlcyFcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbnRyb2xQbGFuZSA9IG5ldyBDb250cm9sUGxhbmUodGhpcywgJ0NvbnRyb2xQbGFuZScsIHtcbiAgICAgIGF1dGg6IGNvZ25pdG9BdXRoLFxuICAgICAgc3lzdGVtQWRtaW5FbWFpbDogcHJvcHMuc3lzdGVtQWRtaW5FbWFpbCxcbiAgICB9KTtcblxuICAgIC8vIGZvciBtb25pdG9yaW5nIHB1cnBvc2VzXG4gICAgY29uc3QgZXZlbnRCdXNXYXRjaGVyUnVsZSA9IG5ldyBSdWxlKHRoaXMsICdFdmVudEJ1c1dhdGNoZXJSdWxlJywge1xuICAgICAgZXZlbnRCdXM6IEV2ZW50QnVzLmZyb21FdmVudEJ1c0Fybih0aGlzLCAnZXZlbnRCdXMnLCBjb250cm9sUGxhbmUuZXZlbnRNYW5hZ2VyLmJ1c0FybiksXG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogW1xuICAgICAgICAgIGNvbnRyb2xQbGFuZS5ldmVudE1hbmFnZXIuY29udHJvbFBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICAgICAgY29udHJvbFBsYW5lLmV2ZW50TWFuYWdlci5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZXZlbnRCdXNXYXRjaGVyTG9nR3JvdXAgPSBuZXcgTG9nR3JvdXAodGhpcywgJ0V2ZW50QnVzV2F0Y2hlckxvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9ldmVudHMvRXZlbnRCdXNXYXRjaGVyLSR7dGhpcy5ub2RlLmFkZHJ9YCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICByZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICAvLyB1c2UgZXNjYXBlLWhhdGNoIGluc3RlYWQgb2YgbmF0aXZlIGFkZFRhcmdldCBmdW5jdGlvbmFsaXR5IHRvIGF2b2lkXG4gICAgLy8gdW5wcmVkaWN0YWJsZSByZXNvdXJjZSBuYW1lcyB0aGF0IGVtaXQgY2RrLW5hZyBlcnJvcnNcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYXdzL2F3cy1jZGsvaXNzdWVzLzE3MDAyI2lzc3VlY29tbWVudC0xMTQ0MDY2MjQ0XG4gICAgY29uc3QgY2ZuUnVsZSA9IGV2ZW50QnVzV2F0Y2hlclJ1bGUubm9kZS5kZWZhdWx0Q2hpbGQgYXMgQ2ZuUnVsZTtcbiAgICBjZm5SdWxlLnRhcmdldHMgPSBbXG4gICAgICB7XG4gICAgICAgIGFybjogZXZlbnRCdXNXYXRjaGVyTG9nR3JvdXAubG9nR3JvdXBBcm4sXG4gICAgICAgIGlkOiB0aGlzLm5vZGUuYWRkcixcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxufVxuXG5pZiAoIXByb2Nlc3MuZW52LkNES19QQVJBTV9TWVNURU1fQURNSU5fRU1BSUwpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2UgcHJvdmlkZSBzeXN0ZW0gYWRtaW4gZW1haWwnKTtcbn1cblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbmNvbnN0IGludGVnU3RhY2sgPSBuZXcgSW50ZWdTdGFjayhhcHAsIHByb2Nlc3MuZW52LkNES19QQVJBTV9TVEFDS19JRCA/PyAnQ29udHJvbFBsYW5lLWludGVnJywge1xuICBzeXN0ZW1BZG1pbkVtYWlsOiBwcm9jZXNzLmVudi5DREtfUEFSQU1fU1lTVEVNX0FETUlOX0VNQUlMLFxuICBzdGFja05hbWU6IHByb2Nlc3MuZW52LkNES19QQVJBTV9TVEFDS19OQU1FLFxufSk7XG5cbi8vIEVuc3VyZSB0aGF0IHdlIHJlbW92ZSBhbGwgcmVzb3VyY2VzIChsaWtlIEREQiB0YWJsZXMsIHMzIGJ1Y2tldHMpIHdoZW4gZGVsZXRpbmcgdGhlIHN0YWNrLlxuY2RrLkFzcGVjdHMub2YoaW50ZWdTdGFjaykuYWRkKG5ldyBEZXN0cm95UG9saWN5U2V0dGVyKCkpO1xuY2RrLkFzcGVjdHMub2YoaW50ZWdTdGFjaykuYWRkKG5ldyBBd3NTb2x1dGlvbnNDaGVja3MoeyB2ZXJib3NlOiB0cnVlIH0pKTtcbiJdfQ==
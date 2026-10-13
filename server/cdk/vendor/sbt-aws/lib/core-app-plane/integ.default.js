"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_events_1 = require("aws-cdk-lib/aws-events");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const cdk_nag_1 = require("cdk-nag");
const _1 = require(".");
const bash_job_runner_1 = require("./bash-job-runner");
const destroy_policy_setter_1 = require("../cdk-aspect/destroy-policy-setter");
const utils_1 = require("../utils");
class IntegStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        let eventBus;
        let eventManager;
        if (props?.eventBusArn) {
            eventBus = aws_events_1.EventBus.fromEventBusArn(this, 'EventBus', props.eventBusArn);
            eventManager = new utils_1.EventManager(this, 'EventManager', {
                eventBus: eventBus,
            });
        }
        else {
            eventManager = new utils_1.EventManager(this, 'EventManager');
        }
        const provisioningJobRunnerProps = {
            permissions: new aws_iam_1.PolicyDocument({
                statements: [
                    new aws_iam_1.PolicyStatement({
                        actions: [
                            'cloudformation:CreateStack',
                            'cloudformation:DescribeStacks',
                            's3:CreateBucket',
                        ],
                        resources: ['*'],
                        effect: aws_iam_1.Effect.ALLOW,
                    }),
                ],
            }),
            script: `
echo "starting..."

# note that this template.yaml is being created here, but
# it could just as easily be pulled in from an S3 bucket.
cat > template.yaml << EndOfMessage
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  "Outputs": {
    "S3Bucket": {
      "Value": {
        "Ref": "MyBucket"
      }
    }
  }
}
EndOfMessage

echo "tenantId: $tenantId"
echo "tier: $tier"

aws cloudformation create-stack --stack-name "tenantTemplateStack-\${tenantId}"  --template-body "file://template.yaml"
aws cloudformation wait stack-create-complete --stack-name "tenantTemplateStack-\${tenantId}"
export tenantS3Bucket=$(aws cloudformation describe-stacks --stack-name "tenantTemplateStack-\${tenantId}" | jq -r '.Stacks[0].Outputs[0].OutputValue')
export someOtherVariable="this is a test"
echo $tenantS3Bucket

export tenantConfig=$(jq --arg SAAS_APP_USERPOOL_ID "MY_SAAS_APP_USERPOOL_ID" \
--arg SAAS_APP_CLIENT_ID "MY_SAAS_APP_CLIENT_ID" \
--arg API_GATEWAY_URL "MY_API_GATEWAY_URL" \
-n '{"userPoolId":$SAAS_APP_USERPOOL_ID,"appClientId":$SAAS_APP_CLIENT_ID,"apiGatewayUrl":$API_GATEWAY_URL}')

echo $tenantConfig
export tenantStatus="created"

echo "done!"
`,
            postScript: '',
            environmentStringVariablesFromIncomingEvent: ['tenantId', 'tier', 'tenantName', 'email'],
            environmentJSONVariablesFromIncomingEvent: ['prices'],
            environmentVariablesToOutgoingEvent: [
                'tenantS3Bucket',
                'someOtherVariable',
                'tenantConfig',
                'tenantStatus',
                'prices', // added so we don't lose it for targets beyond provisioning (ex. billing)
                'tenantName', // added so we don't lose it for targets beyond provisioning (ex. billing)
                'email', // added so we don't lose it for targets beyond provisioning (ex. billing)
            ],
            scriptEnvironmentVariables: {
                TEST: 'test',
            },
            outgoingEvent: utils_1.DetailType.PROVISION_SUCCESS,
            incomingEvent: utils_1.DetailType.ONBOARDING_REQUEST,
            eventManager: eventManager,
        };
        const deprovisioningJobRunnerProps = {
            permissions: new aws_iam_1.PolicyDocument({
                statements: [
                    new aws_iam_1.PolicyStatement({
                        actions: [
                            'cloudformation:DeleteStack',
                            'cloudformation:DescribeStacks',
                            's3:DeleteBucket',
                        ],
                        resources: ['*'],
                        effect: aws_iam_1.Effect.ALLOW,
                    }),
                ],
            }),
            script: `
echo "starting..."

echo "tenantId: $tenantId"

aws cloudformation delete-stack --stack-name "tenantTemplateStack-\${tenantId}"
aws cloudformation wait stack-delete-complete --stack-name "tenantTemplateStack-\${tenantId}"
export status="deleted stack: tenantTemplateStack-\${tenantId}"
export tenantStatus="deleted"
echo "done!"
`,
            environmentStringVariablesFromIncomingEvent: ['tenantId'],
            environmentVariablesToOutgoingEvent: ['tenantStatus'],
            outgoingEvent: utils_1.DetailType.DEPROVISION_SUCCESS,
            incomingEvent: utils_1.DetailType.OFFBOARDING_REQUEST,
            eventManager: eventManager,
        };
        const provisioningJobRunner = new bash_job_runner_1.BashJobRunner(this, 'provisioningJobRunner', provisioningJobRunnerProps);
        const deprovisioningJobRunner = new bash_job_runner_1.BashJobRunner(this, 'deprovisioningJobRunner', deprovisioningJobRunnerProps);
        new _1.CoreApplicationPlane(this, 'CoreApplicationPlane', {
            eventManager: eventManager,
            jobRunnersList: [provisioningJobRunner, deprovisioningJobRunner],
        });
        const eventBusWatcherRule = new aws_events_1.Rule(this, 'EventBusWatcherRule', {
            eventBus: eventBus,
            eventPattern: {
                source: [eventManager.controlPlaneEventSource, eventManager.applicationPlaneEventSource],
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
if (!process.env.CDK_PARAM_EVENT_BUS_ARN) {
    console.log('No CDK_PARAM_EVENT_BUS_ARN found. Stack will create separate event bus for testing.');
}
else {
    console.log('Stack will use event bus passed in for testing.');
}
const app = new cdk.App();
const integStack = new IntegStack(app, process.env.CDK_PARAM_STACK_ID ?? 'CoreAppPlane-integ', {
    eventBusArn: process.env.CDK_PARAM_EVENT_BUS_ARN,
});
cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(integStack, `/${integStack.artifactId}/deprovisioningJobRunner/codeBuildProvisionProjectRole/Resource`, [
    {
        id: 'AwsSolutions-IAM5',
        reason: 'Suppress Resource::* used for testing.',
        appliesTo: ['Resource::*'],
    },
]);
cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(integStack, `/${integStack.artifactId}/provisioningJobRunner/codeBuildProvisionProjectRole/Resource`, [
    {
        id: 'AwsSolutions-IAM5',
        reason: 'Suppress Resource::* used for testing.',
        appliesTo: ['Resource::*'],
    },
]);
cdk.Aspects.of(integStack).add(new destroy_policy_setter_1.DestroyPolicySetter());
cdk.Aspects.of(integStack).add(new cdk_nag_1.AwsSolutionsChecks({ verbose: true }));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlLWFwcC1wbGFuZS9pbnRlZy5kZWZhdWx0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxRUFBcUU7QUFDckUsc0NBQXNDOzs7QUFFdEMsbUNBQW1DO0FBQ25DLHVEQUFpRTtBQUNqRSxpREFBOEU7QUFDOUUsbURBQStEO0FBQy9ELHFDQUE4RDtBQUM5RCx3QkFBeUM7QUFDekMsdURBQXNFO0FBQ3RFLCtFQUEwRTtBQUMxRSxvQ0FBb0Q7QUFNcEQsTUFBYSxVQUFXLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXVCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksUUFBUSxDQUFDO1FBQ2IsSUFBSSxZQUFZLENBQUM7UUFDakIsSUFBSSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDdkIsUUFBUSxHQUFHLHFCQUFRLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pFLFlBQVksR0FBRyxJQUFJLG9CQUFZLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtnQkFDcEQsUUFBUSxFQUFFLFFBQVE7YUFDbkIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDTixZQUFZLEdBQUcsSUFBSSxvQkFBWSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsTUFBTSwwQkFBMEIsR0FBdUI7WUFDckQsV0FBVyxFQUFFLElBQUksd0JBQWMsQ0FBQztnQkFDOUIsVUFBVSxFQUFFO29CQUNWLElBQUkseUJBQWUsQ0FBQzt3QkFDbEIsT0FBTyxFQUFFOzRCQUNQLDRCQUE0Qjs0QkFDNUIsK0JBQStCOzRCQUMvQixpQkFBaUI7eUJBQ2xCO3dC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QW1CLEVBQUUsQ0FBQyxDQUFDO0FBQzFELEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDRCQUFrQixDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcblxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENmblJ1bGUsIEV2ZW50QnVzLCBSdWxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XG5pbXBvcnQgeyBFZmZlY3QsIFBvbGljeURvY3VtZW50LCBQb2xpY3lTdGF0ZW1lbnQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IExvZ0dyb3VwLCBSZXRlbnRpb25EYXlzIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0IHsgQXdzU29sdXRpb25zQ2hlY2tzLCBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tICdjZGstbmFnJztcbmltcG9ydCB7IENvcmVBcHBsaWNhdGlvblBsYW5lIH0gZnJvbSAnLic7XG5pbXBvcnQgeyBCYXNoSm9iUnVubmVyLCBCYXNoSm9iUnVubmVyUHJvcHMgfSBmcm9tICcuL2Jhc2gtam9iLXJ1bm5lcic7XG5pbXBvcnQgeyBEZXN0cm95UG9saWN5U2V0dGVyIH0gZnJvbSAnLi4vY2RrLWFzcGVjdC9kZXN0cm95LXBvbGljeS1zZXR0ZXInO1xuaW1wb3J0IHsgRGV0YWlsVHlwZSwgRXZlbnRNYW5hZ2VyIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEludGVnU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZXZlbnRCdXNBcm4/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogSW50ZWdTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBsZXQgZXZlbnRCdXM7XG4gICAgbGV0IGV2ZW50TWFuYWdlcjtcbiAgICBpZiAocHJvcHM/LmV2ZW50QnVzQXJuKSB7XG4gICAgICBldmVudEJ1cyA9IEV2ZW50QnVzLmZyb21FdmVudEJ1c0Fybih0aGlzLCAnRXZlbnRCdXMnLCBwcm9wcy5ldmVudEJ1c0Fybik7XG4gICAgICBldmVudE1hbmFnZXIgPSBuZXcgRXZlbnRNYW5hZ2VyKHRoaXMsICdFdmVudE1hbmFnZXInLCB7XG4gICAgICAgIGV2ZW50QnVzOiBldmVudEJ1cyxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBldmVudE1hbmFnZXIgPSBuZXcgRXZlbnRNYW5hZ2VyKHRoaXMsICdFdmVudE1hbmFnZXInKTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm92aXNpb25pbmdKb2JSdW5uZXJQcm9wczogQmFzaEpvYlJ1bm5lclByb3BzID0ge1xuICAgICAgcGVybWlzc2lvbnM6IG5ldyBQb2xpY3lEb2N1bWVudCh7XG4gICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uOkNyZWF0ZVN0YWNrJyxcbiAgICAgICAgICAgICAgJ2Nsb3VkZm9ybWF0aW9uOkRlc2NyaWJlU3RhY2tzJyxcbiAgICAgICAgICAgICAgJ3MzOkNyZWF0ZUJ1Y2tldCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIH0pLFxuICAgICAgICBdLFxuICAgICAgfSksXG4gICAgICBzY3JpcHQ6IGBcbmVjaG8gXCJzdGFydGluZy4uLlwiXG5cbiMgbm90ZSB0aGF0IHRoaXMgdGVtcGxhdGUueWFtbCBpcyBiZWluZyBjcmVhdGVkIGhlcmUsIGJ1dFxuIyBpdCBjb3VsZCBqdXN0IGFzIGVhc2lseSBiZSBwdWxsZWQgaW4gZnJvbSBhbiBTMyBidWNrZXQuXG5jYXQgPiB0ZW1wbGF0ZS55YW1sIDw8IEVuZE9mTWVzc2FnZVxue1xuICBcIkFXU1RlbXBsYXRlRm9ybWF0VmVyc2lvblwiOiBcIjIwMTAtMDktMDlcIixcbiAgXCJSZXNvdXJjZXNcIjoge1xuICAgIFwiTXlCdWNrZXRcIjoge1xuICAgICAgXCJUeXBlXCI6IFwiQVdTOjpTMzo6QnVja2V0XCJcbiAgICB9XG4gIH0sXG4gIFwiT3V0cHV0c1wiOiB7XG4gICAgXCJTM0J1Y2tldFwiOiB7XG4gICAgICBcIlZhbHVlXCI6IHtcbiAgICAgICAgXCJSZWZcIjogXCJNeUJ1Y2tldFwiXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5FbmRPZk1lc3NhZ2VcblxuZWNobyBcInRlbmFudElkOiAkdGVuYW50SWRcIlxuZWNobyBcInRpZXI6ICR0aWVyXCJcblxuYXdzIGNsb3VkZm9ybWF0aW9uIGNyZWF0ZS1zdGFjayAtLXN0YWNrLW5hbWUgXCJ0ZW5hbnRUZW1wbGF0ZVN0YWNrLVxcJHt0ZW5hbnRJZH1cIiAgLS10ZW1wbGF0ZS1ib2R5IFwiZmlsZTovL3RlbXBsYXRlLnlhbWxcIlxuYXdzIGNsb3VkZm9ybWF0aW9uIHdhaXQgc3RhY2stY3JlYXRlLWNvbXBsZXRlIC0tc3RhY2stbmFtZSBcInRlbmFudFRlbXBsYXRlU3RhY2stXFwke3RlbmFudElkfVwiXG5leHBvcnQgdGVuYW50UzNCdWNrZXQ9JChhd3MgY2xvdWRmb3JtYXRpb24gZGVzY3JpYmUtc3RhY2tzIC0tc3RhY2stbmFtZSBcInRlbmFudFRlbXBsYXRlU3RhY2stXFwke3RlbmFudElkfVwiIHwganEgLXIgJy5TdGFja3NbMF0uT3V0cHV0c1swXS5PdXRwdXRWYWx1ZScpXG5leHBvcnQgc29tZU90aGVyVmFyaWFibGU9XCJ0aGlzIGlzIGEgdGVzdFwiXG5lY2hvICR0ZW5hbnRTM0J1Y2tldFxuXG5leHBvcnQgdGVuYW50Q29uZmlnPSQoanEgLS1hcmcgU0FBU19BUFBfVVNFUlBPT0xfSUQgXCJNWV9TQUFTX0FQUF9VU0VSUE9PTF9JRFwiIFxcXG4tLWFyZyBTQUFTX0FQUF9DTElFTlRfSUQgXCJNWV9TQUFTX0FQUF9DTElFTlRfSURcIiBcXFxuLS1hcmcgQVBJX0dBVEVXQVlfVVJMIFwiTVlfQVBJX0dBVEVXQVlfVVJMXCIgXFxcbi1uICd7XCJ1c2VyUG9vbElkXCI6JFNBQVNfQVBQX1VTRVJQT09MX0lELFwiYXBwQ2xpZW50SWRcIjokU0FBU19BUFBfQ0xJRU5UX0lELFwiYXBpR2F0ZXdheVVybFwiOiRBUElfR0FURVdBWV9VUkx9JylcblxuZWNobyAkdGVuYW50Q29uZmlnXG5leHBvcnQgdGVuYW50U3RhdHVzPVwiY3JlYXRlZFwiXG5cbmVjaG8gXCJkb25lIVwiXG5gLFxuICAgICAgcG9zdFNjcmlwdDogJycsXG4gICAgICBlbnZpcm9ubWVudFN0cmluZ1ZhcmlhYmxlc0Zyb21JbmNvbWluZ0V2ZW50OiBbJ3RlbmFudElkJywgJ3RpZXInLCAndGVuYW50TmFtZScsICdlbWFpbCddLFxuICAgICAgZW52aXJvbm1lbnRKU09OVmFyaWFibGVzRnJvbUluY29taW5nRXZlbnQ6IFsncHJpY2VzJ10sXG4gICAgICBlbnZpcm9ubWVudFZhcmlhYmxlc1RvT3V0Z29pbmdFdmVudDogW1xuICAgICAgICAndGVuYW50UzNCdWNrZXQnLFxuICAgICAgICAnc29tZU90aGVyVmFyaWFibGUnLFxuICAgICAgICAndGVuYW50Q29uZmlnJyxcbiAgICAgICAgJ3RlbmFudFN0YXR1cycsXG4gICAgICAgICdwcmljZXMnLCAvLyBhZGRlZCBzbyB3ZSBkb24ndCBsb3NlIGl0IGZvciB0YXJnZXRzIGJleW9uZCBwcm92aXNpb25pbmcgKGV4LiBiaWxsaW5nKVxuICAgICAgICAndGVuYW50TmFtZScsIC8vIGFkZGVkIHNvIHdlIGRvbid0IGxvc2UgaXQgZm9yIHRhcmdldHMgYmV5b25kIHByb3Zpc2lvbmluZyAoZXguIGJpbGxpbmcpXG4gICAgICAgICdlbWFpbCcsIC8vIGFkZGVkIHNvIHdlIGRvbid0IGxvc2UgaXQgZm9yIHRhcmdldHMgYmV5b25kIHByb3Zpc2lvbmluZyAoZXguIGJpbGxpbmcpXG4gICAgICBdLFxuICAgICAgc2NyaXB0RW52aXJvbm1lbnRWYXJpYWJsZXM6IHtcbiAgICAgICAgVEVTVDogJ3Rlc3QnLFxuICAgICAgfSxcbiAgICAgIG91dGdvaW5nRXZlbnQ6IERldGFpbFR5cGUuUFJPVklTSU9OX1NVQ0NFU1MsXG4gICAgICBpbmNvbWluZ0V2ZW50OiBEZXRhaWxUeXBlLk9OQk9BUkRJTkdfUkVRVUVTVCxcbiAgICAgIGV2ZW50TWFuYWdlcjogZXZlbnRNYW5hZ2VyLFxuICAgIH07XG5cbiAgICBjb25zdCBkZXByb3Zpc2lvbmluZ0pvYlJ1bm5lclByb3BzOiBCYXNoSm9iUnVubmVyUHJvcHMgPSB7XG4gICAgICBwZXJtaXNzaW9uczogbmV3IFBvbGljeURvY3VtZW50KHtcbiAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVsZXRlU3RhY2snLFxuICAgICAgICAgICAgICAnY2xvdWRmb3JtYXRpb246RGVzY3JpYmVTdGFja3MnLFxuICAgICAgICAgICAgICAnczM6RGVsZXRlQnVja2V0JyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgICAgfSksXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICAgIHNjcmlwdDogYFxuZWNobyBcInN0YXJ0aW5nLi4uXCJcblxuZWNobyBcInRlbmFudElkOiAkdGVuYW50SWRcIlxuXG5hd3MgY2xvdWRmb3JtYXRpb24gZGVsZXRlLXN0YWNrIC0tc3RhY2stbmFtZSBcInRlbmFudFRlbXBsYXRlU3RhY2stXFwke3RlbmFudElkfVwiXG5hd3MgY2xvdWRmb3JtYXRpb24gd2FpdCBzdGFjay1kZWxldGUtY29tcGxldGUgLS1zdGFjay1uYW1lIFwidGVuYW50VGVtcGxhdGVTdGFjay1cXCR7dGVuYW50SWR9XCJcbmV4cG9ydCBzdGF0dXM9XCJkZWxldGVkIHN0YWNrOiB0ZW5hbnRUZW1wbGF0ZVN0YWNrLVxcJHt0ZW5hbnRJZH1cIlxuZXhwb3J0IHRlbmFudFN0YXR1cz1cImRlbGV0ZWRcIlxuZWNobyBcImRvbmUhXCJcbmAsXG4gICAgICBlbnZpcm9ubWVudFN0cmluZ1ZhcmlhYmxlc0Zyb21JbmNvbWluZ0V2ZW50OiBbJ3RlbmFudElkJ10sXG4gICAgICBlbnZpcm9ubWVudFZhcmlhYmxlc1RvT3V0Z29pbmdFdmVudDogWyd0ZW5hbnRTdGF0dXMnXSxcbiAgICAgIG91dGdvaW5nRXZlbnQ6IERldGFpbFR5cGUuREVQUk9WSVNJT05fU1VDQ0VTUyxcbiAgICAgIGluY29taW5nRXZlbnQ6IERldGFpbFR5cGUuT0ZGQk9BUkRJTkdfUkVRVUVTVCxcbiAgICAgIGV2ZW50TWFuYWdlcjogZXZlbnRNYW5hZ2VyLFxuICAgIH07XG5cbiAgICBjb25zdCBwcm92aXNpb25pbmdKb2JSdW5uZXI6IEJhc2hKb2JSdW5uZXIgPSBuZXcgQmFzaEpvYlJ1bm5lcihcbiAgICAgIHRoaXMsXG4gICAgICAncHJvdmlzaW9uaW5nSm9iUnVubmVyJyxcbiAgICAgIHByb3Zpc2lvbmluZ0pvYlJ1bm5lclByb3BzXG4gICAgKTtcbiAgICBjb25zdCBkZXByb3Zpc2lvbmluZ0pvYlJ1bm5lcjogQmFzaEpvYlJ1bm5lciA9IG5ldyBCYXNoSm9iUnVubmVyKFxuICAgICAgdGhpcyxcbiAgICAgICdkZXByb3Zpc2lvbmluZ0pvYlJ1bm5lcicsXG4gICAgICBkZXByb3Zpc2lvbmluZ0pvYlJ1bm5lclByb3BzXG4gICAgKTtcblxuICAgIG5ldyBDb3JlQXBwbGljYXRpb25QbGFuZSh0aGlzLCAnQ29yZUFwcGxpY2F0aW9uUGxhbmUnLCB7XG4gICAgICBldmVudE1hbmFnZXI6IGV2ZW50TWFuYWdlcixcbiAgICAgIGpvYlJ1bm5lcnNMaXN0OiBbcHJvdmlzaW9uaW5nSm9iUnVubmVyLCBkZXByb3Zpc2lvbmluZ0pvYlJ1bm5lcl0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBldmVudEJ1c1dhdGNoZXJSdWxlID0gbmV3IFJ1bGUodGhpcywgJ0V2ZW50QnVzV2F0Y2hlclJ1bGUnLCB7XG4gICAgICBldmVudEJ1czogZXZlbnRCdXMsXG4gICAgICBldmVudFBhdHRlcm46IHtcbiAgICAgICAgc291cmNlOiBbZXZlbnRNYW5hZ2VyLmNvbnRyb2xQbGFuZUV2ZW50U291cmNlLCBldmVudE1hbmFnZXIuYXBwbGljYXRpb25QbGFuZUV2ZW50U291cmNlXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBldmVudEJ1c1dhdGNoZXJMb2dHcm91cCA9IG5ldyBMb2dHcm91cCh0aGlzLCAnRXZlbnRCdXNXYXRjaGVyTG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2V2ZW50cy9FdmVudEJ1c1dhdGNoZXItJHt0aGlzLm5vZGUuYWRkcn1gLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHJldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICB9KTtcblxuICAgIC8vIHVzZSBlc2NhcGUtaGF0Y2ggaW5zdGVhZCBvZiBuYXRpdmUgYWRkVGFyZ2V0IGZ1bmN0aW9uYWxpdHkgdG8gYXZvaWRcbiAgICAvLyB1bnByZWRpY3RhYmxlIHJlc291cmNlIG5hbWVzIHRoYXQgZW1pdCBjZGstbmFnIGVycm9yc1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMTcwMDIjaXNzdWVjb21tZW50LTExNDQwNjYyNDRcbiAgICBjb25zdCBjZm5SdWxlID0gZXZlbnRCdXNXYXRjaGVyUnVsZS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBDZm5SdWxlO1xuICAgIGNmblJ1bGUudGFyZ2V0cyA9IFtcbiAgICAgIHtcbiAgICAgICAgYXJuOiBldmVudEJ1c1dhdGNoZXJMb2dHcm91cC5sb2dHcm91cEFybixcbiAgICAgICAgaWQ6IHRoaXMubm9kZS5hZGRyLFxuICAgICAgfSxcbiAgICBdO1xuICB9XG59XG5cbmlmICghcHJvY2Vzcy5lbnYuQ0RLX1BBUkFNX0VWRU5UX0JVU19BUk4pIHtcbiAgY29uc29sZS5sb2coXG4gICAgJ05vIENES19QQVJBTV9FVkVOVF9CVVNfQVJOIGZvdW5kLiBTdGFjayB3aWxsIGNyZWF0ZSBzZXBhcmF0ZSBldmVudCBidXMgZm9yIHRlc3RpbmcuJ1xuICApO1xufSBlbHNlIHtcbiAgY29uc29sZS5sb2coJ1N0YWNrIHdpbGwgdXNlIGV2ZW50IGJ1cyBwYXNzZWQgaW4gZm9yIHRlc3RpbmcuJyk7XG59XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5jb25zdCBpbnRlZ1N0YWNrID0gbmV3IEludGVnU3RhY2soYXBwLCBwcm9jZXNzLmVudi5DREtfUEFSQU1fU1RBQ0tfSUQgPz8gJ0NvcmVBcHBQbGFuZS1pbnRlZycsIHtcbiAgZXZlbnRCdXNBcm46IHByb2Nlc3MuZW52LkNES19QQVJBTV9FVkVOVF9CVVNfQVJOLFxufSk7XG5cbk5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgaW50ZWdTdGFjayxcbiAgYC8ke2ludGVnU3RhY2suYXJ0aWZhY3RJZH0vZGVwcm92aXNpb25pbmdKb2JSdW5uZXIvY29kZUJ1aWxkUHJvdmlzaW9uUHJvamVjdFJvbGUvUmVzb3VyY2VgLFxuICBbXG4gICAge1xuICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICByZWFzb246ICdTdXBwcmVzcyBSZXNvdXJjZTo6KiB1c2VkIGZvciB0ZXN0aW5nLicsXG4gICAgICBhcHBsaWVzVG86IFsnUmVzb3VyY2U6OionXSxcbiAgICB9LFxuICBdXG4pO1xuXG5OYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gIGludGVnU3RhY2ssXG4gIGAvJHtpbnRlZ1N0YWNrLmFydGlmYWN0SWR9L3Byb3Zpc2lvbmluZ0pvYlJ1bm5lci9jb2RlQnVpbGRQcm92aXNpb25Qcm9qZWN0Um9sZS9SZXNvdXJjZWAsXG4gIFtcbiAgICB7XG4gICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgIHJlYXNvbjogJ1N1cHByZXNzIFJlc291cmNlOjoqIHVzZWQgZm9yIHRlc3RpbmcuJyxcbiAgICAgIGFwcGxpZXNUbzogWydSZXNvdXJjZTo6KiddLFxuICAgIH0sXG4gIF1cbik7XG5cbmNkay5Bc3BlY3RzLm9mKGludGVnU3RhY2spLmFkZChuZXcgRGVzdHJveVBvbGljeVNldHRlcigpKTtcbmNkay5Bc3BlY3RzLm9mKGludGVnU3RhY2spLmFkZChuZXcgQXdzU29sdXRpb25zQ2hlY2tzKHsgdmVyYm9zZTogdHJ1ZSB9KSk7XG4iXX0=
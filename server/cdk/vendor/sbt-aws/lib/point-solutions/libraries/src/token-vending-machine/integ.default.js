#!/usr/bin/env node
"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_cognito_1 = require("aws-cdk-lib/aws-cognito");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
//import { Runtime, LayerVersion, Code } from 'aws-cdk-lib/aws-lambda';
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
class IntegStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const region = this.region;
        // const layer = new LayerVersion(this, 'Layer', {
        //   code: Code.fromAsset(path.join(__dirname, 'src'), {
        //     bundling: {
        //       image: Runtime.NODEJS_18_X.bundlingImage,
        //       command: [
        //         'bash',
        //         '-c',
        //         [
        //           'pwd',
        //           'cd ..',
        //           'npm install -g npm@latest',
        //           'npm install',
        //           'chmod -R 755 ./node_modules',
        //         ].join(' && '),
        //       ],
        //     },
        //   }),
        //   compatibleRuntimes: [Runtime.NODEJS_18_X],
        // });
        const testFunctionExecRole = new aws_iam_1.Role(this, "tenantManagementExecRole", {
            assumedBy: new aws_iam_1.ServicePrincipal("lambda.amazonaws.com"),
        });
        testFunctionExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"));
        const abacRole = new aws_iam_1.Role(this, "abacRole", {
            assumedBy: new aws_iam_1.ServicePrincipal("lambda.amazonaws.com"),
        });
        abacRole.assumeRolePolicy?.addStatements(new aws_iam_1.PolicyStatement({
            actions: ["sts:AssumeRole", "sts:TagSession"],
            effect: aws_iam_1.Effect.ALLOW,
            principals: [new aws_iam_1.ArnPrincipal(testFunctionExecRole.roleArn)],
            conditions: {
                StringLike: {
                    "aws:RequestTag/TenantId": "*",
                },
            },
        }));
        const table = new aws_dynamodb_1.Table(this, "Table", {
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
            partitionKey: {
                name: "tenantId",
                type: aws_dynamodb_1.AttributeType.STRING,
            },
        });
        abacRole.addToPolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: [
                "dynamodb:UpdateItem",
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
            ],
            resources: [table.tableArn],
            conditions: {
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": ["${aws:PrincipalTag/TenantId}"],
                },
            },
        }));
        const userPool = new aws_cognito_1.UserPool(this, "UserPool", {
            userPoolName: "TestUserPool",
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                },
            },
            customAttributes: {
                tenantId: new aws_cognito_1.StringAttribute({ mutable: false }),
            },
        });
        const userPoolClient = new aws_cognito_1.UserPoolClient(this, "UserPoolClient", {
            userPool: userPool,
            userPoolClientName: "TestUserPoolClient",
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
                custom: true,
            },
            writeAttributes: new aws_cognito_1.ClientAttributes()
                .withStandardAttributes({
                email: true,
            })
                .withCustomAttributes("custom:tenantId"),
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: true,
                },
                scopes: [aws_cognito_1.OAuthScope.EMAIL, aws_cognito_1.OAuthScope.OPENID, aws_cognito_1.OAuthScope.PROFILE],
            },
        });
        testFunctionExecRole.addToPolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminSetUserPassword",
                "cognito-idp:InitiateAuth",
            ],
            resources: [userPool.userPoolArn],
        }));
        const idp_details = {
            issuer: `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}/`,
            audience: userPoolClient.userPoolClientId,
        };
        new aws_lambda_nodejs_1.NodejsFunction(this, "TestFunction", {
            entry: "point-solutions/libraries/token-vending-machine/test/data-access-layer.ts",
            handler: "handler",
            runtime: aws_lambda_1.Runtime.NODEJS_LATEST,
            role: testFunctionExecRole,
            timeout: cdk.Duration.minutes(1),
            environment: {
                IAM_ROLE_ARN: abacRole.roleArn,
                IDP_DETAILS: JSON.stringify(idp_details),
                REQUEST_TAG_KEYS_MAPPING_ATTRIBUTES: '{"TenantId":"custom:tenantId"}',
                USERPOOL_ID: userPool.userPoolId,
                APPCLIENT_ID: userPoolClient.userPoolClientId,
                TABLE_NAME: table.tableName,
            },
        });
    }
}
exports.IntegStack = IntegStack;
if (!process.env.CDK_PARAM_EMAIL) {
    throw new Error("Please provide email");
}
const app = new cdk.App();
// const integStack =
new IntegStack(app, "token-vending-machine-integ", {
    email: process.env.CDK_PARAM_EMAIL,
});
// Ensure that we remove all resources (like DDB tables, s3 buckets) when deleting the stack.
// cdk.Aspects.of(integStack).add(new DestroyPolicySetter());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuZGVmYXVsdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wb2ludC1zb2x1dGlvbnMvbGlicmFyaWVzL3NyYy90b2tlbi12ZW5kaW5nLW1hY2hpbmUvaW50ZWcuZGVmYXVsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7OztBQUV0QyxtQ0FBbUM7QUFDbkMseURBTWlDO0FBQ2pDLDJEQUE2RTtBQUM3RSxpREFPNkI7QUFDN0IsdUVBQXVFO0FBQ3ZFLHVEQUFpRDtBQUNqRCxxRUFBK0Q7QUFPL0QsTUFBYSxVQUFXLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFFM0Isa0RBQWtEO1FBQ2xELHdEQUF3RDtRQUN4RCxrQkFBa0I7UUFDbEIsa0RBQWtEO1FBQ2xELG1CQUFtQjtRQUNuQixrQkFBa0I7UUFDbEIsZ0JBQWdCO1FBQ2hCLFlBQVk7UUFDWixtQkFBbUI7UUFDbkIscUJBQXFCO1FBQ3JCLHlDQUF5QztRQUN6QywyQkFBMkI7UUFDM0IsMkNBQTJDO1FBQzNDLDBCQUEwQjtRQUMxQixXQUFXO1FBQ1gsU0FBUztRQUNULFFBQVE7UUFDUiwrQ0FBK0M7UUFDL0MsTUFBTTtRQUVOLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ3RFLFNBQVMsRUFBRSxJQUFJLDBCQUFnQixDQUFDLHNCQUFzQixDQUFDO1NBQ3hELENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLGdCQUFnQixDQUNuQyx1QkFBYSxDQUFDLHdCQUF3QixDQUNwQywwQ0FBMEMsQ0FDM0MsQ0FDRixDQUFDO1FBRUYs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QUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsNkJBQTZCLEVBQUU7SUFDakQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZTtDQUNuQyxDQUFDLENBQUM7QUFFSCw2RkFBNkY7QUFDN0YsNkRBQTZEIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQge1xuICBVc2VyUG9vbCxcbiAgU3RyaW5nQXR0cmlidXRlLFxuICBVc2VyUG9vbENsaWVudCxcbiAgQ2xpZW50QXR0cmlidXRlcyxcbiAgT0F1dGhTY29wZSxcbn0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvXCI7XG5pbXBvcnQgeyBUYWJsZSwgQXR0cmlidXRlVHlwZSwgQmlsbGluZ01vZGUgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5pbXBvcnQge1xuICBSb2xlLFxuICBTZXJ2aWNlUHJpbmNpcGFsLFxuICBNYW5hZ2VkUG9saWN5LFxuICBQb2xpY3lTdGF0ZW1lbnQsXG4gIEFyblByaW5jaXBhbCxcbiAgRWZmZWN0LFxufSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuLy9pbXBvcnQgeyBSdW50aW1lLCBMYXllclZlcnNpb24sIENvZGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IFJ1bnRpbWUgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanNcIjtcbi8vIGltcG9ydCB7IERlc3Ryb3lQb2xpY3lTZXR0ZXIgfSBmcm9tIFwiLi4vLi4vLi4vY2RrLWFzcGVjdC9kZXN0cm95LXBvbGljeS1zZXR0ZXJcIjtcblxuZXhwb3J0IGludGVyZmFjZSBJbnRlZ1N0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVtYWlsOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlZ1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzOiBJbnRlZ1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHJlZ2lvbiA9IHRoaXMucmVnaW9uO1xuXG4gICAgLy8gY29uc3QgbGF5ZXIgPSBuZXcgTGF5ZXJWZXJzaW9uKHRoaXMsICdMYXllcicsIHtcbiAgICAvLyAgIGNvZGU6IENvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdzcmMnKSwge1xuICAgIC8vICAgICBidW5kbGluZzoge1xuICAgIC8vICAgICAgIGltYWdlOiBSdW50aW1lLk5PREVKU18xOF9YLmJ1bmRsaW5nSW1hZ2UsXG4gICAgLy8gICAgICAgY29tbWFuZDogW1xuICAgIC8vICAgICAgICAgJ2Jhc2gnLFxuICAgIC8vICAgICAgICAgJy1jJyxcbiAgICAvLyAgICAgICAgIFtcbiAgICAvLyAgICAgICAgICAgJ3B3ZCcsXG4gICAgLy8gICAgICAgICAgICdjZCAuLicsXG4gICAgLy8gICAgICAgICAgICducG0gaW5zdGFsbCAtZyBucG1AbGF0ZXN0JyxcbiAgICAvLyAgICAgICAgICAgJ25wbSBpbnN0YWxsJyxcbiAgICAvLyAgICAgICAgICAgJ2NobW9kIC1SIDc1NSAuL25vZGVfbW9kdWxlcycsXG4gICAgLy8gICAgICAgICBdLmpvaW4oJyAmJiAnKSxcbiAgICAvLyAgICAgICBdLFxuICAgIC8vICAgICB9LFxuICAgIC8vICAgfSksXG4gICAgLy8gICBjb21wYXRpYmxlUnVudGltZXM6IFtSdW50aW1lLk5PREVKU18xOF9YXSxcbiAgICAvLyB9KTtcblxuICAgIGNvbnN0IHRlc3RGdW5jdGlvbkV4ZWNSb2xlID0gbmV3IFJvbGUodGhpcywgXCJ0ZW5hbnRNYW5hZ2VtZW50RXhlY1JvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgU2VydmljZVByaW5jaXBhbChcImxhbWJkYS5hbWF6b25hd3MuY29tXCIpLFxuICAgIH0pO1xuXG4gICAgdGVzdEZ1bmN0aW9uRXhlY1JvbGUuYWRkTWFuYWdlZFBvbGljeShcbiAgICAgIE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICBcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIixcbiAgICAgICksXG4gICAgKTtcblxuICAgIGNvbnN0IGFiYWNSb2xlID0gbmV3IFJvbGUodGhpcywgXCJhYmFjUm9sZVwiLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKFwibGFtYmRhLmFtYXpvbmF3cy5jb21cIiksXG4gICAgfSk7XG5cbiAgICBhYmFjUm9sZS5hc3N1bWVSb2xlUG9saWN5Py5hZGRTdGF0ZW1lbnRzKFxuICAgICAgbmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcInN0czpBc3N1bWVSb2xlXCIsIFwic3RzOlRhZ1Nlc3Npb25cIl0sXG4gICAgICAgIGVmZmVjdDogRWZmZWN0LkFMTE9XLFxuICAgICAgICBwcmluY2lwYWxzOiBbbmV3IEFyblByaW5jaXBhbCh0ZXN0RnVuY3Rpb25FeGVjUm9sZS5yb2xlQXJuKV0sXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICBTdHJpbmdMaWtlOiB7XG4gICAgICAgICAgICBcImF3czpSZXF1ZXN0VGFnL1RlbmFudElkXCI6IFwiKlwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgY29uc3QgdGFibGUgPSBuZXcgVGFibGUodGhpcywgXCJUYWJsZVwiLCB7XG4gICAgICBiaWxsaW5nTW9kZTogQmlsbGluZ01vZGUuUFJPVklTSU9ORUQsXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXG4gICAgICB3cml0ZUNhcGFjaXR5OiA1LFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6IFwidGVuYW50SWRcIixcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgYWJhY1JvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICBcImR5bmFtb2RiOlVwZGF0ZUl0ZW1cIixcbiAgICAgICAgICBcImR5bmFtb2RiOkdldEl0ZW1cIixcbiAgICAgICAgICBcImR5bmFtb2RiOlB1dEl0ZW1cIixcbiAgICAgICAgICBcImR5bmFtb2RiOkRlbGV0ZUl0ZW1cIixcbiAgICAgICAgICBcImR5bmFtb2RiOlF1ZXJ5XCIsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW3RhYmxlLnRhYmxlQXJuXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIFwiRm9yQWxsVmFsdWVzOlN0cmluZ0VxdWFsc1wiOiB7XG4gICAgICAgICAgICBcImR5bmFtb2RiOkxlYWRpbmdLZXlzXCI6IFtcIiR7YXdzOlByaW5jaXBhbFRhZy9UZW5hbnRJZH1cIl0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBVc2VyUG9vbCh0aGlzLCBcIlVzZXJQb29sXCIsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogXCJUZXN0VXNlclBvb2xcIixcbiAgICAgIGF1dG9WZXJpZnk6IHtcbiAgICAgICAgZW1haWw6IHRydWUsXG4gICAgICB9LFxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY3VzdG9tQXR0cmlidXRlczoge1xuICAgICAgICB0ZW5hbnRJZDogbmV3IFN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IGZhbHNlIH0pLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBVc2VyUG9vbENsaWVudCh0aGlzLCBcIlVzZXJQb29sQ2xpZW50XCIsIHtcbiAgICAgIHVzZXJQb29sOiB1c2VyUG9vbCxcbiAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogXCJUZXN0VXNlclBvb2xDbGllbnRcIixcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICAgIGFkbWluVXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgICBjdXN0b206IHRydWUsXG4gICAgICB9LFxuICAgICAgd3JpdGVBdHRyaWJ1dGVzOiBuZXcgQ2xpZW50QXR0cmlidXRlcygpXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgICAgfSlcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKFwiY3VzdG9tOnRlbmFudElkXCIpLFxuICAgICAgb0F1dGg6IHtcbiAgICAgICAgZmxvd3M6IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uQ29kZUdyYW50OiB0cnVlLFxuICAgICAgICAgIGltcGxpY2l0Q29kZUdyYW50OiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICBzY29wZXM6IFtPQXV0aFNjb3BlLkVNQUlMLCBPQXV0aFNjb3BlLk9QRU5JRCwgT0F1dGhTY29wZS5QUk9GSUxFXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0ZXN0RnVuY3Rpb25FeGVjUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IEVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgIFwiY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyXCIsXG4gICAgICAgICAgXCJjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZFwiLFxuICAgICAgICAgIFwiY29nbml0by1pZHA6SW5pdGlhdGVBdXRoXCIsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogW3VzZXJQb29sLnVzZXJQb29sQXJuXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICBjb25zdCBpZHBfZGV0YWlscyA9IHtcbiAgICAgIGlzc3VlcjogYGh0dHBzOi8vY29nbml0by1pZHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHt1c2VyUG9vbC51c2VyUG9vbElkfS9gLFxuICAgICAgYXVkaWVuY2U6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgfTtcblxuICAgIG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCBcIlRlc3RGdW5jdGlvblwiLCB7XG4gICAgICBlbnRyeTpcbiAgICAgICAgXCJwb2ludC1zb2x1dGlvbnMvbGlicmFyaWVzL3Rva2VuLXZlbmRpbmctbWFjaGluZS90ZXN0L2RhdGEtYWNjZXNzLWxheWVyLnRzXCIsXG4gICAgICBoYW5kbGVyOiBcImhhbmRsZXJcIixcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTX0xBVEVTVCxcbiAgICAgIHJvbGU6IHRlc3RGdW5jdGlvbkV4ZWNSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBJQU1fUk9MRV9BUk46IGFiYWNSb2xlLnJvbGVBcm4sXG4gICAgICAgIElEUF9ERVRBSUxTOiBKU09OLnN0cmluZ2lmeShpZHBfZGV0YWlscyksXG4gICAgICAgIFJFUVVFU1RfVEFHX0tFWVNfTUFQUElOR19BVFRSSUJVVEVTOiAne1wiVGVuYW50SWRcIjpcImN1c3RvbTp0ZW5hbnRJZFwifScsXG4gICAgICAgIFVTRVJQT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBBUFBDTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgIFRBQkxFX05BTUU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn1cblxuaWYgKCFwcm9jZXNzLmVudi5DREtfUEFSQU1fRU1BSUwpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFwiUGxlYXNlIHByb3ZpZGUgZW1haWxcIik7XG59XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4vLyBjb25zdCBpbnRlZ1N0YWNrID1cbm5ldyBJbnRlZ1N0YWNrKGFwcCwgXCJ0b2tlbi12ZW5kaW5nLW1hY2hpbmUtaW50ZWdcIiwge1xuICBlbWFpbDogcHJvY2Vzcy5lbnYuQ0RLX1BBUkFNX0VNQUlMLFxufSk7XG5cbi8vIEVuc3VyZSB0aGF0IHdlIHJlbW92ZSBhbGwgcmVzb3VyY2VzIChsaWtlIEREQiB0YWJsZXMsIHMzIGJ1Y2tldHMpIHdoZW4gZGVsZXRpbmcgdGhlIHN0YWNrLlxuLy8gY2RrLkFzcGVjdHMub2YoaW50ZWdTdGFjaykuYWRkKG5ldyBEZXN0cm95UG9saWN5U2V0dGVyKCkpO1xuIl19
"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitoAuth = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const path = require("path");
const aws_lambda_python_alpha_1 = require("@aws-cdk/aws-lambda-python-alpha");
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
 * Constructs for setting up Cognito authentication and user management.
 */
class CognitoAuth extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'CognitoAuth');
        // https://docs.powertools.aws.dev/lambda/python/2.31.0/#lambda-layer
        const lambdaPowertoolsLayer = aws_lambda_1.LayerVersion.fromLayerVersionArn(this, 'LambdaPowerTools', `arn:aws:lambda:${aws_cdk_lib_1.Stack.of(this).region}:017000801446:layer:AWSLambdaPowertoolsPythonV2:59`);
        const defaultControlPlaneCallbackURL = 'http://localhost';
        const controlPlaneCallbackURL = props?.controlPlaneCallbackURL || defaultControlPlaneCallbackURL;
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            autoVerify: { email: true },
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            userInvitation: {
                emailSubject: 'Your temporary password for control plane UI',
                emailBody: `Login into control plane UI at ${controlPlaneCallbackURL} with username {username} and temporary password {####}`,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            standardAttributes: {
                email: { required: true, mutable: true },
            },
            customAttributes: {
                userRole: new cognito.StringAttribute({ mutable: true, minLen: 1, maxLen: 256 }),
            },
            advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.userPool, [
            {
                id: 'AwsSolutions-COG2',
                reason: 'Not requiring MFA at this phase.',
            },
        ]);
        const readUserScope = new cognito.ResourceServerScope({
            scopeName: 'user_read',
            scopeDescription: 'Read access to users.',
        });
        const writeUserScope = new cognito.ResourceServerScope({
            scopeName: 'user_write',
            scopeDescription: 'Write access to users.',
        });
        const userResourceServer = this.userPool.addResourceServer('UserResourceServer', {
            identifier: 'user',
            scopes: [readUserScope, writeUserScope],
        });
        const userResourceServerReadScope = cognito.OAuthScope.resourceServer(userResourceServer, readUserScope);
        const userResourceServerWriteScope = cognito.OAuthScope.resourceServer(userResourceServer, writeUserScope);
        if (props?.setAPIGWScopes != false) {
            this.fetchUserScope = userResourceServerReadScope.scopeName;
            this.fetchAllUsersScope = userResourceServerReadScope.scopeName;
            this.deleteUserScope = userResourceServerWriteScope.scopeName;
            this.createUserScope = userResourceServerWriteScope.scopeName;
            this.updateUserScope = userResourceServerWriteScope.scopeName;
            this.disableUserScope = userResourceServerWriteScope.scopeName;
            this.enableUserScope = userResourceServerWriteScope.scopeName;
        }
        const readTenantScope = new cognito.ResourceServerScope({
            scopeName: 'tenant_read',
            scopeDescription: 'Read access to tenants.',
        });
        const writeTenantScope = new cognito.ResourceServerScope({
            scopeName: 'tenant_write',
            scopeDescription: 'Write access to tenants.',
        });
        const tenantResourceServer = this.userPool.addResourceServer('TenantResourceServer', {
            identifier: 'tenant',
            scopes: [readTenantScope, writeTenantScope],
        });
        const tenantResourceServerReadScope = cognito.OAuthScope.resourceServer(tenantResourceServer, readTenantScope);
        const tenantResourceServerWriteScope = cognito.OAuthScope.resourceServer(tenantResourceServer, writeTenantScope);
        if (props?.setAPIGWScopes != false) {
            this.fetchTenantScope = tenantResourceServerReadScope.scopeName;
            this.fetchAllTenantsScope = tenantResourceServerReadScope.scopeName;
            this.deleteTenantScope = tenantResourceServerWriteScope.scopeName;
            this.createTenantScope = tenantResourceServerWriteScope.scopeName;
            this.updateTenantScope = tenantResourceServerWriteScope.scopeName;
            this.activateTenantScope = tenantResourceServerWriteScope.scopeName;
            this.deactivateTenantScope = tenantResourceServerWriteScope.scopeName;
        }
        // Create a Cognito User Pool Domain
        const userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: `${cdk.Stack.of(this).account}-${this.node.addr}`,
            },
        });
        const userPoolMachineClient = new cognito.UserPoolClient(this, 'UserPoolMachineClient', {
            userPool: this.userPool,
            generateSecret: true,
            authFlows: {
                userPassword: false,
                userSrp: false,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: false,
                    implicitCodeGrant: false,
                    clientCredentials: true,
                },
                scopes: [tenantResourceServerWriteScope],
            },
        });
        const userPoolUserClient = new cognito.UserPoolClient(this, 'UserPoolUserClient', {
            userPool: this.userPool,
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
            oAuth: {
                callbackUrls: [controlPlaneCallbackURL],
                logoutUrls: [controlPlaneCallbackURL],
                flows: {
                    authorizationCodeGrant: true,
                    implicitCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                    tenantResourceServerReadScope,
                    tenantResourceServerWriteScope,
                    userResourceServerReadScope,
                    userResourceServerWriteScope,
                ],
            },
            writeAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({ email: true })
                .withCustomAttributes('userRole'),
        });
        const region = cdk.Stack.of(this).region;
        this.userClientId = userPoolUserClient.userPoolClientId;
        this.machineClientId = userPoolMachineClient.userPoolClientId;
        this.machineClientSecret = userPoolMachineClient.userPoolClientSecret;
        this.wellKnownEndpointUrl = `https://cognito-idp.${region}.amazonaws.com/${this.userPool.userPoolId}/.well-known/openid-configuration`;
        this.jwtIssuer = `https://cognito-idp.${region}.amazonaws.com/${this.userPool.userPoolId}`;
        this.jwtAudience = [
            userPoolUserClient.userPoolClientId,
            userPoolMachineClient.userPoolClientId,
        ];
        this.tokenEndpoint = `https://${userPoolDomain.domainName}.auth.${region}.amazoncognito.com/oauth2/token`;
        // TODO: The caller should be surfacing these, not the implementor
        new cdk.CfnOutput(this, 'ControlPlaneIdpUserPoolId', {
            value: this.userPool.userPoolId,
            key: 'ControlPlaneIdpUserPoolId',
        });
        new cdk.CfnOutput(this, 'ControlPlaneIdpClientId', {
            value: userPoolUserClient.userPoolClientId,
            key: 'ControlPlaneIdpClientId',
        });
        const userManagementExecRole = new aws_iam_1.Role(this, 'userManagementExecRole', {
            assumedBy: new aws_iam_1.ServicePrincipal('lambda.amazonaws.com'),
        });
        userManagementExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
        userManagementExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLambdaInsightsExecutionRolePolicy'));
        userManagementExecRole.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'));
        userManagementExecRole.addToPolicy(new aws_iam_1.PolicyStatement({
            actions: [
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminEnableUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDisableUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminGetUser',
                'cognito-idp:ListUsers',
            ],
            effect: aws_iam_1.Effect.ALLOW,
            resources: ['*'],
        }));
        cdk_nag_1.NagSuppressions.addResourceSuppressions(userManagementExecRole, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Auth user resource name(s) not known beforehand.',
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
        ], true);
        const userManagementServices = new aws_lambda_python_alpha_1.PythonFunction(this, 'UserManagementServices', {
            entry: path.join(__dirname, '../../../resources/functions/user-management'),
            runtime: aws_lambda_1.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'lambda_handler',
            timeout: aws_cdk_lib_1.Duration.seconds(60),
            role: userManagementExecRole,
            layers: [lambdaPowertoolsLayer],
            environment: {
                USER_POOL_ID: this.userPool.userPoolId,
            },
        });
        this.createUserFunction = userManagementServices;
        this.fetchAllUsersFunction = userManagementServices;
        this.fetchUserFunction = userManagementServices;
        this.updateUserFunction = userManagementServices;
        this.deleteUserFunction = userManagementServices;
        this.disableUserFunction = userManagementServices;
        this.enableUserFunction = userManagementServices;
        // https://github.com/aws/aws-cdk/issues/23204
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(cdk.Stack.of(this), [
            `/${cdk.Stack.of(this).stackName}/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource`,
            `/${cdk.Stack.of(this).stackName}/AWS679f53fac002430cb0da5b7982bd2287/Resource`,
        ], [
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
        ]);
        this.createAdminUserFunction = new aws_lambda_python_alpha_1.PythonFunction(this, 'createAdminUserFunction', {
            entry: path.join(__dirname, '../../../resources/functions/auth-custom-resource'),
            runtime: aws_lambda_1.Runtime.PYTHON_3_12,
            index: 'index.py',
            handler: 'handler',
            timeout: aws_cdk_lib_1.Duration.seconds(60),
            layers: [lambdaPowertoolsLayer],
        });
        this.userPool.grant(this.createAdminUserFunction, 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminDeleteUser');
        cdk_nag_1.NagSuppressions.addResourceSuppressions(this.createAdminUserFunction.role, [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                ],
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
    }
    createAdminUser(scope, id, props) {
        new aws_cdk_lib_1.CustomResource(scope, `createAdminUserCustomResource-${id}`, {
            serviceToken: this.createAdminUserFunction.functionArn,
            properties: {
                UserPoolId: this.userPool.userPoolId,
                Name: props.name,
                Email: props.email,
                Role: props.role,
            },
        });
    }
}
exports.CognitoAuth = CognitoAuth;
_a = JSII_RTTI_SYMBOL_1;
CognitoAuth[_a] = { fqn: "@cdklabs/sbt-aws.CognitoAuth", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29nbml0by1hdXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NvbnRyb2wtcGxhbmUvYXV0aC9jb2duaXRvLWF1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxxRUFBcUU7QUFDckUsc0NBQXNDO0FBRXRDLDZCQUE2QjtBQUM3Qiw4RUFBa0U7QUFDbEUsbUNBQW1DO0FBQ25DLDZDQUEyRTtBQUMzRSxtREFBbUQ7QUFDbkQsaURBTTZCO0FBQzdCLHVEQUEwRTtBQUMxRSxxQ0FBMEM7QUFDMUMsMkNBQXVDO0FBRXZDLHVDQUE2QztBQW9CN0M7O0dBRUc7QUFDSCxNQUFhLFdBQVksU0FBUSxzQkFBUztJQThLeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUEsc0JBQWMsRUFBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFcEMscUVBQXFFO1FBQ3JFLE1BQU0scUJBQXFCLEdBQUcseUJBQVksQ0FBQyxtQkFBbUIsQ0FDNUQsSUFBSSxFQUNKLGtCQUFrQixFQUNsQixrQkFBa0IsbUJBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxvREFBb0QsQ0FDNUYsQ0FBQztRQUNGLE1BQU0sOEJBQThCLEdBQUcsa0JBQWtCLENBQUM7UUFDMUQsTUFBTSx1QkFBdUIsR0FDM0IsS0FBSyxFQUFFLHVCQUF1QixJQUFJLDhCQUE4QixDQUFDO1FBRW5FLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDckQsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUMzQixjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFlBQVksRUFBRSw4Q0FBOEM7Z0JBQzVELFNBQVMsRUFBRSxrQ0FBa0MsdUJBQXVCLHlEQUF5RDthQUM5SDtZQUNELGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLFVBQVU7WUFDbkQsa0JBQWtCLEVBQUU7Z0JBQ2xCLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTthQUN6QztZQUNELGdCQUFnQixFQUFFO2dCQUNoQixRQUFRLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQzthQUNqRjtZQUNELG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRO1NBQzVELENBQUMsQ0FBQztRQUVILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNyRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUsa0NBQWtDO2FBQzNDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsSUFBSSxPQUFPLENBQUMsbUJBQW1CLENBQUM7WUFDcEQsU0FBUyxFQUFFLFdBQVc7WUFDdEIsZ0JBQWdCLEVBQUUsdUJBQXVCO1NBQzFDLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFDLG1CQUFtQixDQUFDO1lBQ3JELFNBQVMsRUFBRSxZQUFZO1lBQ3ZCLGdCQUFnQixFQUFFLHdCQUF3QjtTQUMzQyxDQUFDLENBQUM7UUFFSCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUU7WUFDL0UsVUFBVSxFQUFFLE1BQU07WUFDbEIsTUFBTSxFQUFFLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQztTQUN4QyxDQUFDLENBQUM7UUFFSCxNQUFNLDJCQUEyQixHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUNuRSxrQkFBa0IsRUFDbEIsYUFBYSxDQUNkLENBQUM7UUFFRixNQUFNLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUNwRSxrQkFBa0IsRUFDbEIsY0FBYyxDQUNmLENBQUM7UUFFRixJQUFJLEtBQUssRUFBRSxjQUFjLElBQUksS0FBSyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLGNBQWMsR0FBRywyQkFBMkIsQ0FBQyxTQUFTLENBQUM7WUFDNUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLDJCQUEyQixDQUFDLFNBQVMsQ0FBQztZQUNoRSxJQUFJLENBQUMsZUFBZSxHQUFHLDRCQUE0QixDQUFDLFNBQVMsQ0FBQztZQUM5RCxJQUFJLENBQUMsZUFBZSxHQUFHLDRCQUE0QixDQUFDLFNBQVMsQ0FBQztZQUM5RCxJQUFJLENBQUMsZUFBZSxHQUFHLDRCQUE0QixDQUFDLFNBQVMsQ0FBQztZQUM5RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsNEJBQTRCLENBQUMsU0FBUyxDQUFDO1lBQy9ELElBQUksQ0FBQyxlQUFlLEdBQUcsNEJBQTRCLENBQUMsU0FBUyxDQUFDO1FBQ2hFLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztZQUN0RCxTQUFTLEVBQUUsYUFBYTtZQUN4QixnQkFBZ0IsRUFBRSx5QkFBeUI7U0FDNUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztZQUN2RCxTQUFTLEVBQUUsY0FBYztZQUN6QixnQkFBZ0IsRUFBRSwwQkFBMEI7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFO1lBQ25GLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLE1BQU0sRUFBRSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQztTQUM1QyxDQUFDLENBQUM7UUFFSCxNQUFNLDZCQUE2QixHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUNyRSxvQkFBb0IsRUFDcEIsZUFBZSxDQUNoQixDQUFDO1FBRUYsTUFBTSw4QkFBOEIsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FDdEUsb0JBQW9CLEVBQ3BCLGdCQUFnQixDQUNqQixDQUFDO1FBRUYsSUFBSSxLQUFLLEVBQUUsY0FBYyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLENBQUM7WUFDaEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsQ0FBQztZQUNwRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsOEJBQThCLENBQUMsU0FBUyxDQUFDO1lBQ2xFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyw4QkFBOEIsQ0FBQyxTQUFTLENBQUM7WUFDbEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLDhCQUE4QixDQUFDLFNBQVMsQ0FBQztZQUNsRSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsOEJBQThCLENBQUMsU0FBUyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyw4QkFBOEIsQ0FBQyxTQUFTLENBQUM7UUFDeEUsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixhQUFhLEVBQUU7Z0JBQ2IsWUFBWSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO2FBQ2hFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3RGLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixjQUFjLEVBQUUsSUFBSTtZQUNwQixTQUFTLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2FBQ2Y7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsS0FBSyxFQUFFO29CQUNMLHNCQUFzQixFQUFFLEtBQUs7b0JBQzdCLGlCQUFpQixFQUFFLEtBQUs7b0JBQ3hCLGlCQUFpQixFQUFFLElBQUk7aUJBQ3hCO2dCQUNELE1BQU0sRUFBRSxDQUFDLDhCQUE4QixDQUFDO2FBQ3pDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ2hGLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2FBQ2Q7WUFDRCwwQkFBMEIsRUFBRSxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLENBQUM7WUFDNUUsS0FBSyxFQUFFO2dCQUNMLFlBQVksRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUN2QyxVQUFVLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDckMsS0FBSyxFQUFFO29CQUNMLHNCQUFzQixFQUFFLElBQUk7b0JBQzVCLGlCQUFpQixFQUFFLElBQUk7aUJBQ3hCO2dCQUNELE1BQU0sRUFBRTtvQkFDTixPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUs7b0JBQ3hCLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTTtvQkFDekIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPO29CQUMxQiw2QkFBNkI7b0JBQzdCLDhCQUE4QjtvQkFDOUIsMkJBQTJCO29CQUMzQiw0QkFBNEI7aUJBQzdCO2FBQ0Y7WUFDRCxlQUFlLEVBQUUsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7aUJBQzVDLHNCQUFzQixDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO2lCQUN2QyxvQkFBb0IsQ0FBQyxVQUFVLENBQUM7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUM7UUFDeEQsSUFBSSxDQUFDLGVBQWUsR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQztRQUM5RCxJQUFJLENBQUMsbUJBQW1CLEdBQUcscUJBQXFCLENBQUMsb0JBQW9CLENBQUM7UUFDdEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLHVCQUF1QixNQUFNLGtCQUFrQixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsbUNBQW1DLENBQUM7UUFDdkksSUFBSSxDQUFDLFNBQVMsR0FBRyx1QkFBdUIsTUFBTSxrQkFBa0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUMzRixJQUFJLENBQUMsV0FBVyxHQUFHO1lBQ2pCLGtCQUFrQixDQUFDLGdCQUFnQjtZQUNuQyxxQkFBcUIsQ0FBQyxnQkFBZ0I7U0FDdkMsQ0FBQztRQUNGLElBQUksQ0FBQyxhQUFhLEdBQUcsV0FBVyxjQUFjLENBQUMsVUFBVSxTQUFTLE1BQU0saUNBQWlDLENBQUM7UUFFMUcsa0VBQWtFO1FBQ2xFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDbkQsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVTtZQUMvQixHQUFHLEVBQUUsMkJBQTJCO1NBQ2pDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDakQsS0FBSyxFQUFFLGtCQUFrQixDQUFDLGdCQUFnQjtZQUMxQyxHQUFHLEVBQUUseUJBQXlCO1NBQy9CLENBQUMsQ0FBQztRQUVILE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxjQUFJLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ3RFLFNBQVMsRUFBRSxJQUFJLDBCQUFnQixDQUFDLHNCQUFzQixDQUFDO1NBQ3hELENBQUMsQ0FBQztRQUNILHNCQUFzQixDQUFDLGdCQUFnQixDQUNyQyx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLDBDQUEwQyxDQUFDLENBQ25GLENBQUM7UUFDRixzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FDckMsdUJBQWEsQ0FBQyx3QkFBd0IsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUN0RixDQUFDO1FBQ0Ysc0JBQXNCLENBQUMsZ0JBQWdCLENBQ3JDLHVCQUFhLENBQUMsd0JBQXdCLENBQUMsd0JBQXdCLENBQUMsQ0FDakUsQ0FBQztRQUNGLHNCQUFzQixDQUFDLFdBQVcsQ0FDaEMsSUFBSSx5QkFBZSxDQUFDO1lBQ2xCLE9BQU8sRUFBRTtnQkFDUCw2QkFBNkI7Z0JBQzdCLDZCQUE2QjtnQkFDN0IsNkJBQTZCO2dCQUM3Qiw4QkFBOEI7Z0JBQzlCLHVDQUF1QztnQkFDdkMsMEJBQTBCO2dCQUMxQix1QkFBdUI7YUFDeEI7WUFDRCxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxLQUFLO1lBQ3BCLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQ0gsQ0FBQztRQUVGLHlCQUFlLENBQUMsdUJBQXVCLENBQ3JDLHNCQUFzQixFQUN0QjtZQUNFO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFBRSxrREFBa0Q7YUFDM0Q7WUFDRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0oseUhBQXlIO2dCQUMzSCxTQUFTLEVBQUU7b0JBQ1QsdUZBQXVGO29CQUN2RiwwRkFBMEY7b0JBQzFGLHFFQUFxRTtpQkFDdEU7YUFDRjtTQUNGLEVBQ0QsSUFBSSxDQUNMLENBQUM7UUFFRixNQUFNLHNCQUFzQixHQUFHLElBQUksd0NBQWMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEYsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDhDQUE4QyxDQUFDO1lBQzNFLE9BQU8sRUFBRSxvQkFBTyxDQUFDLFdBQVc7WUFDNUIsS0FBSyxFQUFFLFVBQVU7WUFDakIsT0FBTyxFQUFFLGdCQUFnQjtZQUN6QixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsTUFBTSxFQUFFLENBQUMscUJBQXFCLENBQUM7WUFDL0IsV0FBVyxFQUFFO2dCQUNYLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVU7YUFDdkM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsc0JBQXNCLENBQUM7UUFDakQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDO1FBQ3BELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxzQkFBc0IsQ0FBQztRQUNoRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsc0JBQXNCLENBQUM7UUFDakQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLHNCQUFzQixDQUFDO1FBQ2pELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQztRQUNsRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsc0JBQXNCLENBQUM7UUFFakQsOENBQThDO1FBQzlDLHlCQUFlLENBQUMsNkJBQTZCLENBQzNDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUNsQjtZQUNFLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUywyREFBMkQ7WUFDM0YsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLCtDQUErQztTQUNoRixFQUNEO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUFFLGdEQUFnRDtnQkFDeEQsU0FBUyxFQUFFO29CQUNULHVGQUF1RjtpQkFDeEY7YUFDRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxpQkFBaUI7Z0JBQ3JCLE1BQU0sRUFBRSx3RUFBd0U7YUFDakY7U0FDRixDQUNGLENBQUM7UUFFRixJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSx3Q0FBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNqRixLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsbURBQW1ELENBQUM7WUFDaEYsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztZQUM1QixLQUFLLEVBQUUsVUFBVTtZQUNqQixPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sRUFBRSxDQUFDLHFCQUFxQixDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUNqQixJQUFJLENBQUMsdUJBQXVCLEVBQzVCLDZCQUE2QixFQUM3Qiw2QkFBNkIsQ0FDOUIsQ0FBQztRQUVGLHlCQUFlLENBQUMsdUJBQXVCLENBQ3JDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFLLEVBQ2xDO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUFFLGdEQUFnRDtnQkFDeEQsU0FBUyxFQUFFO29CQUNULHVGQUF1RjtpQkFDeEY7YUFDRjtTQUNGLEVBQ0QsSUFBSSxDQUFDLCtFQUErRTtTQUNyRixDQUFDO0lBQ0osQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUN2RSxJQUFJLDRCQUFjLENBQUMsS0FBSyxFQUFFLGlDQUFpQyxFQUFFLEVBQUUsRUFBRTtZQUMvRCxZQUFZLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVc7WUFDdEQsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVU7Z0JBQ3BDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO2dCQUNsQixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7YUFDakI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDOztBQWpmSCxrQ0FrZkMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQeXRob25GdW5jdGlvbiB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEtcHl0aG9uLWFscGhhJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDdXN0b21SZXNvdXJjZSwgRHVyYXRpb24sIFNlY3JldFZhbHVlLCBTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0IHtcbiAgTWFuYWdlZFBvbGljeSxcbiAgUG9saWN5U3RhdGVtZW50LFxuICBSb2xlLFxuICBTZXJ2aWNlUHJpbmNpcGFsLFxuICBFZmZlY3QsXG59IGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgUnVudGltZSwgSUZ1bmN0aW9uLCBMYXllclZlcnNpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gJ2Nkay1uYWcnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBDcmVhdGVBZG1pblVzZXJQcm9wcywgSUF1dGggfSBmcm9tICcuL2F1dGgtaW50ZXJmYWNlJztcbmltcG9ydCB7IGFkZFRlbXBsYXRlVGFnIH0gZnJvbSAnLi4vLi4vdXRpbHMnO1xuXG4vKipcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBDb2duaXRvQXV0aCBjb25zdHJ1Y3QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29nbml0b0F1dGhQcm9wcyB7XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgVVJMIGZvciB0aGUgY29udHJvbCBwbGFuZS5cbiAgICogQGRlZmF1bHQgJ2h0dHA6Ly9sb2NhbGhvc3QnXG4gICAqL1xuICByZWFkb25seSBjb250cm9sUGxhbmVDYWxsYmFja1VSTD86IHN0cmluZztcblxuICAvKipcbiAgICogV2hldGhlciBvciBub3QgdG8gc3BlY2lmeSBzY29wZXMgZm9yIHZhbGlkYXRpb24gYXQgdGhlIEFQSSBHVy5cbiAgICogQ2FuIGJlIHVzZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMuXG4gICAqIEBkZWZhdWx0IHRydWVcbiAgICovXG4gIHJlYWRvbmx5IHNldEFQSUdXU2NvcGVzPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGZvciBzZXR0aW5nIHVwIENvZ25pdG8gYXV0aGVudGljYXRpb24gYW5kIHVzZXIgbWFuYWdlbWVudC5cbiAqL1xuZXhwb3J0IGNsYXNzIENvZ25pdG9BdXRoIGV4dGVuZHMgQ29uc3RydWN0IGltcGxlbWVudHMgSUF1dGgge1xuICAvKipcbiAgICogVGhlIEpXVCBpc3N1ZXIgZG9tYWluIGZvciB0aGUgaWRlbnRpdHkgcHJvdmlkZXIuXG4gICAqIFRoaXMgaXMgdGhlIGRvbWFpbiB3aGVyZSB0aGUgSlNPTiBXZWIgVG9rZW5zIChKV1RzKSBhcmUgaXNzdWVkIGZyb20uXG4gICAqL1xuICByZWFkb25seSBqd3RJc3N1ZXI6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIGxpc3Qgb2YgcmVjaXBpZW50cyAoYXVkaWVuY2UpIGZvciB3aGljaCB0aGUgSldUIGlzIGludGVuZGVkLlxuICAgKiBUaGlzIHdpbGwgYmUgY2hlY2tlZCBieSB0aGUgQVBJIEdXIHRvIGVuc3VyZSBvbmx5IGF1dGhvcml6ZWRcbiAgICogY2xpZW50cyBhcmUgcHJvdmlkZWQgYWNjZXNzLlxuICAgKi9cbiAgcmVhZG9ubHkgand0QXVkaWVuY2U6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBUaGUgZW5kcG9pbnQgVVJMIGZvciBncmFudGluZyBPQXV0aCB0b2tlbnMuXG4gICAqIFRoaXMgaXMgdGhlIFVSTCB3aGVyZSBPQXV0aCB0b2tlbnMgY2FuIGJlIG9idGFpbmVkIGZyb20gdGhlIGF1dGhvcml6YXRpb24gc2VydmVyLlxuICAgKi9cbiAgcmVhZG9ubHkgdG9rZW5FbmRwb2ludDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgY2xpZW50IElEIGVuYWJsZWQgZm9yIHVzZXItY2VudHJpYyBhdXRoZW50aWNhdGlvbiBmbG93cywgc3VjaCBhcyBBdXRob3JpemF0aW9uIENvZGUgZmxvdy5cbiAgICogVGhpcyBjbGllbnQgSUQgaXMgdXNlZCBmb3IgYXV0aGVudGljYXRpbmcgZW5kLXVzZXJzLlxuICAgKi9cbiAgcmVhZG9ubHkgdXNlckNsaWVudElkOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBjbGllbnQgSUQgZW5hYmxlZCBmb3IgbWFjaGluZS10by1tYWNoaW5lIGF1dGhvcml6YXRpb24gZmxvd3MsIHN1Y2ggYXMgQ2xpZW50IENyZWRlbnRpYWxzIGZsb3cuXG4gICAqIFRoaXMgY2xpZW50IElEIGlzIHVzZWQgZm9yIGF1dGhlbnRpY2F0aW5nIGFwcGxpY2F0aW9ucyBvciBzZXJ2aWNlcy5cbiAgICovXG4gIHJlYWRvbmx5IG1hY2hpbmVDbGllbnRJZDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgY2xpZW50IHNlY3JldCBlbmFibGVkIGZvciBtYWNoaW5lLXRvLW1hY2hpbmUgYXV0aG9yaXphdGlvbiBmbG93cywgc3VjaCBhcyBDbGllbnQgQ3JlZGVudGlhbHMgZmxvdy5cbiAgICogVGhpcyBzZWNyZXQgaXMgdXNlZCBpbiBjb21iaW5hdGlvbiB3aXRoIHRoZSBtYWNoaW5lIGNsaWVudCBJRCBmb3IgYXV0aGVudGljYXRpbmcgYXBwbGljYXRpb25zIG9yIHNlcnZpY2VzLlxuICAgKi9cbiAgcmVhZG9ubHkgbWFjaGluZUNsaWVudFNlY3JldDogU2VjcmV0VmFsdWU7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIGZldGNoaW5nIGEgc2luZ2xlIHRlbmFudC5cbiAgICogVGhpcyBzY29wZSBncmFudHMgcGVybWlzc2lvbiB0byBmZXRjaCB0aGUgZGV0YWlscyBvZiBhIHNwZWNpZmljIHRlbmFudC5cbiAgICovXG4gIHJlYWRvbmx5IGZldGNoVGVuYW50U2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIGZldGNoaW5nIGFsbCB0ZW5hbnRzLlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIGZldGNoIHRoZSBkZXRhaWxzIG9mIGFsbCB0ZW5hbnRzLlxuICAgKi9cbiAgcmVhZG9ubHkgZmV0Y2hBbGxUZW5hbnRzU2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIGRlbGV0aW5nIGEgdGVuYW50LlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIGRlbGV0ZSBhIHNwZWNpZmljIHRlbmFudC5cbiAgICovXG4gIHJlYWRvbmx5IGRlbGV0ZVRlbmFudFNjb3BlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgc2NvcGUgcmVxdWlyZWQgdG8gYXV0aG9yaXplIHJlcXVlc3RzIGZvciBjcmVhdGluZyBhIHRlbmFudC5cbiAgICogVGhpcyBzY29wZSBncmFudHMgcGVybWlzc2lvbiB0byBjcmVhdGUgYSBuZXcgdGVuYW50LlxuICAgKi9cbiAgcmVhZG9ubHkgY3JlYXRlVGVuYW50U2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIHVwZGF0aW5nIGEgdGVuYW50LlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIHVwZGF0ZSB0aGUgZGV0YWlscyBvZiBhIHNwZWNpZmljIHRlbmFudC5cbiAgICovXG4gIHJlYWRvbmx5IHVwZGF0ZVRlbmFudFNjb3BlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgc2NvcGUgcmVxdWlyZWQgdG8gYXV0aG9yaXplIHJlcXVlc3RzIGZvciBhY3RpdmF0aW5nIGEgdGVuYW50LlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIGFjdGl2YXRlIGEgc3BlY2lmaWMgdGVuYW50LlxuICAgKi9cbiAgcmVhZG9ubHkgYWN0aXZhdGVUZW5hbnRTY29wZT86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHNjb3BlIHJlcXVpcmVkIHRvIGF1dGhvcml6ZSByZXF1ZXN0cyBmb3IgZGVhY3RpdmF0aW5nIGEgdGVuYW50LlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIGRlYWN0aXZhdGUgYSBzcGVjaWZpYyB0ZW5hbnQuXG4gICAqL1xuICByZWFkb25seSBkZWFjdGl2YXRlVGVuYW50U2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIGZldGNoaW5nIGEgc2luZ2xlIHVzZXIuXG4gICAqIFRoaXMgc2NvcGUgZ3JhbnRzIHBlcm1pc3Npb24gdG8gZmV0Y2ggdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyB1c2VyLlxuICAgKi9cbiAgcmVhZG9ubHkgZmV0Y2hVc2VyU2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIGZldGNoaW5nIGFsbCB1c2Vycy5cbiAgICogVGhpcyBzY29wZSBncmFudHMgcGVybWlzc2lvbiB0byBmZXRjaCB0aGUgZGV0YWlscyBvZiBhbGwgdXNlcnMuXG4gICAqL1xuICByZWFkb25seSBmZXRjaEFsbFVzZXJzU2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIGRlbGV0aW5nIGEgdXNlci5cbiAgICogVGhpcyBzY29wZSBncmFudHMgcGVybWlzc2lvbiB0byBkZWxldGUgYSBzcGVjaWZpYyB1c2VyLlxuICAgKi9cbiAgcmVhZG9ubHkgZGVsZXRlVXNlclNjb3BlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgc2NvcGUgcmVxdWlyZWQgdG8gYXV0aG9yaXplIHJlcXVlc3RzIGZvciBjcmVhdGluZyBhIHVzZXIuXG4gICAqIFRoaXMgc2NvcGUgZ3JhbnRzIHBlcm1pc3Npb24gdG8gY3JlYXRlIGEgbmV3IHVzZXIuXG4gICAqL1xuICByZWFkb25seSBjcmVhdGVVc2VyU2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBzY29wZSByZXF1aXJlZCB0byBhdXRob3JpemUgcmVxdWVzdHMgZm9yIHVwZGF0aW5nIGEgdXNlci5cbiAgICogVGhpcyBzY29wZSBncmFudHMgcGVybWlzc2lvbiB0byB1cGRhdGUgdGhlIGRldGFpbHMgb2YgYSBzcGVjaWZpYyB1c2VyLlxuICAgKi9cbiAgcmVhZG9ubHkgdXBkYXRlVXNlclNjb3BlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgc2NvcGUgcmVxdWlyZWQgdG8gYXV0aG9yaXplIHJlcXVlc3RzIGZvciBkaXNhYmxpbmcgYSB1c2VyLlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIGRpc2FibGUgYSBzcGVjaWZpYyB1c2VyLlxuICAgKi9cbiAgcmVhZG9ubHkgZGlzYWJsZVVzZXJTY29wZT86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHNjb3BlIHJlcXVpcmVkIHRvIGF1dGhvcml6ZSByZXF1ZXN0cyBmb3IgZW5hYmxpbmcgYSB1c2VyLlxuICAgKiBUaGlzIHNjb3BlIGdyYW50cyBwZXJtaXNzaW9uIHRvIGVuYWJsZSBhIHNwZWNpZmljIHVzZXIuXG4gICAqL1xuICByZWFkb25seSBlbmFibGVVc2VyU2NvcGU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSB3ZWxsLWtub3duIGVuZHBvaW50IFVSTCBmb3IgdGhlIGNvbnRyb2wgcGxhbmUgaWRlbnRpdHkgcHJvdmlkZXIuXG4gICAqIFRoaXMgVVJMIHByb3ZpZGVzIGNvbmZpZ3VyYXRpb24gaW5mb3JtYXRpb24gYWJvdXQgdGhlIGlkZW50aXR5IHByb3ZpZGVyLCBzdWNoIGFzIGlzc3VlciwgYXV0aG9yaXphdGlvbiBlbmRwb2ludCwgYW5kIHRva2VuIGVuZHBvaW50LlxuICAgKi9cbiAgcmVhZG9ubHkgd2VsbEtub3duRW5kcG9pbnRVcmw6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIExhbWJkYSBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYSB1c2VyLiAtLSBQT1NUIC91c2Vyc1xuICAgKi9cbiAgcmVhZG9ubHkgY3JlYXRlVXNlckZ1bmN0aW9uOiBJRnVuY3Rpb247XG5cbiAgLyoqXG4gICAqIFRoZSBMYW1iZGEgZnVuY3Rpb24gZm9yIGZldGNoaW5nIGFsbCB1c2VycyAtLSBHRVQgL3VzZXJzXG4gICAqL1xuICByZWFkb25seSBmZXRjaEFsbFVzZXJzRnVuY3Rpb246IElGdW5jdGlvbjsgLy8gdXNlICdmZXRjaConIGluc3RlYWQgb2YgJ2dldConIHRvIGF2b2lkIGVycm9yIEpTSUk1MDAwXG5cbiAgLyoqXG4gICAqIFRoZSBMYW1iZGEgZnVuY3Rpb24gZm9yIGZldGNoaW5nIGEgdXNlci4gLS0gR0VUIC91c2VyL3t1c2VySWR9XG4gICAqL1xuICByZWFkb25seSBmZXRjaFVzZXJGdW5jdGlvbjogSUZ1bmN0aW9uOyAvLyB1c2UgJ2ZldGNoKicgaW5zdGVhZCBvZiAnZ2V0KicgdG8gYXZvaWQgZXJyb3IgSlNJSTUwMDBcblxuICAvKipcbiAgICogVGhlIExhbWJkYSBmdW5jdGlvbiBmb3IgdXBkYXRpbmcgYSB1c2VyLiAtLSBQVVQgL3VzZXIve3VzZXJJZH1cbiAgICovXG4gIHJlYWRvbmx5IHVwZGF0ZVVzZXJGdW5jdGlvbjogSUZ1bmN0aW9uO1xuXG4gIC8qKlxuICAgKiBUaGUgTGFtYmRhIGZ1bmN0aW9uIGZvciBkZWxldGluZyBhIHVzZXIuIC0tIERFTEVURSAvdXNlci97dXNlcklkfVxuICAgKi9cbiAgcmVhZG9ubHkgZGVsZXRlVXNlckZ1bmN0aW9uOiBJRnVuY3Rpb247XG5cbiAgLyoqXG4gICAqIFRoZSBMYW1iZGEgZnVuY3Rpb24gZm9yIGRpc2FibGluZyBhIHVzZXIuIC0tIFBVVCAvdXNlci97dXNlcklkfS9kaXNhYmxlXG4gICAqL1xuICByZWFkb25seSBkaXNhYmxlVXNlckZ1bmN0aW9uOiBJRnVuY3Rpb247XG5cbiAgLyoqXG4gICAqIFRoZSBMYW1iZGEgZnVuY3Rpb24gZm9yIGVuYWJsaW5nIGEgdXNlci4gLS0gUFVUIC91c2VyL3t1c2VySWR9L2VuYWJsZVxuICAgKi9cbiAgcmVhZG9ubHkgZW5hYmxlVXNlckZ1bmN0aW9uOiBJRnVuY3Rpb247XG5cbiAgLyoqXG4gICAqIFVzZXJQb29sIGNyZWF0ZWQgYXMgcGFydCBvZiB0aGlzIGNvbnN0cnVjdC5cbiAgICovXG4gIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuXG4gIC8qKlxuICAgKiBUaGUgTGFtYmRhIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIG5ldyBBZG1pbiBVc2VyLiBUaGlzIGlzIHVzZWQgYXMgcGFydCBvZiBhXG4gICAqIGN1c3RvbSByZXNvdXJjZSBpbiBDbG91ZEZvcm1hdGlvbiB0byBjcmVhdGUgYW4gYWRtaW4gdXNlci5cbiAgICovXG4gIHByaXZhdGUgcmVhZG9ubHkgY3JlYXRlQWRtaW5Vc2VyRnVuY3Rpb246IElGdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IENvZ25pdG9BdXRoUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIGFkZFRlbXBsYXRlVGFnKHRoaXMsICdDb2duaXRvQXV0aCcpO1xuXG4gICAgLy8gaHR0cHM6Ly9kb2NzLnBvd2VydG9vbHMuYXdzLmRldi9sYW1iZGEvcHl0aG9uLzIuMzEuMC8jbGFtYmRhLWxheWVyXG4gICAgY29uc3QgbGFtYmRhUG93ZXJ0b29sc0xheWVyID0gTGF5ZXJWZXJzaW9uLmZyb21MYXllclZlcnNpb25Bcm4oXG4gICAgICB0aGlzLFxuICAgICAgJ0xhbWJkYVBvd2VyVG9vbHMnLFxuICAgICAgYGFybjphd3M6bGFtYmRhOiR7U3RhY2sub2YodGhpcykucmVnaW9ufTowMTcwMDA4MDE0NDY6bGF5ZXI6QVdTTGFtYmRhUG93ZXJ0b29sc1B5dGhvblYyOjU5YFxuICAgICk7XG4gICAgY29uc3QgZGVmYXVsdENvbnRyb2xQbGFuZUNhbGxiYWNrVVJMID0gJ2h0dHA6Ly9sb2NhbGhvc3QnO1xuICAgIGNvbnN0IGNvbnRyb2xQbGFuZUNhbGxiYWNrVVJMID1cbiAgICAgIHByb3BzPy5jb250cm9sUGxhbmVDYWxsYmFja1VSTCB8fCBkZWZhdWx0Q29udHJvbFBsYW5lQ2FsbGJhY2tVUkw7XG5cbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xuICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcbiAgICAgICAgbWluTGVuZ3RoOiA4LFxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxuICAgICAgICByZXF1aXJlRGlnaXRzOiB0cnVlLFxuICAgICAgICByZXF1aXJlU3ltYm9sczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICB1c2VySW52aXRhdGlvbjoge1xuICAgICAgICBlbWFpbFN1YmplY3Q6ICdZb3VyIHRlbXBvcmFyeSBwYXNzd29yZCBmb3IgY29udHJvbCBwbGFuZSBVSScsXG4gICAgICAgIGVtYWlsQm9keTogYExvZ2luIGludG8gY29udHJvbCBwbGFuZSBVSSBhdCAke2NvbnRyb2xQbGFuZUNhbGxiYWNrVVJMfSB3aXRoIHVzZXJuYW1lIHt1c2VybmFtZX0gYW5kIHRlbXBvcmFyeSBwYXNzd29yZCB7IyMjI31gLFxuICAgICAgfSxcbiAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xuICAgICAgICBlbWFpbDogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxuICAgICAgfSxcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcbiAgICAgICAgdXNlclJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IG11dGFibGU6IHRydWUsIG1pbkxlbjogMSwgbWF4TGVuOiAyNTYgfSksXG4gICAgICB9LFxuICAgICAgYWR2YW5jZWRTZWN1cml0eU1vZGU6IGNvZ25pdG8uQWR2YW5jZWRTZWN1cml0eU1vZGUuRU5GT1JDRUQsXG4gICAgfSk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnModGhpcy51c2VyUG9vbCwgW1xuICAgICAge1xuICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1DT0cyJyxcbiAgICAgICAgcmVhc29uOiAnTm90IHJlcXVpcmluZyBNRkEgYXQgdGhpcyBwaGFzZS4nLFxuICAgICAgfSxcbiAgICBdKTtcblxuICAgIGNvbnN0IHJlYWRVc2VyU2NvcGUgPSBuZXcgY29nbml0by5SZXNvdXJjZVNlcnZlclNjb3BlKHtcbiAgICAgIHNjb3BlTmFtZTogJ3VzZXJfcmVhZCcsXG4gICAgICBzY29wZURlc2NyaXB0aW9uOiAnUmVhZCBhY2Nlc3MgdG8gdXNlcnMuJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdyaXRlVXNlclNjb3BlID0gbmV3IGNvZ25pdG8uUmVzb3VyY2VTZXJ2ZXJTY29wZSh7XG4gICAgICBzY29wZU5hbWU6ICd1c2VyX3dyaXRlJyxcbiAgICAgIHNjb3BlRGVzY3JpcHRpb246ICdXcml0ZSBhY2Nlc3MgdG8gdXNlcnMuJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJSZXNvdXJjZVNlcnZlciA9IHRoaXMudXNlclBvb2wuYWRkUmVzb3VyY2VTZXJ2ZXIoJ1VzZXJSZXNvdXJjZVNlcnZlcicsIHtcbiAgICAgIGlkZW50aWZpZXI6ICd1c2VyJyxcbiAgICAgIHNjb3BlczogW3JlYWRVc2VyU2NvcGUsIHdyaXRlVXNlclNjb3BlXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJSZXNvdXJjZVNlcnZlclJlYWRTY29wZSA9IGNvZ25pdG8uT0F1dGhTY29wZS5yZXNvdXJjZVNlcnZlcihcbiAgICAgIHVzZXJSZXNvdXJjZVNlcnZlcixcbiAgICAgIHJlYWRVc2VyU2NvcGVcbiAgICApO1xuXG4gICAgY29uc3QgdXNlclJlc291cmNlU2VydmVyV3JpdGVTY29wZSA9IGNvZ25pdG8uT0F1dGhTY29wZS5yZXNvdXJjZVNlcnZlcihcbiAgICAgIHVzZXJSZXNvdXJjZVNlcnZlcixcbiAgICAgIHdyaXRlVXNlclNjb3BlXG4gICAgKTtcblxuICAgIGlmIChwcm9wcz8uc2V0QVBJR1dTY29wZXMgIT0gZmFsc2UpIHtcbiAgICAgIHRoaXMuZmV0Y2hVc2VyU2NvcGUgPSB1c2VyUmVzb3VyY2VTZXJ2ZXJSZWFkU2NvcGUuc2NvcGVOYW1lO1xuICAgICAgdGhpcy5mZXRjaEFsbFVzZXJzU2NvcGUgPSB1c2VyUmVzb3VyY2VTZXJ2ZXJSZWFkU2NvcGUuc2NvcGVOYW1lO1xuICAgICAgdGhpcy5kZWxldGVVc2VyU2NvcGUgPSB1c2VyUmVzb3VyY2VTZXJ2ZXJXcml0ZVNjb3BlLnNjb3BlTmFtZTtcbiAgICAgIHRoaXMuY3JlYXRlVXNlclNjb3BlID0gdXNlclJlc291cmNlU2VydmVyV3JpdGVTY29wZS5zY29wZU5hbWU7XG4gICAgICB0aGlzLnVwZGF0ZVVzZXJTY29wZSA9IHVzZXJSZXNvdXJjZVNlcnZlcldyaXRlU2NvcGUuc2NvcGVOYW1lO1xuICAgICAgdGhpcy5kaXNhYmxlVXNlclNjb3BlID0gdXNlclJlc291cmNlU2VydmVyV3JpdGVTY29wZS5zY29wZU5hbWU7XG4gICAgICB0aGlzLmVuYWJsZVVzZXJTY29wZSA9IHVzZXJSZXNvdXJjZVNlcnZlcldyaXRlU2NvcGUuc2NvcGVOYW1lO1xuICAgIH1cblxuICAgIGNvbnN0IHJlYWRUZW5hbnRTY29wZSA9IG5ldyBjb2duaXRvLlJlc291cmNlU2VydmVyU2NvcGUoe1xuICAgICAgc2NvcGVOYW1lOiAndGVuYW50X3JlYWQnLFxuICAgICAgc2NvcGVEZXNjcmlwdGlvbjogJ1JlYWQgYWNjZXNzIHRvIHRlbmFudHMuJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdyaXRlVGVuYW50U2NvcGUgPSBuZXcgY29nbml0by5SZXNvdXJjZVNlcnZlclNjb3BlKHtcbiAgICAgIHNjb3BlTmFtZTogJ3RlbmFudF93cml0ZScsXG4gICAgICBzY29wZURlc2NyaXB0aW9uOiAnV3JpdGUgYWNjZXNzIHRvIHRlbmFudHMuJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHRlbmFudFJlc291cmNlU2VydmVyID0gdGhpcy51c2VyUG9vbC5hZGRSZXNvdXJjZVNlcnZlcignVGVuYW50UmVzb3VyY2VTZXJ2ZXInLCB7XG4gICAgICBpZGVudGlmaWVyOiAndGVuYW50JyxcbiAgICAgIHNjb3BlczogW3JlYWRUZW5hbnRTY29wZSwgd3JpdGVUZW5hbnRTY29wZV0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB0ZW5hbnRSZXNvdXJjZVNlcnZlclJlYWRTY29wZSA9IGNvZ25pdG8uT0F1dGhTY29wZS5yZXNvdXJjZVNlcnZlcihcbiAgICAgIHRlbmFudFJlc291cmNlU2VydmVyLFxuICAgICAgcmVhZFRlbmFudFNjb3BlXG4gICAgKTtcblxuICAgIGNvbnN0IHRlbmFudFJlc291cmNlU2VydmVyV3JpdGVTY29wZSA9IGNvZ25pdG8uT0F1dGhTY29wZS5yZXNvdXJjZVNlcnZlcihcbiAgICAgIHRlbmFudFJlc291cmNlU2VydmVyLFxuICAgICAgd3JpdGVUZW5hbnRTY29wZVxuICAgICk7XG5cbiAgICBpZiAocHJvcHM/LnNldEFQSUdXU2NvcGVzICE9IGZhbHNlKSB7XG4gICAgICB0aGlzLmZldGNoVGVuYW50U2NvcGUgPSB0ZW5hbnRSZXNvdXJjZVNlcnZlclJlYWRTY29wZS5zY29wZU5hbWU7XG4gICAgICB0aGlzLmZldGNoQWxsVGVuYW50c1Njb3BlID0gdGVuYW50UmVzb3VyY2VTZXJ2ZXJSZWFkU2NvcGUuc2NvcGVOYW1lO1xuICAgICAgdGhpcy5kZWxldGVUZW5hbnRTY29wZSA9IHRlbmFudFJlc291cmNlU2VydmVyV3JpdGVTY29wZS5zY29wZU5hbWU7XG4gICAgICB0aGlzLmNyZWF0ZVRlbmFudFNjb3BlID0gdGVuYW50UmVzb3VyY2VTZXJ2ZXJXcml0ZVNjb3BlLnNjb3BlTmFtZTtcbiAgICAgIHRoaXMudXBkYXRlVGVuYW50U2NvcGUgPSB0ZW5hbnRSZXNvdXJjZVNlcnZlcldyaXRlU2NvcGUuc2NvcGVOYW1lO1xuICAgICAgdGhpcy5hY3RpdmF0ZVRlbmFudFNjb3BlID0gdGVuYW50UmVzb3VyY2VTZXJ2ZXJXcml0ZVNjb3BlLnNjb3BlTmFtZTtcbiAgICAgIHRoaXMuZGVhY3RpdmF0ZVRlbmFudFNjb3BlID0gdGVuYW50UmVzb3VyY2VTZXJ2ZXJXcml0ZVNjb3BlLnNjb3BlTmFtZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgYSBDb2duaXRvIFVzZXIgUG9vbCBEb21haW5cbiAgICBjb25zdCB1c2VyUG9vbERvbWFpbiA9IG5ldyBjb2duaXRvLlVzZXJQb29sRG9tYWluKHRoaXMsICdVc2VyUG9vbERvbWFpbicsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgY29nbml0b0RvbWFpbjoge1xuICAgICAgICBkb21haW5QcmVmaXg6IGAke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fS0ke3RoaXMubm9kZS5hZGRyfWAsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlclBvb2xNYWNoaW5lQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sTWFjaGluZUNsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IHRydWUsXG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgdXNlclBhc3N3b3JkOiBmYWxzZSxcbiAgICAgICAgdXNlclNycDogZmFsc2UsXG4gICAgICB9LFxuICAgICAgb0F1dGg6IHtcbiAgICAgICAgZmxvd3M6IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uQ29kZUdyYW50OiBmYWxzZSxcbiAgICAgICAgICBpbXBsaWNpdENvZGVHcmFudDogZmFsc2UsXG4gICAgICAgICAgY2xpZW50Q3JlZGVudGlhbHM6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHNjb3BlczogW3RlbmFudFJlc291cmNlU2VydmVyV3JpdGVTY29wZV0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlclBvb2xVc2VyQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sVXNlckNsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0ZWRJZGVudGl0eVByb3ZpZGVyczogW2NvZ25pdG8uVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLkNPR05JVE9dLFxuICAgICAgb0F1dGg6IHtcbiAgICAgICAgY2FsbGJhY2tVcmxzOiBbY29udHJvbFBsYW5lQ2FsbGJhY2tVUkxdLFxuICAgICAgICBsb2dvdXRVcmxzOiBbY29udHJvbFBsYW5lQ2FsbGJhY2tVUkxdLFxuICAgICAgICBmbG93czoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHNjb3BlczogW1xuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5FTUFJTCxcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELFxuICAgICAgICAgIGNvZ25pdG8uT0F1dGhTY29wZS5QUk9GSUxFLFxuICAgICAgICAgIHRlbmFudFJlc291cmNlU2VydmVyUmVhZFNjb3BlLFxuICAgICAgICAgIHRlbmFudFJlc291cmNlU2VydmVyV3JpdGVTY29wZSxcbiAgICAgICAgICB1c2VyUmVzb3VyY2VTZXJ2ZXJSZWFkU2NvcGUsXG4gICAgICAgICAgdXNlclJlc291cmNlU2VydmVyV3JpdGVTY29wZSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7IGVtYWlsOiB0cnVlIH0pXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygndXNlclJvbGUnKSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlZ2lvbiA9IGNkay5TdGFjay5vZih0aGlzKS5yZWdpb247XG4gICAgdGhpcy51c2VyQ2xpZW50SWQgPSB1c2VyUG9vbFVzZXJDbGllbnQudXNlclBvb2xDbGllbnRJZDtcbiAgICB0aGlzLm1hY2hpbmVDbGllbnRJZCA9IHVzZXJQb29sTWFjaGluZUNsaWVudC51c2VyUG9vbENsaWVudElkO1xuICAgIHRoaXMubWFjaGluZUNsaWVudFNlY3JldCA9IHVzZXJQb29sTWFjaGluZUNsaWVudC51c2VyUG9vbENsaWVudFNlY3JldDtcbiAgICB0aGlzLndlbGxLbm93bkVuZHBvaW50VXJsID0gYGh0dHBzOi8vY29nbml0by1pZHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHt0aGlzLnVzZXJQb29sLnVzZXJQb29sSWR9Ly53ZWxsLWtub3duL29wZW5pZC1jb25maWd1cmF0aW9uYDtcbiAgICB0aGlzLmp3dElzc3VlciA9IGBodHRwczovL2NvZ25pdG8taWRwLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tLyR7dGhpcy51c2VyUG9vbC51c2VyUG9vbElkfWA7XG4gICAgdGhpcy5qd3RBdWRpZW5jZSA9IFtcbiAgICAgIHVzZXJQb29sVXNlckNsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgdXNlclBvb2xNYWNoaW5lQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgXTtcbiAgICB0aGlzLnRva2VuRW5kcG9pbnQgPSBgaHR0cHM6Ly8ke3VzZXJQb29sRG9tYWluLmRvbWFpbk5hbWV9LmF1dGguJHtyZWdpb259LmFtYXpvbmNvZ25pdG8uY29tL29hdXRoMi90b2tlbmA7XG5cbiAgICAvLyBUT0RPOiBUaGUgY2FsbGVyIHNob3VsZCBiZSBzdXJmYWNpbmcgdGhlc2UsIG5vdCB0aGUgaW1wbGVtZW50b3JcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29udHJvbFBsYW5lSWRwVXNlclBvb2xJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBrZXk6ICdDb250cm9sUGxhbmVJZHBVc2VyUG9vbElkJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb250cm9sUGxhbmVJZHBDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbFVzZXJDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGtleTogJ0NvbnRyb2xQbGFuZUlkcENsaWVudElkJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJNYW5hZ2VtZW50RXhlY1JvbGUgPSBuZXcgUm9sZSh0aGlzLCAndXNlck1hbmFnZW1lbnRFeGVjUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IFNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgfSk7XG4gICAgdXNlck1hbmFnZW1lbnRFeGVjUm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnKVxuICAgICk7XG4gICAgdXNlck1hbmFnZW1lbnRFeGVjUm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0Nsb3VkV2F0Y2hMYW1iZGFJbnNpZ2h0c0V4ZWN1dGlvblJvbGVQb2xpY3knKVxuICAgICk7XG4gICAgdXNlck1hbmFnZW1lbnRFeGVjUm9sZS5hZGRNYW5hZ2VkUG9saWN5KFxuICAgICAgTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FXU1hyYXlXcml0ZU9ubHlBY2Nlc3MnKVxuICAgICk7XG4gICAgdXNlck1hbmFnZW1lbnRFeGVjUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBQb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlcicsXG4gICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRW5hYmxlVXNlcicsXG4gICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXG4gICAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGlzYWJsZVVzZXInLFxuICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pblVwZGF0ZVVzZXJBdHRyaWJ1dGVzJyxcbiAgICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcbiAgICAgICAgICAnY29nbml0by1pZHA6TGlzdFVzZXJzJyxcbiAgICAgICAgXSxcbiAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICB1c2VyTWFuYWdlbWVudEV4ZWNSb2xlLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOiAnQXV0aCB1c2VyIHJlc291cmNlIG5hbWUocykgbm90IGtub3duIGJlZm9yZWhhbmQuJyxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjpcbiAgICAgICAgICAgICdTdXBwcmVzcyB1c2FnZSBvZiBBV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUsIENsb3VkV2F0Y2hMYW1iZGFJbnNpZ2h0c0V4ZWN1dGlvblJvbGVQb2xpY3ksIGFuZCBBV1NYcmF5V3JpdGVPbmx5QWNjZXNzLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICAnUG9saWN5Ojphcm46PEFXUzo6UGFydGl0aW9uPjppYW06OmF3czpwb2xpY3kvc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScsXG4gICAgICAgICAgICAnUG9saWN5Ojphcm46PEFXUzo6UGFydGl0aW9uPjppYW06OmF3czpwb2xpY3kvQ2xvdWRXYXRjaExhbWJkYUluc2lnaHRzRXhlY3V0aW9uUm9sZVBvbGljeScsXG4gICAgICAgICAgICAnUG9saWN5Ojphcm46PEFXUzo6UGFydGl0aW9uPjppYW06OmF3czpwb2xpY3kvQVdTWHJheVdyaXRlT25seUFjY2VzcycsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICB0cnVlXG4gICAgKTtcblxuICAgIGNvbnN0IHVzZXJNYW5hZ2VtZW50U2VydmljZXMgPSBuZXcgUHl0aG9uRnVuY3Rpb24odGhpcywgJ1VzZXJNYW5hZ2VtZW50U2VydmljZXMnLCB7XG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3Jlc291cmNlcy9mdW5jdGlvbnMvdXNlci1tYW5hZ2VtZW50JyksXG4gICAgICBydW50aW1lOiBSdW50aW1lLlBZVEhPTl8zXzEyLFxuICAgICAgaW5kZXg6ICdpbmRleC5weScsXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2hhbmRsZXInLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICByb2xlOiB1c2VyTWFuYWdlbWVudEV4ZWNSb2xlLFxuICAgICAgbGF5ZXJzOiBbbGFtYmRhUG93ZXJ0b29sc0xheWVyXSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJfUE9PTF9JRDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuY3JlYXRlVXNlckZ1bmN0aW9uID0gdXNlck1hbmFnZW1lbnRTZXJ2aWNlcztcbiAgICB0aGlzLmZldGNoQWxsVXNlcnNGdW5jdGlvbiA9IHVzZXJNYW5hZ2VtZW50U2VydmljZXM7XG4gICAgdGhpcy5mZXRjaFVzZXJGdW5jdGlvbiA9IHVzZXJNYW5hZ2VtZW50U2VydmljZXM7XG4gICAgdGhpcy51cGRhdGVVc2VyRnVuY3Rpb24gPSB1c2VyTWFuYWdlbWVudFNlcnZpY2VzO1xuICAgIHRoaXMuZGVsZXRlVXNlckZ1bmN0aW9uID0gdXNlck1hbmFnZW1lbnRTZXJ2aWNlcztcbiAgICB0aGlzLmRpc2FibGVVc2VyRnVuY3Rpb24gPSB1c2VyTWFuYWdlbWVudFNlcnZpY2VzO1xuICAgIHRoaXMuZW5hYmxlVXNlckZ1bmN0aW9uID0gdXNlck1hbmFnZW1lbnRTZXJ2aWNlcztcblxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MvYXdzLWNkay9pc3N1ZXMvMjMyMDRcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICBjZGsuU3RhY2sub2YodGhpcyksXG4gICAgICBbXG4gICAgICAgIGAvJHtjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lfS9BV1M2NzlmNTNmYWMwMDI0MzBjYjBkYTViNzk4MmJkMjI4Ny9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHtjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lfS9BV1M2NzlmNTNmYWMwMDI0MzBjYjBkYTViNzk4MmJkMjI4Ny9SZXNvdXJjZWAsXG4gICAgICBdLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNCcsXG4gICAgICAgICAgcmVhc29uOiAnU3VwcHJlc3MgdXNhZ2Ugb2YgQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICAnUG9saWN5Ojphcm46PEFXUzo6UGFydGl0aW9uPjppYW06OmF3czpwb2xpY3kvc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScsXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUwxJyxcbiAgICAgICAgICByZWFzb246ICdOT0RFSlMgMTggaXMgdGhlIHZlcnNpb24gdXNlZCBpbiB0aGUgb2ZmaWNpYWwgcXVpY2tzdGFydCBDRk4gdGVtcGxhdGUuJyxcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuXG4gICAgdGhpcy5jcmVhdGVBZG1pblVzZXJGdW5jdGlvbiA9IG5ldyBQeXRob25GdW5jdGlvbih0aGlzLCAnY3JlYXRlQWRtaW5Vc2VyRnVuY3Rpb24nLCB7XG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3Jlc291cmNlcy9mdW5jdGlvbnMvYXV0aC1jdXN0b20tcmVzb3VyY2UnKSxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuUFlUSE9OXzNfMTIsXG4gICAgICBpbmRleDogJ2luZGV4LnB5JyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgbGF5ZXJzOiBbbGFtYmRhUG93ZXJ0b29sc0xheWVyXSxcbiAgICB9KTtcbiAgICB0aGlzLnVzZXJQb29sLmdyYW50KFxuICAgICAgdGhpcy5jcmVhdGVBZG1pblVzZXJGdW5jdGlvbixcbiAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxuICAgICAgJ2NvZ25pdG8taWRwOkFkbWluRGVsZXRlVXNlcidcbiAgICApO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgdGhpcy5jcmVhdGVBZG1pblVzZXJGdW5jdGlvbi5yb2xlISxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcbiAgfVxuXG4gIGNyZWF0ZUFkbWluVXNlcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ3JlYXRlQWRtaW5Vc2VyUHJvcHMpIHtcbiAgICBuZXcgQ3VzdG9tUmVzb3VyY2Uoc2NvcGUsIGBjcmVhdGVBZG1pblVzZXJDdXN0b21SZXNvdXJjZS0ke2lkfWAsIHtcbiAgICAgIHNlcnZpY2VUb2tlbjogdGhpcy5jcmVhdGVBZG1pblVzZXJGdW5jdGlvbi5mdW5jdGlvbkFybixcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgVXNlclBvb2xJZDogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBOYW1lOiBwcm9wcy5uYW1lLFxuICAgICAgICBFbWFpbDogcHJvcHMuZW1haWwsXG4gICAgICAgIFJvbGU6IHByb3BzLnJvbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG4iXX0=
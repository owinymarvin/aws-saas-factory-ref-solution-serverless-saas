"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlPlane = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const cdk = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const cognito_auth_1 = require("./auth/cognito-auth");
const billing_1 = require("./billing");
const control_plane_api_1 = require("./control-plane-api");
const tenant_config_1 = require("./tenant-config");
const tenant_management_service_1 = require("./tenant-management/tenant-management.service");
const user_management_service_1 = require("./user-management/user-management.service");
const destroy_policy_setter_1 = require("../cdk-aspect/destroy-policy-setter");
const utils_1 = require("../utils");
class ControlPlane extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'ControlPlane');
        const systemAdminName = props.systemAdminName || 'admin';
        const systemAdminRoleName = props.systemAdminRoleName || 'SystemAdmin';
        cdk.Aspects.of(this).add(new destroy_policy_setter_1.DestroyPolicySetter());
        const auth = props.auth || new cognito_auth_1.CognitoAuth(this, 'CognitoAuth');
        auth.createAdminUser(this, 'adminUser', {
            name: systemAdminName,
            email: props.systemAdminEmail,
            role: systemAdminRoleName,
        });
        const api = new control_plane_api_1.ControlPlaneAPI(this, 'controlPlaneApi', {
            auth,
            disableAPILogging: props.disableAPILogging,
            apiCorsConfig: props.apiCorsConfig,
        });
        const eventManager = props.eventManager ?? new utils_1.EventManager(this, 'EventManager');
        const tenantManagementServices = new tenant_management_service_1.TenantManagementService(this, 'tenantManagementServicves', {
            api: api.api,
            auth,
            authorizer: api.jwtAuthorizer,
            eventManager,
        });
        new tenant_config_1.TenantConfigService(this, 'tenantConfigService', {
            api: api.api,
            tenantManagementTable: tenantManagementServices.table,
        });
        new user_management_service_1.UserManagementService(this, 'userManagementService', {
            api: api.api,
            auth,
            jwtAuthorizer: api.jwtAuthorizer,
        });
        this.controlPlaneAPIGatewayUrl = api.apiUrl;
        new cdk.CfnOutput(this, 'eventBridgeArn', {
            value: eventManager.busArn,
            key: 'eventBridgeArn',
        });
        if (props.billing) {
            const billingTemplate = new billing_1.BillingProvider(this, 'Billing', {
                billing: props.billing,
                eventManager: eventManager,
                controlPlaneAPI: api.api,
            });
            if (billingTemplate.controlPlaneAPIBillingWebhookResourcePath) {
                new cdk.CfnOutput(this, 'billingWebhookURL', {
                    value: `${api.apiUrl}${billingTemplate.controlPlaneAPIBillingWebhookResourcePath}`,
                    key: 'billingWebhookURL',
                });
            }
        }
        this.eventManager = eventManager;
        // defined suppression here to suppress EventsRole Default policy
        // which gets updated in EventManager construct, but is part of ControlPlane API
        cdk_nag_1.NagSuppressions.addResourceSuppressions(api, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Wildcard required in order pass tenantId in path.',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:execute-api:<AWS::Region>:<AWS::AccountId>:<ControlPlanecontrolplaneapistackcontrolPlaneAPI2616E18C>/<ControlPlanecontrolplaneapistackcontrolPlaneAPIDeploymentStageprodA7CA1040>/PUT/tenants/*',
                ],
            },
        ], true // applyToChildren = true, so that it applies to the APIGW role created by cdk in the controlPlaneAPI construct
        );
    }
}
exports.ControlPlane = ControlPlane;
_a = JSII_RTTI_SYMBOL_1;
ControlPlane[_a] = { fqn: "@cdklabs/sbt-aws.ControlPlane", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbC1wbGFuZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sLXBsYW5lL2NvbnRyb2wtcGxhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxxRUFBcUU7QUFDckUsc0NBQXNDO0FBRXRDLG1DQUFtQztBQUVuQyxxQ0FBMEM7QUFDMUMsMkNBQXVDO0FBRXZDLHNEQUFrRDtBQUNsRCx1Q0FBc0Q7QUFDdEQsMkRBQXNEO0FBQ3RELG1EQUFzRDtBQUN0RCw2RkFBd0Y7QUFDeEYsdUZBQWtGO0FBQ2xGLCtFQUEwRTtBQUMxRSxvQ0FBdUU7QUFnRHZFLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBWXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQixJQUFBLHNCQUFjLEVBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRXJDLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksT0FBTyxDQUFDO1FBQ3pELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixJQUFJLGFBQWEsQ0FBQztRQUV2RSxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSwyQ0FBbUIsRUFBRSxDQUFDLENBQUM7UUFFcEQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLDBCQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRWhFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUN0QyxJQUFJLEVBQUUsZUFBZTtZQUNyQixLQUFLLEVBQUUsS0FBSyxDQUFDLGdCQUFnQjtZQUM3QixJQUFJLEVBQUUsbUJBQW1CO1NBQzFCLENBQUMsQ0FBQztRQUVILE1BQU0sR0FBRyxHQUFHLElBQUksbUNBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDdkQsSUFBSTtZQUNKLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxpQkFBaUI7WUFDMUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO1NBQ25DLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxZQUFZLElBQUksSUFBSSxvQkFBWSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNsRixNQUFNLHdCQUF3QixHQUFHLElBQUksbURBQXVCLENBQzFELElBQUksRUFDSiwyQkFBMkIsRUFDM0I7WUFDRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDWixJQUFJO1lBQ0osVUFBVSxFQUFFLEdBQUcsQ0FBQyxhQUFhO1lBQzdCLFlBQVk7U0FDYixDQUNGLENBQUM7UUFFRixJQUFJLG1DQUFtQixDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNuRCxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDWixxQkFBcUIsRUFBRSx3QkFBd0IsQ0FBQyxLQUFLO1NBQ3RELENBQUMsQ0FBQztRQUVILElBQUksK0NBQXFCLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3ZELEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztZQUNaLElBQUk7WUFDSixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWE7U0FDakMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlCQUF5QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFFNUMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsWUFBWSxDQUFDLE1BQU07WUFDMUIsR0FBRyxFQUFFLGdCQUFnQjtTQUN0QixDQUFDLENBQUM7UUFFSCxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLGVBQWUsR0FBRyxJQUFJLHlCQUFlLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtnQkFDM0QsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO2dCQUN0QixZQUFZLEVBQUUsWUFBWTtnQkFDMUIsZUFBZSxFQUFFLEdBQUcsQ0FBQyxHQUFHO2FBQ3pCLENBQUMsQ0FBQztZQUVILElBQUksZUFBZSxDQUFDLHlDQUF5QyxFQUFFLENBQUM7Z0JBQzlELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7b0JBQzNDLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLHlDQUF5QyxFQUFFO29CQUNsRixHQUFHLEVBQUUsbUJBQW1CO2lCQUN6QixDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRWpDLGlFQUFpRTtRQUNqRSxnRkFBZ0Y7UUFDaEYseUJBQWUsQ0FBQyx1QkFBdUIsQ0FDckMsR0FBRyxFQUNIO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUFFLG1EQUFtRDtnQkFDM0QsU0FBUyxFQUFFO29CQUNULGdPQUFnTztpQkFDak87YUFDRjtTQUNGLEVBQ0QsSUFBSSxDQUFDLCtHQUErRztTQUNySCxDQUFDO0lBQ0osQ0FBQzs7QUFoR0gsb0NBaUdDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29yc1ByZWZsaWdodE9wdGlvbnMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gJ2Nkay1uYWcnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBJQXV0aCB9IGZyb20gJy4vYXV0aC9hdXRoLWludGVyZmFjZSc7XG5pbXBvcnQgeyBDb2duaXRvQXV0aCB9IGZyb20gJy4vYXV0aC9jb2duaXRvLWF1dGgnO1xuaW1wb3J0IHsgQmlsbGluZ1Byb3ZpZGVyLCBJQmlsbGluZyB9IGZyb20gJy4vYmlsbGluZyc7XG5pbXBvcnQgeyBDb250cm9sUGxhbmVBUEkgfSBmcm9tICcuL2NvbnRyb2wtcGxhbmUtYXBpJztcbmltcG9ydCB7IFRlbmFudENvbmZpZ1NlcnZpY2UgfSBmcm9tICcuL3RlbmFudC1jb25maWcnO1xuaW1wb3J0IHsgVGVuYW50TWFuYWdlbWVudFNlcnZpY2UgfSBmcm9tICcuL3RlbmFudC1tYW5hZ2VtZW50L3RlbmFudC1tYW5hZ2VtZW50LnNlcnZpY2UnO1xuaW1wb3J0IHsgVXNlck1hbmFnZW1lbnRTZXJ2aWNlIH0gZnJvbSAnLi91c2VyLW1hbmFnZW1lbnQvdXNlci1tYW5hZ2VtZW50LnNlcnZpY2UnO1xuaW1wb3J0IHsgRGVzdHJveVBvbGljeVNldHRlciB9IGZyb20gJy4uL2Nkay1hc3BlY3QvZGVzdHJveS1wb2xpY3ktc2V0dGVyJztcbmltcG9ydCB7IGFkZFRlbXBsYXRlVGFnLCBFdmVudE1hbmFnZXIsIElFdmVudE1hbmFnZXIgfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udHJvbFBsYW5lUHJvcHMge1xuICAvKipcbiAgICogVGhlIGF1dGhlbnRpY2F0aW9uIHByb3ZpZGVyIGZvciB0aGUgY29udHJvbCBwbGFuZS5cbiAgICogSWYgbm90IHByb3ZpZGVkLCBDb2duaXRvQXV0aCB3aWxsIGJlIHVzZWQuXG4gICAqL1xuICByZWFkb25seSBhdXRoPzogSUF1dGg7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBzeXN0ZW0gYWRtaW4gdXNlci5cbiAgICogQGRlZmF1bHQgJ2FkbWluJ1xuICAgKi9cbiAgcmVhZG9ubHkgc3lzdGVtQWRtaW5OYW1lPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgZW1haWwgYWRkcmVzcyBvZiB0aGUgc3lzdGVtIGFkbWluLlxuICAgKi9cbiAgcmVhZG9ubHkgc3lzdGVtQWRtaW5FbWFpbDogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgc3lzdGVtIGFkbWluIHJvbGUuXG4gICAqIEBkZWZhdWx0ICdTeXN0ZW1BZG1pbidcbiAgICovXG4gIHJlYWRvbmx5IHN5c3RlbUFkbWluUm9sZU5hbWU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBiaWxsaW5nIHByb3ZpZGVyIGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICByZWFkb25seSBiaWxsaW5nPzogSUJpbGxpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBldmVudCBtYW5hZ2VyIGluc3RhbmNlLiBJZiBub3QgcHJvdmlkZWQsIGEgbmV3IGluc3RhbmNlIHdpbGwgYmUgY3JlYXRlZC5cbiAgICovXG4gIHJlYWRvbmx5IGV2ZW50TWFuYWdlcj86IElFdmVudE1hbmFnZXI7XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIHRoZSBBUEkgR2F0ZXdheSB3aWxsIG5vdCBsb2cgcmVxdWVzdHMgdG8gdGhlIENsb3VkV2F0Y2ggTG9ncy5cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIHJlYWRvbmx5IGRpc2FibGVBUElMb2dnaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogU2V0dGluZ3MgZm9yIENvcnMgQ29uZmlndXJhdGlvbiBmb3IgdGhlIENvbnRyb2xQbGFuZSBBUEkuXG4gICAqL1xuICByZWFkb25seSBhcGlDb3JzQ29uZmlnPzogQ29yc1ByZWZsaWdodE9wdGlvbnM7XG59XG5cbmV4cG9ydCBjbGFzcyBDb250cm9sUGxhbmUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogVGhlIFVSTCBvZiB0aGUgY29udHJvbCBwbGFuZSBBUEkgR2F0ZXdheS5cbiAgICovXG4gIHJlYWRvbmx5IGNvbnRyb2xQbGFuZUFQSUdhdGV3YXlVcmw6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEV2ZW50TWFuYWdlciBpbnN0YW5jZSB0aGF0IGFsbG93cyBjb25uZWN0aW5nIHRvIGV2ZW50cyBmbG93aW5nIGJldHdlZW5cbiAgICogdGhlIENvbnRyb2wgUGxhbmUgYW5kIG90aGVyIGNvbXBvbmVudHMuXG4gICAqL1xuICByZWFkb25seSBldmVudE1hbmFnZXI6IElFdmVudE1hbmFnZXI7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENvbnRyb2xQbGFuZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICBhZGRUZW1wbGF0ZVRhZyh0aGlzLCAnQ29udHJvbFBsYW5lJyk7XG5cbiAgICBjb25zdCBzeXN0ZW1BZG1pbk5hbWUgPSBwcm9wcy5zeXN0ZW1BZG1pbk5hbWUgfHwgJ2FkbWluJztcbiAgICBjb25zdCBzeXN0ZW1BZG1pblJvbGVOYW1lID0gcHJvcHMuc3lzdGVtQWRtaW5Sb2xlTmFtZSB8fCAnU3lzdGVtQWRtaW4nO1xuXG4gICAgY2RrLkFzcGVjdHMub2YodGhpcykuYWRkKG5ldyBEZXN0cm95UG9saWN5U2V0dGVyKCkpO1xuXG4gICAgY29uc3QgYXV0aCA9IHByb3BzLmF1dGggfHwgbmV3IENvZ25pdG9BdXRoKHRoaXMsICdDb2duaXRvQXV0aCcpO1xuXG4gICAgYXV0aC5jcmVhdGVBZG1pblVzZXIodGhpcywgJ2FkbWluVXNlcicsIHtcbiAgICAgIG5hbWU6IHN5c3RlbUFkbWluTmFtZSxcbiAgICAgIGVtYWlsOiBwcm9wcy5zeXN0ZW1BZG1pbkVtYWlsLFxuICAgICAgcm9sZTogc3lzdGVtQWRtaW5Sb2xlTmFtZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGFwaSA9IG5ldyBDb250cm9sUGxhbmVBUEkodGhpcywgJ2NvbnRyb2xQbGFuZUFwaScsIHtcbiAgICAgIGF1dGgsXG4gICAgICBkaXNhYmxlQVBJTG9nZ2luZzogcHJvcHMuZGlzYWJsZUFQSUxvZ2dpbmcsXG4gICAgICBhcGlDb3JzQ29uZmlnOiBwcm9wcy5hcGlDb3JzQ29uZmlnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZXZlbnRNYW5hZ2VyID0gcHJvcHMuZXZlbnRNYW5hZ2VyID8/IG5ldyBFdmVudE1hbmFnZXIodGhpcywgJ0V2ZW50TWFuYWdlcicpO1xuICAgIGNvbnN0IHRlbmFudE1hbmFnZW1lbnRTZXJ2aWNlcyA9IG5ldyBUZW5hbnRNYW5hZ2VtZW50U2VydmljZShcbiAgICAgIHRoaXMsXG4gICAgICAndGVuYW50TWFuYWdlbWVudFNlcnZpY3ZlcycsXG4gICAgICB7XG4gICAgICAgIGFwaTogYXBpLmFwaSxcbiAgICAgICAgYXV0aCxcbiAgICAgICAgYXV0aG9yaXplcjogYXBpLmp3dEF1dGhvcml6ZXIsXG4gICAgICAgIGV2ZW50TWFuYWdlcixcbiAgICAgIH1cbiAgICApO1xuXG4gICAgbmV3IFRlbmFudENvbmZpZ1NlcnZpY2UodGhpcywgJ3RlbmFudENvbmZpZ1NlcnZpY2UnLCB7XG4gICAgICBhcGk6IGFwaS5hcGksXG4gICAgICB0ZW5hbnRNYW5hZ2VtZW50VGFibGU6IHRlbmFudE1hbmFnZW1lbnRTZXJ2aWNlcy50YWJsZSxcbiAgICB9KTtcblxuICAgIG5ldyBVc2VyTWFuYWdlbWVudFNlcnZpY2UodGhpcywgJ3VzZXJNYW5hZ2VtZW50U2VydmljZScsIHtcbiAgICAgIGFwaTogYXBpLmFwaSxcbiAgICAgIGF1dGgsXG4gICAgICBqd3RBdXRob3JpemVyOiBhcGkuand0QXV0aG9yaXplcixcbiAgICB9KTtcblxuICAgIHRoaXMuY29udHJvbFBsYW5lQVBJR2F0ZXdheVVybCA9IGFwaS5hcGlVcmw7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnZXZlbnRCcmlkZ2VBcm4nLCB7XG4gICAgICB2YWx1ZTogZXZlbnRNYW5hZ2VyLmJ1c0FybixcbiAgICAgIGtleTogJ2V2ZW50QnJpZGdlQXJuJyxcbiAgICB9KTtcblxuICAgIGlmIChwcm9wcy5iaWxsaW5nKSB7XG4gICAgICBjb25zdCBiaWxsaW5nVGVtcGxhdGUgPSBuZXcgQmlsbGluZ1Byb3ZpZGVyKHRoaXMsICdCaWxsaW5nJywge1xuICAgICAgICBiaWxsaW5nOiBwcm9wcy5iaWxsaW5nLFxuICAgICAgICBldmVudE1hbmFnZXI6IGV2ZW50TWFuYWdlcixcbiAgICAgICAgY29udHJvbFBsYW5lQVBJOiBhcGkuYXBpLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChiaWxsaW5nVGVtcGxhdGUuY29udHJvbFBsYW5lQVBJQmlsbGluZ1dlYmhvb2tSZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ2JpbGxpbmdXZWJob29rVVJMJywge1xuICAgICAgICAgIHZhbHVlOiBgJHthcGkuYXBpVXJsfSR7YmlsbGluZ1RlbXBsYXRlLmNvbnRyb2xQbGFuZUFQSUJpbGxpbmdXZWJob29rUmVzb3VyY2VQYXRofWAsXG4gICAgICAgICAga2V5OiAnYmlsbGluZ1dlYmhvb2tVUkwnLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5ldmVudE1hbmFnZXIgPSBldmVudE1hbmFnZXI7XG5cbiAgICAvLyBkZWZpbmVkIHN1cHByZXNzaW9uIGhlcmUgdG8gc3VwcHJlc3MgRXZlbnRzUm9sZSBEZWZhdWx0IHBvbGljeVxuICAgIC8vIHdoaWNoIGdldHMgdXBkYXRlZCBpbiBFdmVudE1hbmFnZXIgY29uc3RydWN0LCBidXQgaXMgcGFydCBvZiBDb250cm9sUGxhbmUgQVBJXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxuICAgICAgYXBpLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtSUFNNScsXG4gICAgICAgICAgcmVhc29uOiAnV2lsZGNhcmQgcmVxdWlyZWQgaW4gb3JkZXIgcGFzcyB0ZW5hbnRJZCBpbiBwYXRoLicsXG4gICAgICAgICAgYXBwbGllc1RvOiBbXG4gICAgICAgICAgICAnUmVzb3VyY2U6OmFybjo8QVdTOjpQYXJ0aXRpb24+OmV4ZWN1dGUtYXBpOjxBV1M6OlJlZ2lvbj46PEFXUzo6QWNjb3VudElkPjo8Q29udHJvbFBsYW5lY29udHJvbHBsYW5lYXBpc3RhY2tjb250cm9sUGxhbmVBUEkyNjE2RTE4Qz4vPENvbnRyb2xQbGFuZWNvbnRyb2xwbGFuZWFwaXN0YWNrY29udHJvbFBsYW5lQVBJRGVwbG95bWVudFN0YWdlcHJvZEE3Q0ExMDQwPi9QVVQvdGVuYW50cy8qJyxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHRydWUgLy8gYXBwbHlUb0NoaWxkcmVuID0gdHJ1ZSwgc28gdGhhdCBpdCBhcHBsaWVzIHRvIHRoZSBBUElHVyByb2xlIGNyZWF0ZWQgYnkgY2RrIGluIHRoZSBjb250cm9sUGxhbmVBUEkgY29uc3RydWN0XG4gICAgKTtcbiAgfVxufVxuIl19
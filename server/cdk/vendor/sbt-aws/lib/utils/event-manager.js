"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = exports.DetailType = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const aws_events_1 = require("aws-cdk-lib/aws-events");
const constructs_1 = require("constructs");
const utils_1 = require("./utils");
/**
 * Provides an easy way of accessing event detail types.
 * The string values represent the "detail-type" used in
 * events sent across the EventBus.
 */
var DetailType;
(function (DetailType) {
    /**
     * Event detail type for onboarding request.
     */
    DetailType["ONBOARDING_REQUEST"] = "onboardingRequest";
    /**
     * Event detail type for successful onboarding.
     */
    DetailType["ONBOARDING_SUCCESS"] = "onboardingSuccess";
    /**
     * Event detail type for failed onboarding.
     */
    DetailType["ONBOARDING_FAILURE"] = "onboardingFailure";
    /**
     * Event detail type for offboarding request.
     */
    DetailType["OFFBOARDING_REQUEST"] = "offboardingRequest";
    /**
     * Event detail type for successful offboarding.
     */
    DetailType["OFFBOARDING_SUCCESS"] = "offboardingSuccess";
    /**
     * Event detail type for failed offboarding.
     */
    DetailType["OFFBOARDING_FAILURE"] = "offboardingFailure";
    /**
     * Event detail type for successful provisioning.
     */
    DetailType["PROVISION_SUCCESS"] = "provisionSuccess";
    /**
     * Event detail type for failed provisioning.
     */
    DetailType["PROVISION_FAILURE"] = "provisionFailure";
    /**
     * Event detail type for successful deprovisioning.
     */
    DetailType["DEPROVISION_SUCCESS"] = "deprovisionSuccess";
    /**
     * Event detail type for failed deprovisioning.
     */
    DetailType["DEPROVISION_FAILURE"] = "deprovisionFailure";
    /**
     * Event detail type for successful billing configuration.
     */
    DetailType["BILLING_SUCCESS"] = "billingSuccess";
    /**
     * Event detail type for failure to configure billing.
     */
    DetailType["BILLING_FAILURE"] = "billingFailure";
    /**
     * Event detail type for activation request.
     */
    DetailType["ACTIVATE_REQUEST"] = "activateRequest";
    /**
     * Event detail type for successful activation.
     */
    DetailType["ACTIVATE_SUCCESS"] = "activateSuccess";
    /**
     * Event detail type for failed activation.
     */
    DetailType["ACTIVATE_FAILURE"] = "activateFailure";
    /**
     * Event detail type for deactivation request.
     */
    DetailType["DEACTIVATE_REQUEST"] = "deactivateRequest";
    /**
     * Event detail type for successful deactivation.
     */
    DetailType["DEACTIVATE_SUCCESS"] = "deactivateSuccess";
    /**
     * Event detail type for failed deactivation.
     */
    DetailType["DEACTIVATE_FAILURE"] = "deactivateFailure";
    /**
     * Event detail type for user creation on the app-plane side.
     * Note that sbt-aws components do not emit this event. This event
     * should be emitted by the application plane.
     */
    DetailType["TENANT_USER_CREATED"] = "tenantUserCreated";
    /**
     * Event detail type for user deletion on the app-plane side.
     * Note that sbt-aws components do not emit this event. This event
     * should be emitted by the application plane.
     */
    DetailType["TENANT_USER_DELETED"] = "tenantUserDeleted";
})(DetailType || (exports.DetailType = DetailType = {}));
/**
 * Provides an EventManager to interact with the EventBus shared with the SBT control plane.
 */
class EventManager extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        /**
         * The event source used for events emitted by the application plane.
         * @default
         */
        this.applicationPlaneEventSource = 'applicationPlaneEventSource';
        /**
         * The event source used for events emitted by the control plane.
         * @default
         */
        this.controlPlaneEventSource = 'controlPlaneEventSource';
        (0, utils_1.addTemplateTag)(this, 'EventManager');
        this.eventBus = props?.eventBus ?? new aws_events_1.EventBus(this, 'SbtEventBus');
        this.busName = this.eventBus.eventBusName;
        this.busArn = this.eventBus.eventBusArn;
        this.applicationPlaneEventSource =
            props?.applicationPlaneEventSource || this.applicationPlaneEventSource;
        this.controlPlaneEventSource = props?.controlPlaneEventSource || this.controlPlaneEventSource;
        // for every DetailType enum, there should be
        // a corresponding key in the supportedEvents map
        this.supportedEvents = {
            onboardingRequest: this.controlPlaneEventSource,
            onboardingSuccess: this.applicationPlaneEventSource,
            onboardingFailure: this.applicationPlaneEventSource,
            offboardingRequest: this.controlPlaneEventSource,
            offboardingSuccess: this.applicationPlaneEventSource,
            offboardingFailure: this.applicationPlaneEventSource,
            provisionSuccess: this.applicationPlaneEventSource,
            provisionFailure: this.applicationPlaneEventSource,
            deprovisionSuccess: this.applicationPlaneEventSource,
            deprovisionFailure: this.applicationPlaneEventSource,
            billingSuccess: this.controlPlaneEventSource,
            billingFailure: this.controlPlaneEventSource,
            activateRequest: this.controlPlaneEventSource,
            activateSuccess: this.applicationPlaneEventSource,
            activateFailure: this.applicationPlaneEventSource,
            deactivateRequest: this.controlPlaneEventSource,
            deactivateSuccess: this.applicationPlaneEventSource,
            deactivateFailure: this.applicationPlaneEventSource,
            tenantUserCreated: this.controlPlaneEventSource,
            tenantUserDeleted: this.controlPlaneEventSource,
        };
        for (const key in this.supportedEvents) {
            // update this.eventMetadata with any values passed in via props
            if (props?.eventMetadata && props?.eventMetadata[key]) {
                this.supportedEvents[key] = props.eventMetadata[key];
            }
        }
    }
    /**
     * Provides grantee the permissions to place events
     * on the EventManager bus.
     *
     * @param grantee The grantee resource that will be granted the permission(s).
     */
    grantPutEventsTo(grantee) {
        this.eventBus.grantPutEventsTo(grantee);
    }
    /**
     * Adds an IRuleTarget to an event.
     *
     * @param scope The scope in which to find (or create) the Rule.
     * @param eventType The detail type of the event to add a target to.
     * @param target The target that will be added to the event.
     */
    addTargetToEvent(scope, eventType, target) {
        this.getOrCreateRule(scope, eventType).addTarget(target);
    }
    /**
     * Returns a Rule for the given eventType in the context of a scope.
     * A new one is created if the rule is not found in the scope.
     *
     * @param scope The scope in which to find (or create) the Rule.
     * @param eventType The detail type of the event to add a target to.
     * @returns A Rule for the given eventType in the provided scope.
     */
    getOrCreateRule(scope, eventType) {
        let rule = scope.node.tryFindChild(`${eventType}Rule`);
        if (!rule) {
            rule = new aws_events_1.Rule(scope, `${eventType}Rule`, {
                eventBus: this.eventBus,
                eventPattern: {
                    source: [this.supportedEvents[eventType]],
                    detailType: [eventType],
                },
            });
        }
        return rule;
    }
}
exports.EventManager = EventManager;
_a = JSII_RTTI_SYMBOL_1;
EventManager[_a] = { fqn: "@cdklabs/sbt-aws.EventManager", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9ldmVudC1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEscUVBQXFFO0FBQ3JFLHNDQUFzQztBQUV0Qyx1REFBZ0Y7QUFFaEYsMkNBQXVDO0FBQ3ZDLG1DQUF5QztBQUV6Qzs7OztHQUlHO0FBQ0gsSUFBWSxVQTRGWDtBQTVGRCxXQUFZLFVBQVU7SUFDcEI7O09BRUc7SUFDSCxzREFBd0MsQ0FBQTtJQUN4Qzs7T0FFRztJQUNILHNEQUF3QyxDQUFBO0lBQ3hDOztPQUVHO0lBQ0gsc0RBQXdDLENBQUE7SUFFeEM7O09BRUc7SUFDSCx3REFBMEMsQ0FBQTtJQUMxQzs7T0FFRztJQUNILHdEQUEwQyxDQUFBO0lBQzFDOztPQUVHO0lBQ0gsd0RBQTBDLENBQUE7SUFFMUM7O09BRUc7SUFDSCxvREFBc0MsQ0FBQTtJQUN0Qzs7T0FFRztJQUNILG9EQUFzQyxDQUFBO0lBRXRDOztPQUVHO0lBQ0gsd0RBQTBDLENBQUE7SUFDMUM7O09BRUc7SUFDSCx3REFBMEMsQ0FBQTtJQUUxQzs7T0FFRztJQUNILGdEQUFrQyxDQUFBO0lBQ2xDOztPQUVHO0lBQ0gsZ0RBQWtDLENBQUE7SUFFbEM7O09BRUc7SUFDSCxrREFBb0MsQ0FBQTtJQUNwQzs7T0FFRztJQUNILGtEQUFvQyxDQUFBO0lBQ3BDOztPQUVHO0lBQ0gsa0RBQW9DLENBQUE7SUFFcEM7O09BRUc7SUFDSCxzREFBd0MsQ0FBQTtJQUN4Qzs7T0FFRztJQUNILHNEQUF3QyxDQUFBO0lBQ3hDOztPQUVHO0lBQ0gsc0RBQXdDLENBQUE7SUFFeEM7Ozs7T0FJRztJQUNILHVEQUF5QyxDQUFBO0lBQ3pDOzs7O09BSUc7SUFDSCx1REFBeUMsQ0FBQTtBQUMzQyxDQUFDLEVBNUZXLFVBQVUsMEJBQVYsVUFBVSxRQTRGckI7QUErRUQ7O0dBRUc7QUFDSCxNQUFhLFlBQWEsU0FBUSxzQkFB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QztJQUVEOzs7Ozs7O09BT0c7SUFDSyxlQUFlLENBQUMsS0FBZ0IsRUFBRSxTQUFxQjtRQUM3RCxJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLFNBQVMsTUFBTSxDQUFTLENBQUM7UUFDL0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxHQUFHLElBQUksaUJBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxTQUFTLE1BQU0sRUFBRTtnQkFDekMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixZQUFZLEVBQUU7b0JBQ1osTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDekMsVUFBVSxFQUFFLENBQUMsU0FBUyxDQUFDO2lCQUN4QjthQUNGLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7O0FBdkhILG9DQXdIQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcblxuaW1wb3J0IHsgSUV2ZW50QnVzLCBSdWxlLCBJUnVsZVRhcmdldCwgRXZlbnRCdXMgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCB7IElHcmFudGFibGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgYWRkVGVtcGxhdGVUYWcgfSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBQcm92aWRlcyBhbiBlYXN5IHdheSBvZiBhY2Nlc3NpbmcgZXZlbnQgZGV0YWlsIHR5cGVzLlxuICogVGhlIHN0cmluZyB2YWx1ZXMgcmVwcmVzZW50IHRoZSBcImRldGFpbC10eXBlXCIgdXNlZCBpblxuICogZXZlbnRzIHNlbnQgYWNyb3NzIHRoZSBFdmVudEJ1cy5cbiAqL1xuZXhwb3J0IGVudW0gRGV0YWlsVHlwZSB7XG4gIC8qKlxuICAgKiBFdmVudCBkZXRhaWwgdHlwZSBmb3Igb25ib2FyZGluZyByZXF1ZXN0LlxuICAgKi9cbiAgT05CT0FSRElOR19SRVFVRVNUID0gJ29uYm9hcmRpbmdSZXF1ZXN0JyxcbiAgLyoqXG4gICAqIEV2ZW50IGRldGFpbCB0eXBlIGZvciBzdWNjZXNzZnVsIG9uYm9hcmRpbmcuXG4gICAqL1xuICBPTkJPQVJESU5HX1NVQ0NFU1MgPSAnb25ib2FyZGluZ1N1Y2Nlc3MnLFxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIGZhaWxlZCBvbmJvYXJkaW5nLlxuICAgKi9cbiAgT05CT0FSRElOR19GQUlMVVJFID0gJ29uYm9hcmRpbmdGYWlsdXJlJyxcblxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIG9mZmJvYXJkaW5nIHJlcXVlc3QuXG4gICAqL1xuICBPRkZCT0FSRElOR19SRVFVRVNUID0gJ29mZmJvYXJkaW5nUmVxdWVzdCcsXG4gIC8qKlxuICAgKiBFdmVudCBkZXRhaWwgdHlwZSBmb3Igc3VjY2Vzc2Z1bCBvZmZib2FyZGluZy5cbiAgICovXG4gIE9GRkJPQVJESU5HX1NVQ0NFU1MgPSAnb2ZmYm9hcmRpbmdTdWNjZXNzJyxcbiAgLyoqXG4gICAqIEV2ZW50IGRldGFpbCB0eXBlIGZvciBmYWlsZWQgb2ZmYm9hcmRpbmcuXG4gICAqL1xuICBPRkZCT0FSRElOR19GQUlMVVJFID0gJ29mZmJvYXJkaW5nRmFpbHVyZScsXG5cbiAgLyoqXG4gICAqIEV2ZW50IGRldGFpbCB0eXBlIGZvciBzdWNjZXNzZnVsIHByb3Zpc2lvbmluZy5cbiAgICovXG4gIFBST1ZJU0lPTl9TVUNDRVNTID0gJ3Byb3Zpc2lvblN1Y2Nlc3MnLFxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIGZhaWxlZCBwcm92aXNpb25pbmcuXG4gICAqL1xuICBQUk9WSVNJT05fRkFJTFVSRSA9ICdwcm92aXNpb25GYWlsdXJlJyxcblxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIHN1Y2Nlc3NmdWwgZGVwcm92aXNpb25pbmcuXG4gICAqL1xuICBERVBST1ZJU0lPTl9TVUNDRVNTID0gJ2RlcHJvdmlzaW9uU3VjY2VzcycsXG4gIC8qKlxuICAgKiBFdmVudCBkZXRhaWwgdHlwZSBmb3IgZmFpbGVkIGRlcHJvdmlzaW9uaW5nLlxuICAgKi9cbiAgREVQUk9WSVNJT05fRkFJTFVSRSA9ICdkZXByb3Zpc2lvbkZhaWx1cmUnLFxuXG4gIC8qKlxuICAgKiBFdmVudCBkZXRhaWwgdHlwZSBmb3Igc3VjY2Vzc2Z1bCBiaWxsaW5nIGNvbmZpZ3VyYXRpb24uXG4gICAqL1xuICBCSUxMSU5HX1NVQ0NFU1MgPSAnYmlsbGluZ1N1Y2Nlc3MnLFxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIGZhaWx1cmUgdG8gY29uZmlndXJlIGJpbGxpbmcuXG4gICAqL1xuICBCSUxMSU5HX0ZBSUxVUkUgPSAnYmlsbGluZ0ZhaWx1cmUnLFxuXG4gIC8qKlxuICAgKiBFdmVudCBkZXRhaWwgdHlwZSBmb3IgYWN0aXZhdGlvbiByZXF1ZXN0LlxuICAgKi9cbiAgQUNUSVZBVEVfUkVRVUVTVCA9ICdhY3RpdmF0ZVJlcXVlc3QnLFxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIHN1Y2Nlc3NmdWwgYWN0aXZhdGlvbi5cbiAgICovXG4gIEFDVElWQVRFX1NVQ0NFU1MgPSAnYWN0aXZhdGVTdWNjZXNzJyxcbiAgLyoqXG4gICAqIEV2ZW50IGRldGFpbCB0eXBlIGZvciBmYWlsZWQgYWN0aXZhdGlvbi5cbiAgICovXG4gIEFDVElWQVRFX0ZBSUxVUkUgPSAnYWN0aXZhdGVGYWlsdXJlJyxcblxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIGRlYWN0aXZhdGlvbiByZXF1ZXN0LlxuICAgKi9cbiAgREVBQ1RJVkFURV9SRVFVRVNUID0gJ2RlYWN0aXZhdGVSZXF1ZXN0JyxcbiAgLyoqXG4gICAqIEV2ZW50IGRldGFpbCB0eXBlIGZvciBzdWNjZXNzZnVsIGRlYWN0aXZhdGlvbi5cbiAgICovXG4gIERFQUNUSVZBVEVfU1VDQ0VTUyA9ICdkZWFjdGl2YXRlU3VjY2VzcycsXG4gIC8qKlxuICAgKiBFdmVudCBkZXRhaWwgdHlwZSBmb3IgZmFpbGVkIGRlYWN0aXZhdGlvbi5cbiAgICovXG4gIERFQUNUSVZBVEVfRkFJTFVSRSA9ICdkZWFjdGl2YXRlRmFpbHVyZScsXG5cbiAgLyoqXG4gICAqIEV2ZW50IGRldGFpbCB0eXBlIGZvciB1c2VyIGNyZWF0aW9uIG9uIHRoZSBhcHAtcGxhbmUgc2lkZS5cbiAgICogTm90ZSB0aGF0IHNidC1hd3MgY29tcG9uZW50cyBkbyBub3QgZW1pdCB0aGlzIGV2ZW50LiBUaGlzIGV2ZW50XG4gICAqIHNob3VsZCBiZSBlbWl0dGVkIGJ5IHRoZSBhcHBsaWNhdGlvbiBwbGFuZS5cbiAgICovXG4gIFRFTkFOVF9VU0VSX0NSRUFURUQgPSAndGVuYW50VXNlckNyZWF0ZWQnLFxuICAvKipcbiAgICogRXZlbnQgZGV0YWlsIHR5cGUgZm9yIHVzZXIgZGVsZXRpb24gb24gdGhlIGFwcC1wbGFuZSBzaWRlLlxuICAgKiBOb3RlIHRoYXQgc2J0LWF3cyBjb21wb25lbnRzIGRvIG5vdCBlbWl0IHRoaXMgZXZlbnQuIFRoaXMgZXZlbnRcbiAgICogc2hvdWxkIGJlIGVtaXR0ZWQgYnkgdGhlIGFwcGxpY2F0aW9uIHBsYW5lLlxuICAgKi9cbiAgVEVOQU5UX1VTRVJfREVMRVRFRCA9ICd0ZW5hbnRVc2VyRGVsZXRlZCcsXG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIG1hcHBpbmcgYmV0d2VlbiAnZGV0YWlsVHlwZScgYXMgdGhlIGtleSBhbmQgJ3NvdXJjZScgYXMgdGhlIHZhbHVlLlxuICovXG5leHBvcnQgdHlwZSBFdmVudE1ldGFkYXRhID0ge1xuICAvLyBrZXk6IEV2ZW50ICdkZXRhaWxUeXBlJyAtPiB2YWx1ZTogRXZlbnQgJ3NvdXJjZSdcbiAgW2tleTogc3RyaW5nXTogc3RyaW5nO1xuICAvLyBba2V5IGluIERldGFpbFR5cGVdOiBzdHJpbmc7IC8vIENhdXNlcyB0aGlzIGVycm9yOiBPbmx5IHN0cmluZy1pbmRleGVkIG1hcCB0eXBlcyBhcmUgc3VwcG9ydGVkXG59O1xuXG4vKipcbiAqIEVuY2Fwc3VsYXRlcyB0aGUgcHJvcGVydGllcyBmb3IgYW4gRXZlbnRNYW5hZ2VyLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50TWFuYWdlclByb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBldmVudCBidXMgdG8gcmVnaXN0ZXIgbmV3IHJ1bGVzIHdpdGguIE9uZSB3aWxsIGJlIGNyZWF0ZWQgaWYgbm90IHByb3ZpZGVkLlxuICAgKi9cbiAgcmVhZG9ubHkgZXZlbnRCdXM/OiBJRXZlbnRCdXM7XG5cbiAgLyoqXG4gICAqIFRoZSBFdmVudE1ldGFkYXRhIHRvIHVzZSB0byB1cGRhdGUgdGhlIGV2ZW50IGRlZmF1bHRzLlxuICAgKi9cbiAgcmVhZG9ubHkgZXZlbnRNZXRhZGF0YT86IEV2ZW50TWV0YWRhdGE7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBldmVudCBzb3VyY2UgZm9yIGV2ZW50cyBjb21pbmcgZnJvbSB0aGUgU0JUIGNvbnRyb2wgcGxhbmUuXG4gICAqL1xuICByZWFkb25seSBjb250cm9sUGxhbmVFdmVudFNvdXJjZT86IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGV2ZW50IHNvdXJjZSBmb3IgZXZlbnRzIGNvbWluZyBmcm9tIHRoZSBTQlQgYXBwbGljYXRpb24gcGxhbmUuXG4gICAqL1xuICByZWFkb25seSBhcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2U/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSUV2ZW50TWFuYWdlciB7XG4gIC8qKlxuICAgKiBUaGUgZXZlbnQgc291cmNlIHVzZWQgZm9yIGV2ZW50cyBlbWl0dGVkIGJ5IHRoZSBhcHBsaWNhdGlvbiBwbGFuZS5cbiAgICovXG4gIHJlYWRvbmx5IGFwcGxpY2F0aW9uUGxhbmVFdmVudFNvdXJjZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBUaGUgZXZlbnQgc291cmNlIHVzZWQgZm9yIGV2ZW50cyBlbWl0dGVkIGJ5IHRoZSBjb250cm9sIHBsYW5lLlxuICAgKi9cbiAgcmVhZG9ubHkgY29udHJvbFBsYW5lRXZlbnRTb3VyY2U6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGJ1cyB0aGF0IHdpbGwgYmUgdXNlZCB0byBzZW5kIGFuZCByZWNlaXZlIGV2ZW50cy5cbiAgICovXG4gIHJlYWRvbmx5IGJ1c05hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIEFSTi9JRCBvZiB0aGUgYnVzIHRoYXQgd2lsbCBiZSB1c2VkIHRvIHNlbmQgYW5kIHJlY2VpdmUgZXZlbnRzLlxuICAgKi9cbiAgcmVhZG9ubHkgYnVzQXJuOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgcmVjb2duaXplZCBldmVudHMgdGhhdCBhcmUgYXZhaWxhYmxlIGFzIHRyaWdnZXJzLlxuICAgKi9cbiAgcmVhZG9ubHkgc3VwcG9ydGVkRXZlbnRzOiBFdmVudE1ldGFkYXRhO1xuXG4gIC8qKlxuICAgKiBBZGRzIGFuIElSdWxlVGFyZ2V0IHRvIGFuIGV2ZW50LlxuICAgKlxuICAgKiBAcGFyYW0gZXZlbnRUeXBlIFRoZSBkZXRhaWwgdHlwZSBvZiB0aGUgZXZlbnQgdG8gYWRkIGEgdGFyZ2V0IHRvLlxuICAgKiBAcGFyYW0gdGFyZ2V0IFRoZSB0YXJnZXQgdGhhdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBldmVudC5cbiAgICovXG4gIGFkZFRhcmdldFRvRXZlbnQoc2NvcGU6IENvbnN0cnVjdCwgZXZlbnRUeXBlOiBEZXRhaWxUeXBlLCB0YXJnZXQ6IElSdWxlVGFyZ2V0KTogdm9pZDtcblxuICAvKipcbiAgICogUHJvdmlkZXMgZ3JhbnRlZSB0aGUgcGVybWlzc2lvbnMgdG8gcGxhY2UgZXZlbnRzXG4gICAqIG9uIHRoZSBFdmVudE1hbmFnZXIgYnVzLlxuICAgKlxuICAgKiBAcGFyYW0gZ3JhbnRlZSBUaGUgZ3JhbnRlZSByZXNvdXJjZSB0aGF0IHdpbGwgYmUgZ3JhbnRlZCB0aGUgcGVybWlzc2lvbihzKS5cbiAgICovXG4gIGdyYW50UHV0RXZlbnRzVG8oZ3JhbnRlZTogSUdyYW50YWJsZSk6IHZvaWQ7XG59XG5cbi8qKlxuICogUHJvdmlkZXMgYW4gRXZlbnRNYW5hZ2VyIHRvIGludGVyYWN0IHdpdGggdGhlIEV2ZW50QnVzIHNoYXJlZCB3aXRoIHRoZSBTQlQgY29udHJvbCBwbGFuZS5cbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50TWFuYWdlciBleHRlbmRzIENvbnN0cnVjdCBpbXBsZW1lbnRzIElFdmVudE1hbmFnZXIge1xuICAvKipcbiAgICogVGhlIGV2ZW50IHNvdXJjZSB1c2VkIGZvciBldmVudHMgZW1pdHRlZCBieSB0aGUgYXBwbGljYXRpb24gcGxhbmUuXG4gICAqIEBkZWZhdWx0XG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgYXBwbGljYXRpb25QbGFuZUV2ZW50U291cmNlOiBzdHJpbmcgPSAnYXBwbGljYXRpb25QbGFuZUV2ZW50U291cmNlJztcblxuICAvKipcbiAgICogVGhlIGV2ZW50IHNvdXJjZSB1c2VkIGZvciBldmVudHMgZW1pdHRlZCBieSB0aGUgY29udHJvbCBwbGFuZS5cbiAgICogQGRlZmF1bHRcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBjb250cm9sUGxhbmVFdmVudFNvdXJjZTogc3RyaW5nID0gJ2NvbnRyb2xQbGFuZUV2ZW50U291cmNlJztcblxuICAvKipcbiAgICogTGlzdCBvZiByZWNvZ25pemVkIGV2ZW50cyB0aGF0IGFyZSBhdmFpbGFibGUgYXMgdHJpZ2dlcnMuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgc3VwcG9ydGVkRXZlbnRzOiBFdmVudE1ldGFkYXRhO1xuXG4gIC8qKlxuICAgKiBUaGUgZXZlbnRCdXMgcmVzb3VyY2UgdGhhdCB3aWxsIGJlIHVzZWQgdG8gc2VuZCBhbmQgcmVjZWl2ZSBldmVudHMuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgZXZlbnRCdXM6IElFdmVudEJ1cztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGJ1cyB0aGF0IHdpbGwgYmUgdXNlZCB0byBzZW5kIGFuZCByZWNlaXZlIGV2ZW50cy5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBidXNOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBBUk4vSUQgb2YgdGhlIGJ1cyB0aGF0IHdpbGwgYmUgdXNlZCB0byBzZW5kIGFuZCByZWNlaXZlIGV2ZW50cy5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBidXNBcm46IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IEV2ZW50TWFuYWdlclByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICBhZGRUZW1wbGF0ZVRhZyh0aGlzLCAnRXZlbnRNYW5hZ2VyJyk7XG4gICAgdGhpcy5ldmVudEJ1cyA9IHByb3BzPy5ldmVudEJ1cyA/PyBuZXcgRXZlbnRCdXModGhpcywgJ1NidEV2ZW50QnVzJyk7XG4gICAgdGhpcy5idXNOYW1lID0gdGhpcy5ldmVudEJ1cy5ldmVudEJ1c05hbWU7XG4gICAgdGhpcy5idXNBcm4gPSB0aGlzLmV2ZW50QnVzLmV2ZW50QnVzQXJuO1xuXG4gICAgdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UgPVxuICAgICAgcHJvcHM/LmFwcGxpY2F0aW9uUGxhbmVFdmVudFNvdXJjZSB8fCB0aGlzLmFwcGxpY2F0aW9uUGxhbmVFdmVudFNvdXJjZTtcbiAgICB0aGlzLmNvbnRyb2xQbGFuZUV2ZW50U291cmNlID0gcHJvcHM/LmNvbnRyb2xQbGFuZUV2ZW50U291cmNlIHx8IHRoaXMuY29udHJvbFBsYW5lRXZlbnRTb3VyY2U7XG5cbiAgICAvLyBmb3IgZXZlcnkgRGV0YWlsVHlwZSBlbnVtLCB0aGVyZSBzaG91bGQgYmVcbiAgICAvLyBhIGNvcnJlc3BvbmRpbmcga2V5IGluIHRoZSBzdXBwb3J0ZWRFdmVudHMgbWFwXG4gICAgdGhpcy5zdXBwb3J0ZWRFdmVudHMgPSB7XG4gICAgICBvbmJvYXJkaW5nUmVxdWVzdDogdGhpcy5jb250cm9sUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIG9uYm9hcmRpbmdTdWNjZXNzOiB0aGlzLmFwcGxpY2F0aW9uUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIG9uYm9hcmRpbmdGYWlsdXJlOiB0aGlzLmFwcGxpY2F0aW9uUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIG9mZmJvYXJkaW5nUmVxdWVzdDogdGhpcy5jb250cm9sUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIG9mZmJvYXJkaW5nU3VjY2VzczogdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBvZmZib2FyZGluZ0ZhaWx1cmU6IHRoaXMuYXBwbGljYXRpb25QbGFuZUV2ZW50U291cmNlLFxuICAgICAgcHJvdmlzaW9uU3VjY2VzczogdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBwcm92aXNpb25GYWlsdXJlOiB0aGlzLmFwcGxpY2F0aW9uUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIGRlcHJvdmlzaW9uU3VjY2VzczogdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBkZXByb3Zpc2lvbkZhaWx1cmU6IHRoaXMuYXBwbGljYXRpb25QbGFuZUV2ZW50U291cmNlLFxuICAgICAgYmlsbGluZ1N1Y2Nlc3M6IHRoaXMuY29udHJvbFBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBiaWxsaW5nRmFpbHVyZTogdGhpcy5jb250cm9sUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIGFjdGl2YXRlUmVxdWVzdDogdGhpcy5jb250cm9sUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIGFjdGl2YXRlU3VjY2VzczogdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBhY3RpdmF0ZUZhaWx1cmU6IHRoaXMuYXBwbGljYXRpb25QbGFuZUV2ZW50U291cmNlLFxuICAgICAgZGVhY3RpdmF0ZVJlcXVlc3Q6IHRoaXMuY29udHJvbFBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBkZWFjdGl2YXRlU3VjY2VzczogdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICBkZWFjdGl2YXRlRmFpbHVyZTogdGhpcy5hcHBsaWNhdGlvblBsYW5lRXZlbnRTb3VyY2UsXG4gICAgICB0ZW5hbnRVc2VyQ3JlYXRlZDogdGhpcy5jb250cm9sUGxhbmVFdmVudFNvdXJjZSxcbiAgICAgIHRlbmFudFVzZXJEZWxldGVkOiB0aGlzLmNvbnRyb2xQbGFuZUV2ZW50U291cmNlLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGtleSBpbiB0aGlzLnN1cHBvcnRlZEV2ZW50cykge1xuICAgICAgLy8gdXBkYXRlIHRoaXMuZXZlbnRNZXRhZGF0YSB3aXRoIGFueSB2YWx1ZXMgcGFzc2VkIGluIHZpYSBwcm9wc1xuICAgICAgaWYgKHByb3BzPy5ldmVudE1ldGFkYXRhICYmIHByb3BzPy5ldmVudE1ldGFkYXRhW2tleV0pIHtcbiAgICAgICAgdGhpcy5zdXBwb3J0ZWRFdmVudHNba2V5XSA9IHByb3BzLmV2ZW50TWV0YWRhdGFba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJvdmlkZXMgZ3JhbnRlZSB0aGUgcGVybWlzc2lvbnMgdG8gcGxhY2UgZXZlbnRzXG4gICAqIG9uIHRoZSBFdmVudE1hbmFnZXIgYnVzLlxuICAgKlxuICAgKiBAcGFyYW0gZ3JhbnRlZSBUaGUgZ3JhbnRlZSByZXNvdXJjZSB0aGF0IHdpbGwgYmUgZ3JhbnRlZCB0aGUgcGVybWlzc2lvbihzKS5cbiAgICovXG4gIGdyYW50UHV0RXZlbnRzVG8oZ3JhbnRlZTogSUdyYW50YWJsZSkge1xuICAgIHRoaXMuZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyhncmFudGVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIElSdWxlVGFyZ2V0IHRvIGFuIGV2ZW50LlxuICAgKlxuICAgKiBAcGFyYW0gc2NvcGUgVGhlIHNjb3BlIGluIHdoaWNoIHRvIGZpbmQgKG9yIGNyZWF0ZSkgdGhlIFJ1bGUuXG4gICAqIEBwYXJhbSBldmVudFR5cGUgVGhlIGRldGFpbCB0eXBlIG9mIHRoZSBldmVudCB0byBhZGQgYSB0YXJnZXQgdG8uXG4gICAqIEBwYXJhbSB0YXJnZXQgVGhlIHRhcmdldCB0aGF0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGV2ZW50LlxuICAgKi9cbiAgcHVibGljIGFkZFRhcmdldFRvRXZlbnQoc2NvcGU6IENvbnN0cnVjdCwgZXZlbnRUeXBlOiBEZXRhaWxUeXBlLCB0YXJnZXQ6IElSdWxlVGFyZ2V0KTogdm9pZCB7XG4gICAgdGhpcy5nZXRPckNyZWF0ZVJ1bGUoc2NvcGUsIGV2ZW50VHlwZSkuYWRkVGFyZ2V0KHRhcmdldCk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIFJ1bGUgZm9yIHRoZSBnaXZlbiBldmVudFR5cGUgaW4gdGhlIGNvbnRleHQgb2YgYSBzY29wZS5cbiAgICogQSBuZXcgb25lIGlzIGNyZWF0ZWQgaWYgdGhlIHJ1bGUgaXMgbm90IGZvdW5kIGluIHRoZSBzY29wZS5cbiAgICpcbiAgICogQHBhcmFtIHNjb3BlIFRoZSBzY29wZSBpbiB3aGljaCB0byBmaW5kIChvciBjcmVhdGUpIHRoZSBSdWxlLlxuICAgKiBAcGFyYW0gZXZlbnRUeXBlIFRoZSBkZXRhaWwgdHlwZSBvZiB0aGUgZXZlbnQgdG8gYWRkIGEgdGFyZ2V0IHRvLlxuICAgKiBAcmV0dXJucyBBIFJ1bGUgZm9yIHRoZSBnaXZlbiBldmVudFR5cGUgaW4gdGhlIHByb3ZpZGVkIHNjb3BlLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRPckNyZWF0ZVJ1bGUoc2NvcGU6IENvbnN0cnVjdCwgZXZlbnRUeXBlOiBEZXRhaWxUeXBlKTogUnVsZSB7XG4gICAgbGV0IHJ1bGUgPSBzY29wZS5ub2RlLnRyeUZpbmRDaGlsZChgJHtldmVudFR5cGV9UnVsZWApIGFzIFJ1bGU7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBydWxlID0gbmV3IFJ1bGUoc2NvcGUsIGAke2V2ZW50VHlwZX1SdWxlYCwge1xuICAgICAgICBldmVudEJ1czogdGhpcy5ldmVudEJ1cyxcbiAgICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgICAgc291cmNlOiBbdGhpcy5zdXBwb3J0ZWRFdmVudHNbZXZlbnRUeXBlXV0sXG4gICAgICAgICAgZGV0YWlsVHlwZTogW2V2ZW50VHlwZV0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnVsZTtcbiAgfVxufVxuIl19
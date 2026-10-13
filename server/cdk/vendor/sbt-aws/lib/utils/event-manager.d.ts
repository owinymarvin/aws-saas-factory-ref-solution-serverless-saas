import { IEventBus, IRuleTarget } from 'aws-cdk-lib/aws-events';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Provides an easy way of accessing event detail types.
 * The string values represent the "detail-type" used in
 * events sent across the EventBus.
 */
export declare enum DetailType {
    /**
     * Event detail type for onboarding request.
     */
    ONBOARDING_REQUEST = "onboardingRequest",
    /**
     * Event detail type for successful onboarding.
     */
    ONBOARDING_SUCCESS = "onboardingSuccess",
    /**
     * Event detail type for failed onboarding.
     */
    ONBOARDING_FAILURE = "onboardingFailure",
    /**
     * Event detail type for offboarding request.
     */
    OFFBOARDING_REQUEST = "offboardingRequest",
    /**
     * Event detail type for successful offboarding.
     */
    OFFBOARDING_SUCCESS = "offboardingSuccess",
    /**
     * Event detail type for failed offboarding.
     */
    OFFBOARDING_FAILURE = "offboardingFailure",
    /**
     * Event detail type for successful provisioning.
     */
    PROVISION_SUCCESS = "provisionSuccess",
    /**
     * Event detail type for failed provisioning.
     */
    PROVISION_FAILURE = "provisionFailure",
    /**
     * Event detail type for successful deprovisioning.
     */
    DEPROVISION_SUCCESS = "deprovisionSuccess",
    /**
     * Event detail type for failed deprovisioning.
     */
    DEPROVISION_FAILURE = "deprovisionFailure",
    /**
     * Event detail type for successful billing configuration.
     */
    BILLING_SUCCESS = "billingSuccess",
    /**
     * Event detail type for failure to configure billing.
     */
    BILLING_FAILURE = "billingFailure",
    /**
     * Event detail type for activation request.
     */
    ACTIVATE_REQUEST = "activateRequest",
    /**
     * Event detail type for successful activation.
     */
    ACTIVATE_SUCCESS = "activateSuccess",
    /**
     * Event detail type for failed activation.
     */
    ACTIVATE_FAILURE = "activateFailure",
    /**
     * Event detail type for deactivation request.
     */
    DEACTIVATE_REQUEST = "deactivateRequest",
    /**
     * Event detail type for successful deactivation.
     */
    DEACTIVATE_SUCCESS = "deactivateSuccess",
    /**
     * Event detail type for failed deactivation.
     */
    DEACTIVATE_FAILURE = "deactivateFailure",
    /**
     * Event detail type for user creation on the app-plane side.
     * Note that sbt-aws components do not emit this event. This event
     * should be emitted by the application plane.
     */
    TENANT_USER_CREATED = "tenantUserCreated",
    /**
     * Event detail type for user deletion on the app-plane side.
     * Note that sbt-aws components do not emit this event. This event
     * should be emitted by the application plane.
     */
    TENANT_USER_DELETED = "tenantUserDeleted"
}
/**
 * Represents a mapping between 'detailType' as the key and 'source' as the value.
 */
export type EventMetadata = {
    [key: string]: string;
};
/**
 * Encapsulates the properties for an EventManager.
 */
export interface EventManagerProps {
    /**
     * The event bus to register new rules with. One will be created if not provided.
     */
    readonly eventBus?: IEventBus;
    /**
     * The EventMetadata to use to update the event defaults.
     */
    readonly eventMetadata?: EventMetadata;
    /**
     * The name of the event source for events coming from the SBT control plane.
     */
    readonly controlPlaneEventSource?: string;
    /**
     * The name of the event source for events coming from the SBT application plane.
     */
    readonly applicationPlaneEventSource?: string;
}
export interface IEventManager {
    /**
     * The event source used for events emitted by the application plane.
     */
    readonly applicationPlaneEventSource: string;
    /**
     * The event source used for events emitted by the control plane.
     */
    readonly controlPlaneEventSource: string;
    /**
     * The name of the bus that will be used to send and receive events.
     */
    readonly busName: string;
    /**
     * The ARN/ID of the bus that will be used to send and receive events.
     */
    readonly busArn: string;
    /**
     * List of recognized events that are available as triggers.
     */
    readonly supportedEvents: EventMetadata;
    /**
     * Adds an IRuleTarget to an event.
     *
     * @param eventType The detail type of the event to add a target to.
     * @param target The target that will be added to the event.
     */
    addTargetToEvent(scope: Construct, eventType: DetailType, target: IRuleTarget): void;
    /**
     * Provides grantee the permissions to place events
     * on the EventManager bus.
     *
     * @param grantee The grantee resource that will be granted the permission(s).
     */
    grantPutEventsTo(grantee: IGrantable): void;
}
/**
 * Provides an EventManager to interact with the EventBus shared with the SBT control plane.
 */
export declare class EventManager extends Construct implements IEventManager {
    /**
     * The event source used for events emitted by the application plane.
     * @default
     */
    readonly applicationPlaneEventSource: string;
    /**
     * The event source used for events emitted by the control plane.
     * @default
     */
    readonly controlPlaneEventSource: string;
    /**
     * List of recognized events that are available as triggers.
     */
    readonly supportedEvents: EventMetadata;
    /**
     * The eventBus resource that will be used to send and receive events.
     */
    readonly eventBus: IEventBus;
    /**
     * The name of the bus that will be used to send and receive events.
     */
    readonly busName: string;
    /**
     * The ARN/ID of the bus that will be used to send and receive events.
     */
    readonly busArn: string;
    constructor(scope: Construct, id: string, props?: EventManagerProps);
    /**
     * Provides grantee the permissions to place events
     * on the EventManager bus.
     *
     * @param grantee The grantee resource that will be granted the permission(s).
     */
    grantPutEventsTo(grantee: IGrantable): void;
    /**
     * Adds an IRuleTarget to an event.
     *
     * @param scope The scope in which to find (or create) the Rule.
     * @param eventType The detail type of the event to add a target to.
     * @param target The target that will be added to the event.
     */
    addTargetToEvent(scope: Construct, eventType: DetailType, target: IRuleTarget): void;
    /**
     * Returns a Rule for the given eventType in the context of a scope.
     * A new one is created if the rule is not found in the scope.
     *
     * @param scope The scope in which to find (or create) the Rule.
     * @param eventType The detail type of the event to add a target to.
     * @returns A Rule for the given eventType in the provided scope.
     */
    private getOrCreateRule;
}

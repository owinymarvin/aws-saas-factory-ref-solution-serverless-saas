import { Construct } from 'constructs';
import { BashJobRunner } from './bash-job-runner';
import { IEventManager } from '../utils';
/**
 * Encapsulates the list of properties for a CoreApplicationPlane.
 */
export interface CoreApplicationPlaneProps {
    readonly eventManager: IEventManager;
    /**
     * The list of JobRunners
     */
    readonly jobRunnersList?: BashJobRunner[];
}
/**
 * Provides a CoreApplicationPlane.
 * This construct will help create resources to accelerate building an SBT-compliant Application Plane.
 * It can be configured to attach itself to the EventBus created by the SBT Control Plane and listen to
 * and respond to events created by the control plane.
 */
export declare class CoreApplicationPlane extends Construct {
    /**
     * The EventManager instance that allows connecting to events flowing between
     * the Control Plane and other components.
     */
    readonly eventManager: IEventManager;
    constructor(scope: Construct, id: string, props: CoreApplicationPlaneProps);
}

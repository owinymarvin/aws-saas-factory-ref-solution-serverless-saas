import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { IRuleTarget } from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { DetailType, IEventManager } from '../utils';
/**
 * Encapsulates the list of properties for a BashJobRunner.
 */
export interface BashJobRunnerProps {
    /**
     * The key where the tenant identifier is to be extracted from in
     * the incoming event.
     * @default 'tenantId'
     */
    readonly tenantIdentifierKeyInIncomingEvent?: string;
    /**
     * The IAM permission document for the BashJobRunner.
     */
    readonly permissions: iam.PolicyDocument;
    /**
     * The bash script to run as part of the BashJobRunner.
     */
    readonly script: string;
    /**
     * The incoming event DetailType that triggers this job.
     */
    readonly incomingEvent: DetailType;
    /**
     * The outgoing event DetailType that is emitted upon job completion.
     */
    readonly outgoingEvent: DetailType;
    /**
     * The bash script to run after the main script has completed.
     */
    readonly postScript?: string;
    /**
     * The environment variables to import into the BashJobRunner from event details field.
     * This argument consists of the names of only string type variables. Ex. 'test'
     */
    readonly environmentStringVariablesFromIncomingEvent?: string[];
    /**
     * The environment variables to import into the BashJobRunner from event details field.
     * This argument consists of the names of only JSON-formatted string type variables.
     * Ex. '{"test": 2}'
     */
    readonly environmentJSONVariablesFromIncomingEvent?: string[];
    /**
     * The environment variables to export into the outgoing event once the BashJobRunner has finished.
     */
    readonly environmentVariablesToOutgoingEvent?: string[];
    /**
     * The variables to pass into the codebuild BashJobRunner.
     */
    readonly scriptEnvironmentVariables?: {
        [key: string]: string;
    };
    /**
     * The EventManager instance that allows connecting to events flowing between
     * the Control Plane and other components.
     */
    readonly eventManager: IEventManager;
}
/**
 * Provides a BashJobRunner to execute arbitrary bash code.
 */
export declare class BashJobRunner extends Construct {
    /**
     * The codebuildProject used to implement this BashJobRunner.
     * @attribute
     */
    readonly codebuildProject: codebuild.Project;
    /**
     * The StateMachine used to implement this BashJobRunner orchestration.
     * @attribute
     */
    readonly provisioningStateMachine: stepfunctions.StateMachine;
    /**
     * The eventTarget to use when triggering this BashJobRunner.
     * @attribute
     */
    readonly eventTarget: IRuleTarget;
    /**
     * The environment variables to export into the outgoing event once the BashJobRunner has finished.
     * @attribute
     */
    readonly environmentVariablesToOutgoingEvent?: string[];
    /**
     * The incoming event DetailType that triggers this job.
     */
    readonly incomingEvent: DetailType;
    constructor(scope: Construct, id: string, props: BashJobRunnerProps);
    private createCodeBuildProject;
    private createProvisioningStateMachine;
}

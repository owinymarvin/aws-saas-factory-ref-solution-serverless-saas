import { CorsPreflightOptions } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { IAuth } from './auth/auth-interface';
import { IBilling } from './billing';
import { IEventManager } from '../utils';
export interface ControlPlaneProps {
    /**
     * The authentication provider for the control plane.
     * If not provided, CognitoAuth will be used.
     */
    readonly auth?: IAuth;
    /**
     * The name of the system admin user.
     * @default 'admin'
     */
    readonly systemAdminName?: string;
    /**
     * The email address of the system admin.
     */
    readonly systemAdminEmail: string;
    /**
     * The name of the system admin role.
     * @default 'SystemAdmin'
     */
    readonly systemAdminRoleName?: string;
    /**
     * The billing provider configuration.
     */
    readonly billing?: IBilling;
    /**
     * The event manager instance. If not provided, a new instance will be created.
     */
    readonly eventManager?: IEventManager;
    /**
     * If true, the API Gateway will not log requests to the CloudWatch Logs.
     * @default false
     */
    readonly disableAPILogging?: boolean;
    /**
     * Settings for Cors Configuration for the ControlPlane API.
     */
    readonly apiCorsConfig?: CorsPreflightOptions;
}
export declare class ControlPlane extends Construct {
    /**
     * The URL of the control plane API Gateway.
     */
    readonly controlPlaneAPIGatewayUrl: string;
    /**
     * The EventManager instance that allows connecting to events flowing between
     * the Control Plane and other components.
     */
    readonly eventManager: IEventManager;
    constructor(scope: Construct, id: string, props: ControlPlaneProps);
}

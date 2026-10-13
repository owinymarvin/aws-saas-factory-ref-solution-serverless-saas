import * as apigatewayV2 from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
export declare const addTemplateTag: (construct: Construct, tag: string) => void;
export declare const generateAWSManagedRuleSet: (managedGroupName: string, priority: number) => {
    name: string;
    priority: number;
    overrideAction: {
        none: {};
    };
    statement: {
        managedRuleGroupStatement: {
            name: string;
            vendorName: string;
        };
    };
    visibilityConfig: {
        cloudWatchMetricsEnabled: boolean;
        metricName: string;
        sampledRequestsEnabled: boolean;
    };
};
export declare const conditionallyAddScope: (unknownScope?: string) => string[];
export interface IRoute {
    readonly method: apigatewayV2.HttpMethod;
    readonly scope?: string;
    readonly path: string;
    readonly integration: apigatewayV2.HttpRouteIntegration;
}
export declare const generateRoutes: (api: apigatewayV2.HttpApi, routes: IRoute[], authorizer?: apigatewayV2.IHttpRouteAuthorizer) => apigatewayV2.HttpRoute[];

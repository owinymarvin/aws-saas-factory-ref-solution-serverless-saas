import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
/**
 * Represents the properties required to initialize the TenantConfigLambdas.
 *
 * @interface TenantConfigLambdasProps
 * @property {Table} tenantDetails - The table that stores the tenant details.
 * @property {string} tenantConfigIndexName - The name of the global secondary index for the tenant configuration.
 * @property {string} tenantDetailsTenantNameColumn - The name of the column that stores the tenant name.
 * @property {string} tenantDetailsTenantConfigColumn - The name of the column that stores the tenant configuration.
 */
export interface TenantConfigLambdasProps {
    readonly tenantDetails: Table;
    readonly tenantConfigIndexName: string;
    readonly tenantDetailsTenantNameColumn: string;
    readonly tenantDetailsTenantConfigColumn: string;
}
/**
 * Represents a set of Lambda functions for managing tenant configurations.
 *
 * @class TenantConfigLambdas
 * @extends Construct
 */
export declare class TenantConfigLambdas extends Construct {
    /**
     * The Lambda function responsible for managing tenant configurations.
     *
     * @type {lambda.Function}
     */
    readonly tenantConfigFunction: lambda.Function;
    /**
     * Constructs a new instance of the TenantConfigLambdas.
     *
     * @param {Construct} scope - The parent construct.
     * @param {string} id - The ID of the construct.
     * @param {TenantConfigLambdasProps} props - The properties required to initialize the TenantConfigLambdas.
     */
    constructor(scope: Construct, id: string, props: TenantConfigLambdasProps);
}

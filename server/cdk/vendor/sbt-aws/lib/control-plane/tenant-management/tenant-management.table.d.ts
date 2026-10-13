import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
/**
 * Represents a table for managing tenant details in the application.
 *
 * @class TenantManagementTable
 * @extends Construct
 */
export declare class TenantManagementTable extends Construct {
    /**
     * The table that stores the tenant details.
     *
     * @type {Table}
     */
    readonly tenantDetails: Table;
    /**
     * The name of the global secondary index for the tenant configuration.
     *
     * @type {string}
     */
    readonly tenantConfigIndexName: string;
    /**
     * The name of the column that stores the tenant configuration.
     *
     * @type {string}
     * @note Only the attributes included in this list will be returned when querying the tenant config endpoint.
     */
    readonly tenantConfigColumn: string;
    /**
     * The name of the column that stores the tenant name.
     *
     * @type {string}
     */
    readonly tenantNameColumn: string;
    /**
     * The name of the column that stores the tenant ID.
     *
     * @type {string}
     */
    readonly tenantIdColumn: string;
    /**
     * Constructs a new instance of the TenantManagementTable.
     *
     * @param {Construct} scope - The parent construct.
     * @param {string} id - The ID of the construct.
     */
    constructor(scope: Construct, id: string);
}

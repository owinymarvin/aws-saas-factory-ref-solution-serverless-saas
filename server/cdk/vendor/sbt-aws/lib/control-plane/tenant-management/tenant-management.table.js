"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantManagementTable = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
 * Represents a table for managing tenant details in the application.
 *
 * @class TenantManagementTable
 * @extends Construct
 */
class TenantManagementTable extends constructs_1.Construct {
    /**
     * Constructs a new instance of the TenantManagementTable.
     *
     * @param {Construct} scope - The parent construct.
     * @param {string} id - The ID of the construct.
     */
    constructor(scope, id) {
        super(scope, id);
        /**
         * The name of the global secondary index for the tenant configuration.
         *
         * @type {string}
         */
        this.tenantConfigIndexName = 'tenantConfigIndex';
        /**
         * The name of the column that stores the tenant configuration.
         *
         * @type {string}
         * @note Only the attributes included in this list will be returned when querying the tenant config endpoint.
         */
        this.tenantConfigColumn = 'tenantConfig';
        /**
         * The name of the column that stores the tenant name.
         *
         * @type {string}
         */
        this.tenantNameColumn = 'tenantName';
        /**
         * The name of the column that stores the tenant ID.
         *
         * @type {string}
         */
        this.tenantIdColumn = 'tenantId';
        (0, utils_1.addTemplateTag)(this, 'Tables');
        this.tenantDetails = new aws_dynamodb_1.Table(this, 'TenantDetails', {
            partitionKey: { name: this.tenantIdColumn, type: aws_dynamodb_1.AttributeType.STRING },
            pointInTimeRecovery: true,
        });
        this.tenantDetails.addGlobalSecondaryIndex({
            indexName: this.tenantConfigIndexName,
            partitionKey: { name: this.tenantNameColumn, type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.INCLUDE,
            nonKeyAttributes: [this.tenantConfigColumn],
        });
    }
}
exports.TenantManagementTable = TenantManagementTable;
_a = JSII_RTTI_SYMBOL_1;
TenantManagementTable[_a] = { fqn: "@cdklabs/sbt-aws.TenantManagementTable", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LW1hbmFnZW1lbnQudGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY29udHJvbC1wbGFuZS90ZW5hbnQtbWFuYWdlbWVudC90ZW5hbnQtbWFuYWdlbWVudC50YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7QUFFdEMsMkRBQWdGO0FBQ2hGLDJDQUF1QztBQUN2Qyx1Q0FBNkM7QUFFN0M7Ozs7O0dBS0c7QUFDSCxNQUFhLHFCQUFzQixTQUFRLHNCQUFTO0lBcUNsRDs7Ozs7T0FLRztJQUNILFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFwQ25COzs7O1dBSUc7UUFDYSwwQkFBcUIsR0FBVyxtQkFBbUIsQ0FBQztRQUVwRTs7Ozs7V0FLRztRQUNhLHVCQUFrQixHQUFXLGNBQWMsQ0FBQztRQUU1RDs7OztXQUlHO1FBQ2EscUJBQWdCLEdBQVcsWUFBWSxDQUFDO1FBRXhEOzs7O1dBSUc7UUFDYSxtQkFBYyxHQUFXLFVBQVUsQ0FBQztRQVVsRCxJQUFBLHNCQUFjLEVBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxvQkFBSyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDcEQsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3ZFLG1CQUFtQixFQUFFLElBQUk7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztZQUN6QyxTQUFTLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtZQUNyQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUN6RSxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxPQUFPO1lBQ3RDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDO1NBQzVDLENBQUMsQ0FBQztJQUNMLENBQUM7O0FBekRILHNEQTBEQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcblxuaW1wb3J0IHsgQXR0cmlidXRlVHlwZSwgUHJvamVjdGlvblR5cGUsIFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgYWRkVGVtcGxhdGVUYWcgfSBmcm9tICcuLi8uLi91dGlscyc7XG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHRhYmxlIGZvciBtYW5hZ2luZyB0ZW5hbnQgZGV0YWlscyBpbiB0aGUgYXBwbGljYXRpb24uXG4gKlxuICogQGNsYXNzIFRlbmFudE1hbmFnZW1lbnRUYWJsZVxuICogQGV4dGVuZHMgQ29uc3RydWN0XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW5hbnRNYW5hZ2VtZW50VGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogVGhlIHRhYmxlIHRoYXQgc3RvcmVzIHRoZSB0ZW5hbnQgZGV0YWlscy5cbiAgICpcbiAgICogQHR5cGUge1RhYmxlfVxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHRlbmFudERldGFpbHM6IFRhYmxlO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgZ2xvYmFsIHNlY29uZGFyeSBpbmRleCBmb3IgdGhlIHRlbmFudCBjb25maWd1cmF0aW9uLlxuICAgKlxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHRlbmFudENvbmZpZ0luZGV4TmFtZTogc3RyaW5nID0gJ3RlbmFudENvbmZpZ0luZGV4JztcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIGNvbHVtbiB0aGF0IHN0b3JlcyB0aGUgdGVuYW50IGNvbmZpZ3VyYXRpb24uXG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBub3RlIE9ubHkgdGhlIGF0dHJpYnV0ZXMgaW5jbHVkZWQgaW4gdGhpcyBsaXN0IHdpbGwgYmUgcmV0dXJuZWQgd2hlbiBxdWVyeWluZyB0aGUgdGVuYW50IGNvbmZpZyBlbmRwb2ludC5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0ZW5hbnRDb25maWdDb2x1bW46IHN0cmluZyA9ICd0ZW5hbnRDb25maWcnO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgY29sdW1uIHRoYXQgc3RvcmVzIHRoZSB0ZW5hbnQgbmFtZS5cbiAgICpcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0ZW5hbnROYW1lQ29sdW1uOiBzdHJpbmcgPSAndGVuYW50TmFtZSc7XG5cbiAgLyoqXG4gICAqIFRoZSBuYW1lIG9mIHRoZSBjb2x1bW4gdGhhdCBzdG9yZXMgdGhlIHRlbmFudCBJRC5cbiAgICpcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSB0ZW5hbnRJZENvbHVtbjogc3RyaW5nID0gJ3RlbmFudElkJztcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgVGVuYW50TWFuYWdlbWVudFRhYmxlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbnN0cnVjdH0gc2NvcGUgLSBUaGUgcGFyZW50IGNvbnN0cnVjdC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gVGhlIElEIG9mIHRoZSBjb25zdHJ1Y3QuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICBhZGRUZW1wbGF0ZVRhZyh0aGlzLCAnVGFibGVzJyk7XG4gICAgdGhpcy50ZW5hbnREZXRhaWxzID0gbmV3IFRhYmxlKHRoaXMsICdUZW5hbnREZXRhaWxzJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IHRoaXMudGVuYW50SWRDb2x1bW4sIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgIH0pO1xuXG4gICAgdGhpcy50ZW5hbnREZXRhaWxzLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogdGhpcy50ZW5hbnRDb25maWdJbmRleE5hbWUsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogdGhpcy50ZW5hbnROYW1lQ29sdW1uLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLklOQ0xVREUsXG4gICAgICBub25LZXlBdHRyaWJ1dGVzOiBbdGhpcy50ZW5hbnRDb25maWdDb2x1bW5dLFxuICAgIH0pO1xuICB9XG59XG4iXX0=
"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenVendingMachine = void 0;
const client_sts_1 = require("@aws-sdk/client-sts");
const jwt = require("jsonwebtoken");
const jwks_rsa_1 = require("jwks-rsa");
/**
 * The Token Vending Machine library offers a solution for dynamically assuming an
 * ABAC role and obtaining tenant-scoped credentials. It conceals the intricacies
 * of managing and generating these scoped credentials. By utilizing these scoped credentials,
 * tenant isolation is enforced when accessing tenant-specific resources.
 */
class TokenVendingMachine {
    constructor(shouldValidateToken = false) {
        this.shouldValidateToken = shouldValidateToken;
        this.sts = new client_sts_1.STSClient();
    }
    async validateJwt(jwtToken, idpDetails) {
        const idpDetailsJson = JSON.parse(idpDetails);
        const issuer = idpDetailsJson.issuer;
        const audience = idpDetailsJson.audience;
        const client = new jwks_rsa_1.JwksClient({
            jwksUri: `${issuer}.well-known/jwks.json`,
        });
        const decodedToken = jwt.decode(jwtToken, { complete: true });
        if (!decodedToken) {
            console.error("Decoding token has failed");
            return false;
        }
        const kid = decodedToken.header.kid;
        const key = await client.getSigningKey(kid);
        const signingKey = key.getPublicKey();
        try {
            jwt.verify(jwtToken, signingKey, {
                algorithms: ["RS256"],
                issuer: issuer,
                audience: audience,
            });
            return true;
        }
        catch (error) {
            console.error("JWT validation error:", error);
            return false;
        }
    }
    async getTemporaryCredentails(roleArn, requestTagKeysMappingAttributes, decodedToken, ttl) {
        try {
            const requestTagKeyValueArray = this.createRequestTagKeyValueArray(requestTagKeysMappingAttributes, decodedToken);
            const command = new client_sts_1.AssumeRoleCommand({
                RoleArn: roleArn,
                RoleSessionName: "AssumeRoleSession",
                DurationSeconds: ttl,
                Tags: requestTagKeyValueArray,
            });
            const response = await this.sts.send(command);
            if (!response.Credentials) {
                throw new Error("Temporary credentials not found");
            }
            const creds = JSON.stringify(response.Credentials);
            return creds;
        }
        catch (error) {
            console.error(`Error getting temporary credentials for role ${roleArn}:`, error);
            throw error;
        }
    }
    createRequestTagKeyValueArray(requestTagKeysMappingAttributes, decodedToken) {
        const requestTagKeyValueArray = [];
        for (const key in requestTagKeysMappingAttributes) {
            const value = requestTagKeysMappingAttributes[key];
            requestTagKeyValueArray.push({ Key: key, Value: decodedToken[value] });
        }
        return requestTagKeyValueArray;
    }
    /**
     * This method is used to dynamically assume an ABAC role
     * which is provided through environment variables
     * and obtain temporary tenant-scoped credentials.It takes in a json web token and a time to live (ttl) in seconds as input.
     * If isValidateToken is set to true, the method will validate the input json web token against identity provider details provided through environment variables.
     * It returns a json string containing the temporary tenant-scoped credentials.
     * {
     *   "AccessKeyId": "...",
     *   "SecretAccessKey": "...",
     *   "SessionToken": "...",
     *   "Expiration": "..."
     * }
     *
     * @param jwtToken - Input json web token with custom attributes
     * @param ttl - Time to live in seconds for the scoped credentials
     * @returns - {
     *              "AccessKeyId": "...",
     *              "SecretAccessKey": "...",
     *              "SessionToken": "...",
     *              "Expiration": "..."
     *            }
     */
    async assumeRole(jwtToken, ttl) {
        try {
            if (this.shouldValidateToken === true) {
                const idpDetails = process.env.IDP_DETAILS;
                if (!idpDetails) {
                    throw new Error("IDP_DETAILS environment variable is not set");
                }
                const isValid = await this.validateJwt(jwtToken, idpDetails);
                if (isValid !== true) {
                    throw new Error("Invalid JWT token");
                }
            }
            const roleArn = process.env.IAM_ROLE_ARN;
            if (!roleArn) {
                throw new Error("IAM_ROLE_ARN environment variable is not set");
            }
            if (!process.env.REQUEST_TAG_KEYS_MAPPING_ATTRIBUTES) {
                throw new Error("REQUEST_TAG_KEYS environment variable is not set");
            }
            const requestTagKeysMappingAttributes = JSON.parse(process.env.REQUEST_TAG_KEYS_MAPPING_ATTRIBUTES);
            const decodedToken = jwt.decode(jwtToken);
            if (!decodedToken) {
                console.error("Decoding token has failed");
                throw new Error("Decoding token has failed");
            }
            return await this.getTemporaryCredentails(roleArn, requestTagKeysMappingAttributes, decodedToken, ttl);
        }
        catch (error) {
            console.error(`Error occured:`, error);
            throw error;
        }
    }
}
exports.TokenVendingMachine = TokenVendingMachine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW4tdmVuZGluZy1tYWNoaW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3BvaW50LXNvbHV0aW9ucy9saWJyYXJpZXMvc3JjL3Rva2VuLXZlbmRpbmctbWFjaGluZS9zcmMvdG9rZW4tdmVuZGluZy1tYWNoaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxRUFBcUU7QUFDckUsc0NBQXNDOzs7QUFFdEMsb0RBQW1FO0FBQ25FLG9DQUFvQztBQUNwQyx1Q0FBc0M7QUFDdEM7Ozs7O0dBS0c7QUFDSCxNQUFhLG1CQUFtQjtJQUc5QixZQUFvQixzQkFBK0IsS0FBSztRQUFwQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQWlCO1FBQ3RELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxzQkFBUyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFXLENBQ3ZCLFFBQWdCLEVBQ2hCLFVBQWtCO1FBRWxCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUMsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQztRQUNyQyxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO1FBRXpDLE1BQU0sTUFBTSxHQUFHLElBQUkscUJBQVUsQ0FBQztZQUM1QixPQUFPLEVBQUUsR0FBRyxNQUFNLHVCQUF1QjtTQUMxQyxDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDM0MsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsWUFBWSxD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LEVBQUUsQ0FBQztvQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUN2QyxDQUFDO1lBQ0gsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7WUFDbEUsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLENBQUM7Z0JBQ3JELE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQztZQUN0RSxDQUFDO1lBRUQsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUNoRCxDQUFDO1lBRUYsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztnQkFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1lBQy9DLENBQUM7WUFFRCxPQUFPLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUN2QyxPQUFPLEVBQ1AsK0JBQStCLEVBQy9CLFlBQVksRUFDWixHQUFHLENBQ0osQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkMsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBMUpELGtEQTBKQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IEFwYWNoZS0yLjBcblxuaW1wb3J0IHsgU1RTQ2xpZW50LCBBc3N1bWVSb2xlQ29tbWFuZCB9IGZyb20gXCJAYXdzLXNkay9jbGllbnQtc3RzXCI7XG5pbXBvcnQgKiBhcyBqd3QgZnJvbSBcImpzb253ZWJ0b2tlblwiO1xuaW1wb3J0IHsgSndrc0NsaWVudCB9IGZyb20gXCJqd2tzLXJzYVwiO1xuLyoqXG4gKiBUaGUgVG9rZW4gVmVuZGluZyBNYWNoaW5lIGxpYnJhcnkgb2ZmZXJzIGEgc29sdXRpb24gZm9yIGR5bmFtaWNhbGx5IGFzc3VtaW5nIGFuXG4gKiBBQkFDIHJvbGUgYW5kIG9idGFpbmluZyB0ZW5hbnQtc2NvcGVkIGNyZWRlbnRpYWxzLiBJdCBjb25jZWFscyB0aGUgaW50cmljYWNpZXNcbiAqIG9mIG1hbmFnaW5nIGFuZCBnZW5lcmF0aW5nIHRoZXNlIHNjb3BlZCBjcmVkZW50aWFscy4gQnkgdXRpbGl6aW5nIHRoZXNlIHNjb3BlZCBjcmVkZW50aWFscyxcbiAqIHRlbmFudCBpc29sYXRpb24gaXMgZW5mb3JjZWQgd2hlbiBhY2Nlc3NpbmcgdGVuYW50LXNwZWNpZmljIHJlc291cmNlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFRva2VuVmVuZGluZ01hY2hpbmUge1xuICBwcml2YXRlIHN0czogU1RTQ2xpZW50O1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2hvdWxkVmFsaWRhdGVUb2tlbjogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgdGhpcy5zdHMgPSBuZXcgU1RTQ2xpZW50KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlSnd0KFxuICAgIGp3dFRva2VuOiBzdHJpbmcsXG4gICAgaWRwRGV0YWlsczogc3RyaW5nLFxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBpZHBEZXRhaWxzSnNvbiA9IEpTT04ucGFyc2UoaWRwRGV0YWlscyk7XG4gICAgY29uc3QgaXNzdWVyID0gaWRwRGV0YWlsc0pzb24uaXNzdWVyO1xuICAgIGNvbnN0IGF1ZGllbmNlID0gaWRwRGV0YWlsc0pzb24uYXVkaWVuY2U7XG5cbiAgICBjb25zdCBjbGllbnQgPSBuZXcgSndrc0NsaWVudCh7XG4gICAgICBqd2tzVXJpOiBgJHtpc3N1ZXJ9LndlbGwta25vd24vandrcy5qc29uYCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlY29kZWRUb2tlbiA9IGp3dC5kZWNvZGUoand0VG9rZW4sIHsgY29tcGxldGU6IHRydWUgfSk7XG4gICAgaWYgKCFkZWNvZGVkVG9rZW4pIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJEZWNvZGluZyB0b2tlbiBoYXMgZmFpbGVkXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGtpZCA9IGRlY29kZWRUb2tlbi5oZWFkZXIua2lkO1xuICAgIGNvbnN0IGtleSA9IGF3YWl0IGNsaWVudC5nZXRTaWduaW5nS2V5KGtpZCk7XG4gICAgY29uc3Qgc2lnbmluZ0tleSA9IGtleS5nZXRQdWJsaWNLZXkoKTtcblxuICAgIHRyeSB7XG4gICAgICBqd3QudmVyaWZ5KGp3dFRva2VuLCBzaWduaW5nS2V5LCB7XG4gICAgICAgIGFsZ29yaXRobXM6IFtcIlJTMjU2XCJdLFxuICAgICAgICBpc3N1ZXI6IGlzc3VlcixcbiAgICAgICAgYXVkaWVuY2U6IGF1ZGllbmNlLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiSldUIHZhbGlkYXRpb24gZXJyb3I6XCIsIGVycm9yKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldFRlbXBvcmFyeUNyZWRlbnRhaWxzKFxuICAgIHJvbGVBcm46IHN0cmluZyxcbiAgICByZXF1ZXN0VGFnS2V5c01hcHBpbmdBdHRyaWJ1dGVzOiBhbnksXG4gICAgZGVjb2RlZFRva2VuOiBhbnksXG4gICAgdHRsOiBudW1iZXIsXG4gICk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlcXVlc3RUYWdLZXlWYWx1ZUFycmF5ID0gdGhpcy5jcmVhdGVSZXF1ZXN0VGFnS2V5VmFsdWVBcnJheShcbiAgICAgICAgcmVxdWVzdFRhZ0tleXNNYXBwaW5nQXR0cmlidXRlcyxcbiAgICAgICAgZGVjb2RlZFRva2VuLFxuICAgICAgKTtcblxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBBc3N1bWVSb2xlQ29tbWFuZCh7XG4gICAgICAgIFJvbGVBcm46IHJvbGVBcm4sXG4gICAgICAgIFJvbGVTZXNzaW9uTmFtZTogXCJBc3N1bWVSb2xlU2Vzc2lvblwiLFxuICAgICAgICBEdXJhdGlvblNlY29uZHM6IHR0bCxcbiAgICAgICAgVGFnczogcmVxdWVzdFRhZ0tleVZhbHVlQXJyYXksXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnN0cy5zZW5kKGNvbW1hbmQpO1xuICAgICAgaWYgKCFyZXNwb25zZS5DcmVkZW50aWFscykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZW1wb3JhcnkgY3JlZGVudGlhbHMgbm90IGZvdW5kXCIpO1xuICAgICAgfVxuICAgICAgY29uc3QgY3JlZHM6IHN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLkNyZWRlbnRpYWxzKTtcblxuICAgICAgcmV0dXJuIGNyZWRzO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIGBFcnJvciBnZXR0aW5nIHRlbXBvcmFyeSBjcmVkZW50aWFscyBmb3Igcm9sZSAke3JvbGVBcm59OmAsXG4gICAgICAgIGVycm9yLFxuICAgICAgKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlUmVxdWVzdFRhZ0tleVZhbHVlQXJyYXkoXG4gICAgcmVxdWVzdFRhZ0tleXNNYXBwaW5nQXR0cmlidXRlczogYW55LFxuICAgIGRlY29kZWRUb2tlbjogYW55LFxuICApOiBhbnkge1xuICAgIGNvbnN0IHJlcXVlc3RUYWdLZXlWYWx1ZUFycmF5OiB7IEtleTogc3RyaW5nOyBWYWx1ZTogc3RyaW5nIH1bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBrZXkgaW4gcmVxdWVzdFRhZ0tleXNNYXBwaW5nQXR0cmlidXRlcykge1xuICAgICAgY29uc3QgdmFsdWUgPSByZXF1ZXN0VGFnS2V5c01hcHBpbmdBdHRyaWJ1dGVzW2tleV07XG4gICAgICByZXF1ZXN0VGFnS2V5VmFsdWVBcnJheS5wdXNoKHsgS2V5OiBrZXksIFZhbHVlOiBkZWNvZGVkVG9rZW5bdmFsdWVdIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVxdWVzdFRhZ0tleVZhbHVlQXJyYXk7XG4gIH1cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gZHluYW1pY2FsbHkgYXNzdW1lIGFuIEFCQUMgcm9sZVxuICAgKiB3aGljaCBpcyBwcm92aWRlZCB0aHJvdWdoIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgKiBhbmQgb2J0YWluIHRlbXBvcmFyeSB0ZW5hbnQtc2NvcGVkIGNyZWRlbnRpYWxzLkl0IHRha2VzIGluIGEganNvbiB3ZWIgdG9rZW4gYW5kIGEgdGltZSB0byBsaXZlICh0dGwpIGluIHNlY29uZHMgYXMgaW5wdXQuXG4gICAqIElmIGlzVmFsaWRhdGVUb2tlbiBpcyBzZXQgdG8gdHJ1ZSwgdGhlIG1ldGhvZCB3aWxsIHZhbGlkYXRlIHRoZSBpbnB1dCBqc29uIHdlYiB0b2tlbiBhZ2FpbnN0IGlkZW50aXR5IHByb3ZpZGVyIGRldGFpbHMgcHJvdmlkZWQgdGhyb3VnaCBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gICAqIEl0IHJldHVybnMgYSBqc29uIHN0cmluZyBjb250YWluaW5nIHRoZSB0ZW1wb3JhcnkgdGVuYW50LXNjb3BlZCBjcmVkZW50aWFscy5cbiAgICoge1xuICAgKiAgIFwiQWNjZXNzS2V5SWRcIjogXCIuLi5cIixcbiAgICogICBcIlNlY3JldEFjY2Vzc0tleVwiOiBcIi4uLlwiLFxuICAgKiAgIFwiU2Vzc2lvblRva2VuXCI6IFwiLi4uXCIsXG4gICAqICAgXCJFeHBpcmF0aW9uXCI6IFwiLi4uXCJcbiAgICogfVxuICAgKlxuICAgKiBAcGFyYW0gand0VG9rZW4gLSBJbnB1dCBqc29uIHdlYiB0b2tlbiB3aXRoIGN1c3RvbSBhdHRyaWJ1dGVzXG4gICAqIEBwYXJhbSB0dGwgLSBUaW1lIHRvIGxpdmUgaW4gc2Vjb25kcyBmb3IgdGhlIHNjb3BlZCBjcmVkZW50aWFsc1xuICAgKiBAcmV0dXJucyAtIHtcbiAgICogICAgICAgICAgICAgIFwiQWNjZXNzS2V5SWRcIjogXCIuLi5cIixcbiAgICogICAgICAgICAgICAgIFwiU2VjcmV0QWNjZXNzS2V5XCI6IFwiLi4uXCIsXG4gICAqICAgICAgICAgICAgICBcIlNlc3Npb25Ub2tlblwiOiBcIi4uLlwiLFxuICAgKiAgICAgICAgICAgICAgXCJFeHBpcmF0aW9uXCI6IFwiLi4uXCJcbiAgICogICAgICAgICAgICB9XG4gICAqL1xuICBwdWJsaWMgYXN5bmMgYXNzdW1lUm9sZShqd3RUb2tlbjogc3RyaW5nLCB0dGw6IG51bWJlcik6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICh0aGlzLnNob3VsZFZhbGlkYXRlVG9rZW4gPT09IHRydWUpIHtcbiAgICAgICAgY29uc3QgaWRwRGV0YWlscyA9IHByb2Nlc3MuZW52LklEUF9ERVRBSUxTO1xuICAgICAgICBpZiAoIWlkcERldGFpbHMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJRFBfREVUQUlMUyBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0XCIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlzVmFsaWQ6IGJvb2xlYW4gPSBhd2FpdCB0aGlzLnZhbGlkYXRlSnd0KGp3dFRva2VuLCBpZHBEZXRhaWxzKTtcbiAgICAgICAgaWYgKGlzVmFsaWQgIT09IHRydWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEpXVCB0b2tlblwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCByb2xlQXJuID0gcHJvY2Vzcy5lbnYuSUFNX1JPTEVfQVJOO1xuICAgICAgaWYgKCFyb2xlQXJuKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIklBTV9ST0xFX0FSTiBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0XCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXByb2Nlc3MuZW52LlJFUVVFU1RfVEFHX0tFWVNfTUFQUElOR19BVFRSSUJVVEVTKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJFUVVFU1RfVEFHX0tFWVMgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgbm90IHNldFwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVxdWVzdFRhZ0tleXNNYXBwaW5nQXR0cmlidXRlcyA9IEpTT04ucGFyc2UoXG4gICAgICAgIHByb2Nlc3MuZW52LlJFUVVFU1RfVEFHX0tFWVNfTUFQUElOR19BVFRSSUJVVEVTLFxuICAgICAgKTtcblxuICAgICAgY29uc3QgZGVjb2RlZFRva2VuID0gand0LmRlY29kZShqd3RUb2tlbik7XG4gICAgICBpZiAoIWRlY29kZWRUb2tlbikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRGVjb2RpbmcgdG9rZW4gaGFzIGZhaWxlZFwiKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGVjb2RpbmcgdG9rZW4gaGFzIGZhaWxlZFwiKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0VGVtcG9yYXJ5Q3JlZGVudGFpbHMoXG4gICAgICAgIHJvbGVBcm4sXG4gICAgICAgIHJlcXVlc3RUYWdLZXlzTWFwcGluZ0F0dHJpYnV0ZXMsXG4gICAgICAgIGRlY29kZWRUb2tlbixcbiAgICAgICAgdHRsLFxuICAgICAgKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBvY2N1cmVkOmAsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufVxuIl19
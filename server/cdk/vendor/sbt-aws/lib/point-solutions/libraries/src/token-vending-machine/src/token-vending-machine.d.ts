/**
 * The Token Vending Machine library offers a solution for dynamically assuming an
 * ABAC role and obtaining tenant-scoped credentials. It conceals the intricacies
 * of managing and generating these scoped credentials. By utilizing these scoped credentials,
 * tenant isolation is enforced when accessing tenant-specific resources.
 */
export declare class TokenVendingMachine {
    private shouldValidateToken;
    private sts;
    constructor(shouldValidateToken?: boolean);
    private validateJwt;
    private getTemporaryCredentails;
    private createRequestTagKeyValueArray;
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
    assumeRole(jwtToken: string, ttl: number): Promise<string>;
}

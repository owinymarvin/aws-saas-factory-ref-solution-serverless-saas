import { RestApiBase } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
/**
 * Properties for the SampleRegistrationWebPage construct.
 */
export interface SampleRegistrationWebPageProps {
    /**
     * The API Gateway that serves the following endpoints:
     *
     * POST /redirectmarketplacetoken: redirects to a registration page.
     *
     * POST /subscriber: creates a new subscriber.
     */
    readonly registrationAPI: RestApiBase;
    /**
     * The list of required user-provided fields for registration.
     * This contains the set of fields that must be provided by the user
     * when registering a new customer.
     *
     * This is used to dynamically update the registration page to create a
     * form that accepts each of the fields present in this list.
     *
     * ex. ['name', 'phone']
     */
    readonly userProvidedRequiredFieldsForRegistration: string[];
    /**
     * Whether to automatically delete objects from the S3 bucket when the stack is deleted.
     * @default - false
     */
    readonly autoDeleteBucketObjects?: boolean;
    /**
     * The URL of the image logo to display on the registration page.
     * @default - Amazon logo
     */
    readonly imageLogoUrl?: string;
}
/**
 * Constructs a sample registration web page hosted on Amazon S3 and fronted by Amazon CloudFront.
 * The web page includes a form for users to register for the SaaS product.
 */
export declare class SampleRegistrationWebPage extends Construct {
    constructor(scope: Construct, id: string, props: SampleRegistrationWebPageProps);
}

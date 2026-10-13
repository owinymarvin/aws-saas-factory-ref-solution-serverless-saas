"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleRegistrationWebPage = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const path = require("path");
const cdk = require("aws-cdk-lib");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const s3 = require("aws-cdk-lib/aws-s3");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
const cdk_nag_1 = require("cdk-nag");
const constructs_1 = require("constructs");
const utils_1 = require("../../utils");
/**
 * Constructs a sample registration web page hosted on Amazon S3 and fronted by Amazon CloudFront.
 * The web page includes a form for users to register for the SaaS product.
 */
class SampleRegistrationWebPage extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        (0, utils_1.addTemplateTag)(this, 'SampleRegistrationWebPage');
        const region = cdk.Stack.of(this).region;
        if (cdk.Token.isUnresolved(region)) {
            // region info helps to decide whether to create CloudFront WAF
            // or NagSuppression for the result cdk-nag finding.
            throw new Error('Region not specified. Use "env" to specify region.');
        }
        const websiteBucket = new s3.Bucket(this, 'WebsiteS3Bucket', {
            enforceSSL: true,
            autoDeleteObjects: props.autoDeleteBucketObjects,
            ...(props.autoDeleteBucketObjects && { removalPolicy: cdk.RemovalPolicy.DESTROY }),
        });
        const staticFiles = new aws_s3_deployment_1.BucketDeployment(this, 'StaticFiles', {
            sources: [aws_s3_deployment_1.Source.asset(path.join(__dirname, '../../../resources/aws-marketplace/static'))],
            destinationBucket: websiteBucket,
        });
        const defaultImageLogoUrl = 'https://m.media-amazon.com/images/G/01/AdProductsWebsite/images/AUX/02_amazon_logo_RGB_SQUID._TTW_.png';
        const dynamicFile = new aws_s3_deployment_1.DeployTimeSubstitutedFile(this, 'DynamicFileScript', {
            source: path.join(__dirname, '../../../resources/aws-marketplace/dynamic/script.js'),
            destinationBucket: websiteBucket,
            destinationKey: 'script.js',
            substitutions: {
                requiredFields: props.userProvidedRequiredFieldsForRegistration.join(','),
                imageLogoUrl: props.imageLogoUrl ?? defaultImageLogoUrl,
            },
        });
        dynamicFile.node.addDependency(staticFiles);
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(cdk.Stack.of(this), [
            `${cdk.Stack.of(this).stackName}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C`,
        ], [
            {
                id: 'AwsSolutions-IAM4',
                reason: 'Suppress usage of AWSLambdaBasicExecutionRole.',
                appliesTo: [
                    'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                ],
            },
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Allow wildcard access for CDKBucketDeployment.',
                appliesTo: [
                    'Action::s3:GetObject*',
                    'Action::s3:GetBucket*',
                    'Action::s3:List*',
                    `Resource::arn:<AWS::Partition>:s3:::cdk-${cdk.DefaultStackSynthesizer.DEFAULT_QUALIFIER}-assets-<AWS::AccountId>-${region}/*`,
                    'Action::s3:DeleteObject*',
                    'Action::s3:Abort*',
                    `Resource::<${cdk.Stack.of(this).getLogicalId(websiteBucket.node.defaultChild)}.Arn>/*`,
                ],
            },
            {
                id: 'AwsSolutions-L1',
                reason: 'NODEJS 18 is the version used cdk maanged custom resource.',
            },
        ], true);
        const logBucket = new s3.Bucket(this, 'WebsiteS3BucketLog', {
            enforceSSL: true,
            autoDeleteObjects: props.autoDeleteBucketObjects,
            ...(props.autoDeleteBucketObjects && { removalPolicy: cdk.RemovalPolicy.DESTROY }),
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
            intelligentTieringConfigurations: [
                {
                    name: 'ArchiveAccessTier',
                    archiveAccessTierTime: cdk.Duration.days(90),
                },
            ],
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions([websiteBucket, logBucket], [
            {
                id: 'AwsSolutions-S1',
                reason: 'Server access logs not required.',
            },
        ], true // applyToChildren = true, so that it applies to policies created for the role.
        );
        let cfnWAF;
        if (cdk.Token.isUnresolved(region) == false && region == 'us-east-1') {
            cfnWAF = new cdk.aws_wafv2.CfnWebACL(this, 'WAF', {
                defaultAction: { allow: {} },
                scope: 'CLOUDFRONT',
                visibilityConfig: {
                    cloudWatchMetricsEnabled: true,
                    sampledRequestsEnabled: true,
                    metricName: 'WAF-WebsiteS3CloudfrontDistribution',
                },
                rules: [
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesBotControlRuleSet', 0), // enable to block curl requests
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesKnownBadInputsRuleSet', 1),
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesCommonRuleSet', 2),
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesAnonymousIpList', 3),
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesAmazonIpReputationList', 4),
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesAdminProtectionRuleSet', 5),
                    (0, utils_1.generateAWSManagedRuleSet)('AWSManagedRulesSQLiRuleSet', 6),
                ],
            });
        }
        else {
            console.log('Only able to create CloudFront WAF in us-east-1 region.');
        }
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'CloudFrontOriginAccessIdentity', {
            comment: 'Serverless website OA',
        });
        const distribution = new cloudfront.Distribution(this, 'WebsiteS3CloudfrontDistribution', {
            defaultRootObject: 'index.html',
            enableLogging: true,
            logBucket: logBucket,
            geoRestriction: cloudfront.GeoRestriction.allowlist('US', 'CA'),
            logFilePrefix: 'access-logs/',
            httpVersion: cloudfront.HttpVersion.HTTP2,
            ...(cfnWAF != undefined ? { webAclId: cfnWAF.attrArn } : {}),
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket, {
                    originAccessIdentity,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                compress: true,
            },
            additionalBehaviors: {
                '/redirectmarketplacetoken': {
                    compress: true,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin: new origins.RestApiOrigin(props.registrationAPI),
                },
                '/subscriber': {
                    compress: true,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    origin: new origins.RestApiOrigin(props.registrationAPI),
                },
            },
        });
        if (cdk.Token.isUnresolved(region) == false && region != 'us-east-1') {
            cdk_nag_1.NagSuppressions.addResourceSuppressions(distribution, [
                {
                    id: 'AwsSolutions-CFR2',
                    reason: 'Can only create WAFv2 for CloudFront distribution in us-east-1 region.',
                },
            ]);
        }
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distribution, [
            {
                id: 'AwsSolutions-CFR4',
                reason: 'Uses default certificate.',
            },
        ]);
        new cdk.CfnOutput(this, 'CloudfrontMarketplaceFulfillmentURL', {
            value: `https://${distribution.distributionDomainName}/redirectmarketplacetoken`,
            description: 'CDN-fronted URL to access your landing page',
        });
    }
}
exports.SampleRegistrationWebPage = SampleRegistrationWebPage;
_a = JSII_RTTI_SYMBOL_1;
SampleRegistrationWebPage[_a] = { fqn: "@cdklabs/sbt-aws.SampleRegistrationWebPage", version: "0.3.9" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FtcGxlLXJlZ2lzdHJhdGlvbi13ZWItcGFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb250cm9sLXBsYW5lL2F3cy1tYXJrZXRwbGFjZS9zYW1wbGUtcmVnaXN0cmF0aW9uLXdlYi1wYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEscUVBQXFFO0FBQ3JFLHNDQUFzQztBQUV0Qyw2QkFBNkI7QUFDN0IsbUNBQW1DO0FBRW5DLHlEQUF5RDtBQUN6RCw4REFBOEQ7QUFDOUQseUNBQXlDO0FBQ3pDLHFFQUFvRztBQUNwRyxxQ0FBMEM7QUFDMUMsMkNBQXVDO0FBQ3ZDLHVDQUF3RTtBQXdDeEU7OztHQUdHO0FBQ0gsTUFBYSx5QkFBMEIsU0FBUSxzQkFBUztJQUN0RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXFDO1FBQzdFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBQSxzQkFBYyxFQUFDLElBQUksRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBRWxELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN6QyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbkMsK0RBQStEO1lBQy9ELG9EQUFvRDtZQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDM0QsVUFBVSxFQUFFLElBQUk7WUFDaEIsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLHVCQUF1QjtZQUNoRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixJQUFJLEVBQUUsYUFBYSxFQUFFLEdBQUcsQ0FB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QUMsb0JBQW9CLENBQUMsaUJBQWlCO29CQUN2RSxNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7aUJBQ3pEO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxNQUFNLElBQUksV0FBVyxFQUFFLENBQUM7WUFDckUseUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3BEO29CQUNFLEVBQUUsRUFBRSxtQkFBbUI7b0JBQ3ZCLE1BQU0sRUFBRSx3RUFBd0U7aUJBQ2pGO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELHlCQUFlLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFO1lBQ3BEO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFBRSwyQkFBMkI7YUFDcEM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFDQUFxQyxFQUFFO1lBQzdELEtBQUssRUFBRSxXQUFXLFlBQVksQ0FBQyxzQkFBc0IsMkJBQTJCO1lBQ2hGLFdBQVcsRUFBRSw2Q0FBNkM7U0FDM0QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUFwTEgsOERBcUxDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEFtYXpvbi5jb20sIEluYy4gb3IgaXRzIGFmZmlsaWF0ZXMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4vLyBTUERYLUxpY2Vuc2UtSWRlbnRpZmllcjogQXBhY2hlLTIuMFxuXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFJlc3RBcGlCYXNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IEJ1Y2tldERlcGxveW1lbnQsIERlcGxveVRpbWVTdWJzdGl0dXRlZEZpbGUsIFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gJ2Nkay1uYWcnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBhZGRUZW1wbGF0ZVRhZywgZ2VuZXJhdGVBV1NNYW5hZ2VkUnVsZVNldCB9IGZyb20gJy4uLy4uL3V0aWxzJztcblxuLyoqXG4gKiBQcm9wZXJ0aWVzIGZvciB0aGUgU2FtcGxlUmVnaXN0cmF0aW9uV2ViUGFnZSBjb25zdHJ1Y3QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2FtcGxlUmVnaXN0cmF0aW9uV2ViUGFnZVByb3BzIHtcbiAgLyoqXG4gICAqIFRoZSBBUEkgR2F0ZXdheSB0aGF0IHNlcnZlcyB0aGUgZm9sbG93aW5nIGVuZHBvaW50czpcbiAgICpcbiAgICogUE9TVCAvcmVkaXJlY3RtYXJrZXRwbGFjZXRva2VuOiByZWRpcmVjdHMgdG8gYSByZWdpc3RyYXRpb24gcGFnZS5cbiAgICpcbiAgICogUE9TVCAvc3Vic2NyaWJlcjogY3JlYXRlcyBhIG5ldyBzdWJzY3JpYmVyLlxuICAgKi9cbiAgcmVhZG9ubHkgcmVnaXN0cmF0aW9uQVBJOiBSZXN0QXBpQmFzZTtcblxuICAvKipcbiAgICogVGhlIGxpc3Qgb2YgcmVxdWlyZWQgdXNlci1wcm92aWRlZCBmaWVsZHMgZm9yIHJlZ2lzdHJhdGlvbi5cbiAgICogVGhpcyBjb250YWlucyB0aGUgc2V0IG9mIGZpZWxkcyB0aGF0IG11c3QgYmUgcHJvdmlkZWQgYnkgdGhlIHVzZXJcbiAgICogd2hlbiByZWdpc3RlcmluZyBhIG5ldyBjdXN0b21lci5cbiAgICpcbiAgICogVGhpcyBpcyB1c2VkIHRvIGR5bmFtaWNhbGx5IHVwZGF0ZSB0aGUgcmVnaXN0cmF0aW9uIHBhZ2UgdG8gY3JlYXRlIGFcbiAgICogZm9ybSB0aGF0IGFjY2VwdHMgZWFjaCBvZiB0aGUgZmllbGRzIHByZXNlbnQgaW4gdGhpcyBsaXN0LlxuICAgKlxuICAgKiBleC4gWyduYW1lJywgJ3Bob25lJ11cbiAgICovXG4gIHJlYWRvbmx5IHVzZXJQcm92aWRlZFJlcXVpcmVkRmllbGRzRm9yUmVnaXN0cmF0aW9uOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogV2hldGhlciB0byBhdXRvbWF0aWNhbGx5IGRlbGV0ZSBvYmplY3RzIGZyb20gdGhlIFMzIGJ1Y2tldCB3aGVuIHRoZSBzdGFjayBpcyBkZWxldGVkLlxuICAgKiBAZGVmYXVsdCAtIGZhbHNlXG4gICAqL1xuICByZWFkb25seSBhdXRvRGVsZXRlQnVja2V0T2JqZWN0cz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBVUkwgb2YgdGhlIGltYWdlIGxvZ28gdG8gZGlzcGxheSBvbiB0aGUgcmVnaXN0cmF0aW9uIHBhZ2UuXG4gICAqIEBkZWZhdWx0IC0gQW1hem9uIGxvZ29cbiAgICovXG4gIHJlYWRvbmx5IGltYWdlTG9nb1VybD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGEgc2FtcGxlIHJlZ2lzdHJhdGlvbiB3ZWIgcGFnZSBob3N0ZWQgb24gQW1hem9uIFMzIGFuZCBmcm9udGVkIGJ5IEFtYXpvbiBDbG91ZEZyb250LlxuICogVGhlIHdlYiBwYWdlIGluY2x1ZGVzIGEgZm9ybSBmb3IgdXNlcnMgdG8gcmVnaXN0ZXIgZm9yIHRoZSBTYWFTIHByb2R1Y3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBTYW1wbGVSZWdpc3RyYXRpb25XZWJQYWdlIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFNhbXBsZVJlZ2lzdHJhdGlvbldlYlBhZ2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgYWRkVGVtcGxhdGVUYWcodGhpcywgJ1NhbXBsZVJlZ2lzdHJhdGlvbldlYlBhZ2UnKTtcblxuICAgIGNvbnN0IHJlZ2lvbiA9IGNkay5TdGFjay5vZih0aGlzKS5yZWdpb247XG4gICAgaWYgKGNkay5Ub2tlbi5pc1VucmVzb2x2ZWQocmVnaW9uKSkge1xuICAgICAgLy8gcmVnaW9uIGluZm8gaGVscHMgdG8gZGVjaWRlIHdoZXRoZXIgdG8gY3JlYXRlIENsb3VkRnJvbnQgV0FGXG4gICAgICAvLyBvciBOYWdTdXBwcmVzc2lvbiBmb3IgdGhlIHJlc3VsdCBjZGstbmFnIGZpbmRpbmcuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZ2lvbiBub3Qgc3BlY2lmaWVkLiBVc2UgXCJlbnZcIiB0byBzcGVjaWZ5IHJlZ2lvbi4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB3ZWJzaXRlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnV2Vic2l0ZVMzQnVja2V0Jywge1xuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBwcm9wcy5hdXRvRGVsZXRlQnVja2V0T2JqZWN0cyxcbiAgICAgIC4uLihwcm9wcy5hdXRvRGVsZXRlQnVja2V0T2JqZWN0cyAmJiB7IHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1kgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBzdGF0aWNGaWxlcyA9IG5ldyBCdWNrZXREZXBsb3ltZW50KHRoaXMsICdTdGF0aWNGaWxlcycsIHtcbiAgICAgIHNvdXJjZXM6IFtTb3VyY2UuYXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3Jlc291cmNlcy9hd3MtbWFya2V0cGxhY2Uvc3RhdGljJykpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB3ZWJzaXRlQnVja2V0LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmYXVsdEltYWdlTG9nb1VybCA9XG4gICAgICAnaHR0cHM6Ly9tLm1lZGlhLWFtYXpvbi5jb20vaW1hZ2VzL0cvMDEvQWRQcm9kdWN0c1dlYnNpdGUvaW1hZ2VzL0FVWC8wMl9hbWF6b25fbG9nb19SR0JfU1FVSUQuX1RUV18ucG5nJztcblxuICAgIGNvbnN0IGR5bmFtaWNGaWxlID0gbmV3IERlcGxveVRpbWVTdWJzdGl0dXRlZEZpbGUodGhpcywgJ0R5bmFtaWNGaWxlU2NyaXB0Jywge1xuICAgICAgc291cmNlOiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vcmVzb3VyY2VzL2F3cy1tYXJrZXRwbGFjZS9keW5hbWljL3NjcmlwdC5qcycpLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHdlYnNpdGVCdWNrZXQsXG4gICAgICBkZXN0aW5hdGlvbktleTogJ3NjcmlwdC5qcycsXG4gICAgICBzdWJzdGl0dXRpb25zOiB7XG4gICAgICAgIHJlcXVpcmVkRmllbGRzOiBwcm9wcy51c2VyUHJvdmlkZWRSZXF1aXJlZEZpZWxkc0ZvclJlZ2lzdHJhdGlvbi5qb2luKCcsJyksXG4gICAgICAgIGltYWdlTG9nb1VybDogcHJvcHMuaW1hZ2VMb2dvVXJsID8/IGRlZmF1bHRJbWFnZUxvZ29VcmwsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgZHluYW1pY0ZpbGUubm9kZS5hZGREZXBlbmRlbmN5KHN0YXRpY0ZpbGVzKTtcblxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgIGNkay5TdGFjay5vZih0aGlzKSxcbiAgICAgIFtcbiAgICAgICAgYCR7Y2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZX0vQ3VzdG9tOjpDREtCdWNrZXREZXBsb3ltZW50ODY5M0JCNjQ5Njg5NDRCNjlBQUZCMENDOUVCODc1NkNgLFxuICAgICAgXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUlBTTQnLFxuICAgICAgICAgIHJlYXNvbjogJ1N1cHByZXNzIHVzYWdlIG9mIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZS4nLFxuICAgICAgICAgIGFwcGxpZXNUbzogW1xuICAgICAgICAgICAgJ1BvbGljeTo6YXJuOjxBV1M6OlBhcnRpdGlvbj46aWFtOjphd3M6cG9saWN5L3NlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGUnLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1JQU01JyxcbiAgICAgICAgICByZWFzb246ICdBbGxvdyB3aWxkY2FyZCBhY2Nlc3MgZm9yIENES0J1Y2tldERlcGxveW1lbnQuJyxcbiAgICAgICAgICBhcHBsaWVzVG86IFtcbiAgICAgICAgICAgICdBY3Rpb246OnMzOkdldE9iamVjdConLFxuICAgICAgICAgICAgJ0FjdGlvbjo6czM6R2V0QnVja2V0KicsXG4gICAgICAgICAgICAnQWN0aW9uOjpzMzpMaXN0KicsXG4gICAgICAgICAgICBgUmVzb3VyY2U6OmFybjo8QVdTOjpQYXJ0aXRpb24+OnMzOjo6Y2RrLSR7Y2RrLkRlZmF1bHRTdGFja1N5bnRoZXNpemVyLkRFRkFVTFRfUVVBTElGSUVSfS1hc3NldHMtPEFXUzo6QWNjb3VudElkPi0ke3JlZ2lvbn0vKmAsXG4gICAgICAgICAgICAnQWN0aW9uOjpzMzpEZWxldGVPYmplY3QqJyxcbiAgICAgICAgICAgICdBY3Rpb246OnMzOkFib3J0KicsXG4gICAgICAgICAgICBgUmVzb3VyY2U6Ojwke2Nkay5TdGFjay5vZih0aGlzKS5nZXRMb2dpY2FsSWQod2Vic2l0ZUJ1Y2tldC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBzMy5DZm5CdWNrZXQpfS5Bcm4+LypgLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ0F3c1NvbHV0aW9ucy1MMScsXG4gICAgICAgICAgcmVhc29uOiAnTk9ERUpTIDE4IGlzIHRoZSB2ZXJzaW9uIHVzZWQgY2RrIG1hYW5nZWQgY3VzdG9tIHJlc291cmNlLicsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZVxuICAgICk7XG5cbiAgICBjb25zdCBsb2dCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdXZWJzaXRlUzNCdWNrZXRMb2cnLCB7XG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHByb3BzLmF1dG9EZWxldGVCdWNrZXRPYmplY3RzLFxuICAgICAgLi4uKHByb3BzLmF1dG9EZWxldGVCdWNrZXRPYmplY3RzICYmIHsgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSB9KSxcbiAgICAgIG9iamVjdE93bmVyc2hpcDogczMuT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9QUkVGRVJSRUQsXG4gICAgICBpbnRlbGxpZ2VudFRpZXJpbmdDb25maWd1cmF0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0FyY2hpdmVBY2Nlc3NUaWVyJyxcbiAgICAgICAgICBhcmNoaXZlQWNjZXNzVGllclRpbWU6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbd2Vic2l0ZUJ1Y2tldCwgbG9nQnVja2V0XSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAnQXdzU29sdXRpb25zLVMxJyxcbiAgICAgICAgICByZWFzb246ICdTZXJ2ZXIgYWNjZXNzIGxvZ3Mgbm90IHJlcXVpcmVkLicsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgdHJ1ZSAvLyBhcHBseVRvQ2hpbGRyZW4gPSB0cnVlLCBzbyB0aGF0IGl0IGFwcGxpZXMgdG8gcG9saWNpZXMgY3JlYXRlZCBmb3IgdGhlIHJvbGUuXG4gICAgKTtcblxuICAgIGxldCBjZm5XQUY7XG4gICAgaWYgKGNkay5Ub2tlbi5pc1VucmVzb2x2ZWQocmVnaW9uKSA9PSBmYWxzZSAmJiByZWdpb24gPT0gJ3VzLWVhc3QtMScpIHtcbiAgICAgIGNmbldBRiA9IG5ldyBjZGsuYXdzX3dhZnYyLkNmbldlYkFDTCh0aGlzLCAnV0FGJywge1xuICAgICAgICBkZWZhdWx0QWN0aW9uOiB7IGFsbG93OiB7fSB9LFxuICAgICAgICBzY29wZTogJ0NMT1VERlJPTlQnLFxuICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgbWV0cmljTmFtZTogJ1dBRi1XZWJzaXRlUzNDbG91ZGZyb250RGlzdHJpYnV0aW9uJyxcbiAgICAgICAgfSxcbiAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICBnZW5lcmF0ZUFXU01hbmFnZWRSdWxlU2V0KCdBV1NNYW5hZ2VkUnVsZXNCb3RDb250cm9sUnVsZVNldCcsIDApLCAvLyBlbmFibGUgdG8gYmxvY2sgY3VybCByZXF1ZXN0c1xuICAgICAgICAgIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsIDEpLFxuICAgICAgICAgIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc0NvbW1vblJ1bGVTZXQnLCAyKSxcbiAgICAgICAgICBnZW5lcmF0ZUFXU01hbmFnZWRSdWxlU2V0KCdBV1NNYW5hZ2VkUnVsZXNBbm9ueW1vdXNJcExpc3QnLCAzKSxcbiAgICAgICAgICBnZW5lcmF0ZUFXU01hbmFnZWRSdWxlU2V0KCdBV1NNYW5hZ2VkUnVsZXNBbWF6b25JcFJlcHV0YXRpb25MaXN0JywgNCksXG4gICAgICAgICAgZ2VuZXJhdGVBV1NNYW5hZ2VkUnVsZVNldCgnQVdTTWFuYWdlZFJ1bGVzQWRtaW5Qcm90ZWN0aW9uUnVsZVNldCcsIDUpLFxuICAgICAgICAgIGdlbmVyYXRlQVdTTWFuYWdlZFJ1bGVTZXQoJ0FXU01hbmFnZWRSdWxlc1NRTGlSdWxlU2V0JywgNiksXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coJ09ubHkgYWJsZSB0byBjcmVhdGUgQ2xvdWRGcm9udCBXQUYgaW4gdXMtZWFzdC0xIHJlZ2lvbi4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KFxuICAgICAgdGhpcyxcbiAgICAgICdDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknLFxuICAgICAge1xuICAgICAgICBjb21tZW50OiAnU2VydmVybGVzcyB3ZWJzaXRlIE9BJyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdXZWJzaXRlUzNDbG91ZGZyb250RGlzdHJpYnV0aW9uJywge1xuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXG4gICAgICBsb2dCdWNrZXQ6IGxvZ0J1Y2tldCxcbiAgICAgIGdlb1Jlc3RyaWN0aW9uOiBjbG91ZGZyb250Lkdlb1Jlc3RyaWN0aW9uLmFsbG93bGlzdCgnVVMnLCAnQ0EnKSxcbiAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdhY2Nlc3MtbG9ncy8nLFxuICAgICAgaHR0cFZlcnNpb246IGNsb3VkZnJvbnQuSHR0cFZlcnNpb24uSFRUUDIsXG4gICAgICAuLi4oY2ZuV0FGICE9IHVuZGVmaW5lZCA/IHsgd2ViQWNsSWQ6IGNmbldBRi5hdHRyQXJuIH0gOiB7fSksXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih3ZWJzaXRlQnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICAgIH0pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxuICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgICcvcmVkaXJlY3RtYXJrZXRwbGFjZXRva2VuJzoge1xuICAgICAgICAgIGNvbXByZXNzOiB0cnVlLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlJlc3RBcGlPcmlnaW4ocHJvcHMucmVnaXN0cmF0aW9uQVBJKSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9zdWJzY3JpYmVyJzoge1xuICAgICAgICAgIGNvbXByZXNzOiB0cnVlLFxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0FMTCxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlJlc3RBcGlPcmlnaW4ocHJvcHMucmVnaXN0cmF0aW9uQVBJKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBpZiAoY2RrLlRva2VuLmlzVW5yZXNvbHZlZChyZWdpb24pID09IGZhbHNlICYmIHJlZ2lvbiAhPSAndXMtZWFzdC0xJykge1xuICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGRpc3RyaWJ1dGlvbiwgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdBd3NTb2x1dGlvbnMtQ0ZSMicsXG4gICAgICAgICAgcmVhc29uOiAnQ2FuIG9ubHkgY3JlYXRlIFdBRnYyIGZvciBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBpbiB1cy1lYXN0LTEgcmVnaW9uLicsXG4gICAgICAgIH0sXG4gICAgICBdKTtcbiAgICB9XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoZGlzdHJpYnV0aW9uLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiAnQXdzU29sdXRpb25zLUNGUjQnLFxuICAgICAgICByZWFzb246ICdVc2VzIGRlZmF1bHQgY2VydGlmaWNhdGUuJyxcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRmcm9udE1hcmtldHBsYWNlRnVsZmlsbG1lbnRVUkwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX0vcmVkaXJlY3RtYXJrZXRwbGFjZXRva2VuYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ0ROLWZyb250ZWQgVVJMIHRvIGFjY2VzcyB5b3VyIGxhbmRpbmcgcGFnZScsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
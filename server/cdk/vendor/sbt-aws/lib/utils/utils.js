"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoutes = exports.conditionallyAddScope = exports.generateAWSManagedRuleSet = exports.addTemplateTag = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const addTemplateTag = (construct, tag) => {
    const stackDesc = aws_cdk_lib_1.Stack.of(construct).templateOptions.description;
    const baseTelemetry = 'sbt-aws (uksb-1tupboc57)';
    let description = stackDesc;
    // There is no description, just make it telemetry + tags
    if (stackDesc === undefined) {
        description = appendTagToDescription(baseTelemetry, tag);
    }
    // There is a description, and it doesn't contain telemetry. We need to append telemetry + tags to it
    else if (!stackDesc.includes(baseTelemetry)) {
        description = appendTagToDescription(`${stackDesc} - ${baseTelemetry}`, tag);
    }
    // There is a telemetry description already
    else {
        description = appendTagToDescription(stackDesc, tag);
    }
    aws_cdk_lib_1.Stack.of(construct).templateOptions.description = description;
};
exports.addTemplateTag = addTemplateTag;
const appendTagToDescription = (existingDescription, newTag) => {
    // Check if the existing description already has tags
    if (existingDescription.includes('(tag:')) {
        // Extract the existing tags
        const startIndex = existingDescription.indexOf('(tag:') + 6;
        const endIndex = existingDescription.lastIndexOf(')');
        const existingTags = existingDescription.substring(startIndex, endIndex).split(', ');
        // Check if the new tag already exists
        if (!existingTags.includes(newTag)) {
            // Append the new tag to the existing tags
            existingTags.push(newTag);
            const newDescription = `${existingDescription.substring(0, startIndex)}${existingTags.join(', ')})`;
            return newDescription;
        }
        else {
            // The new tag already exists, return the original description
            return existingDescription;
        }
    }
    else {
        // Append the new tag to the description
        return `${existingDescription} (tag: ${newTag})`;
    }
};
const generateAWSManagedRuleSet = (managedGroupName, priority) => {
    const vendorName = 'AWS';
    return {
        name: `${vendorName}-${managedGroupName}`,
        priority,
        overrideAction: { none: {} },
        statement: {
            managedRuleGroupStatement: {
                name: managedGroupName,
                vendorName: vendorName,
            },
        },
        visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: managedGroupName,
            sampledRequestsEnabled: true,
        },
    };
};
exports.generateAWSManagedRuleSet = generateAWSManagedRuleSet;
const conditionallyAddScope = (unknownScope) => {
    if (unknownScope) {
        return [unknownScope];
    }
    return [];
};
exports.conditionallyAddScope = conditionallyAddScope;
const generateRoutes = (api, routes, authorizer) => {
    let allRoutes = [];
    routes.forEach((route) => {
        allRoutes = [
            ...api.addRoutes({
                path: route.path,
                methods: [route.method],
                integration: route.integration,
                authorizer: authorizer,
                authorizationScopes: (0, exports.conditionallyAddScope)(route.scope),
            }),
            ...allRoutes,
        ];
    });
    return allRoutes;
};
exports.generateRoutes = generateRoutes;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFFQUFxRTtBQUNyRSxzQ0FBc0M7OztBQUV0Qyw2Q0FBb0M7QUFJN0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxTQUFvQixFQUFFLEdBQVcsRUFBRSxFQUFFO0lBQ2xFLE1BQU0sU0FBUyxHQUFHLG1CQUFLLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUM7SUFDbEUsTUFBTSxhQUFhLEdBQUcsMEJBQTBCLENBQUM7SUFDakQsSUFBSSxXQUFXLEdBQUcsU0FBUyxDQUFDO0lBQzVCLHlEQUF5RDtJQUN6RCxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUM1QixXQUFXLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFDRCxxR0FBcUc7U0FDaEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztRQUM1QyxXQUFXLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxTQUFTLE1BQU0sYUFBYSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUNELDJDQUEyQztTQUN0QyxDQUFDO1FBQ0osV0FBVyxHQUFHLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBQ0QsbUJBQUssQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsZUFBZSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFDaEUsQ0FBQyxDQUFDO0FBakJXLFFBQUEsY0FBYyxrQkFpQnpCO0FBRUYsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLG1CQUEyQixFQUFFLE1BQWMsRUFBVSxFQUFFO0lBQ3JGLHFEQUFxRDtJQUNyRCxJQUFJLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzFDLDRCQUE0QjtRQUM1QixNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVELE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RCxNQUFNLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyRixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNuQywwQ0FBMEM7WUFDMUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxQixNQUFNLGNBQWMsR0FBRyxHQUFHLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3BHLE9BQU8sY0FBYyxDQUFDO1FBQ3hCLENBQUM7YUFBTSxDQUFDO1lBQ04sOERBQThEO1lBQzlELE9BQU8sbUJBQW1CLENBQUM7UUFDN0IsQ0FBQztJQUNILENBQUM7U0FBTSxDQUFDO1FBQ04sd0NBQXdDO1FBQ3hDLE9BQU8sR0FBRyxtQkFBbUIsVUFBVSxNQUFNLEdBQUcsQ0FBQztJQUNuRCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBRUssTUFBTSx5QkFBeUIsR0FBRyxDQUFDLGdCQUF3QixFQUFFLFFBQWdCLEVBQUUsRUFBRTtJQUN0RixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDekIsT0FBTztRQUNMLElBQUksRUFBRSxHQUFHLFVBQVUsSUFBSSxnQkFBZ0IsRUFBRTtRQUN6QyxRQUFRO1FBQ1IsY0FBYyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRTtRQUM1QixTQUFTLEVBQUU7WUFDVCx5QkFBeUIsRUFBRTtnQkFDekIsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsVUFBVSxFQUFFLFVBQVU7YUFDdkI7U0FDRjtRQUNELGdCQUFnQixFQUFFO1lBQ2hCLHdCQUF3QixFQUFFLElBQUk7WUFDOUIsVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixzQkFBc0IsRUFBRSxJQUFJO1NBQzdCO0tBQ0YsQ0FBQztBQUNKLENBQUMsQ0FBQztBQWxCVyxRQUFBLHlCQUF5Qiw2QkFrQnBDO0FBRUssTUFBTSxxQkFBcUIsR0FBRyxDQUFDLFlBQXFCLEVBQUUsRUFBRTtJQUM3RCxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBQ0QsT0FBTyxFQUFFLENBQUM7QUFDWixDQUFDLENBQUM7QUFMVyxRQUFBLHFCQUFxQix5QkFLaEM7QUFRSyxNQUFNLGNBQWMsR0FBRyxDQUM1QixHQUF5QixFQUN6QixNQUFnQixFQUNoQixVQUE4QyxFQUM5QyxFQUFFO0lBQ0YsSUFBSSxTQUFTLEdBQTZCLEVBQUUsQ0FBQztJQUM3QyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7UUFDdkIsU0FBUyxHQUFHO1lBQ1YsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO2dCQUNmLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtnQkFDaEIsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDdkIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO2dCQUM5QixVQUFVLEVBQUUsVUFBVTtnQkFDdEIsbUJBQW1CLEVBQUUsSUFBQSw2QkFBcUIsRUFBQyxLQUFLLENBQUMsS0FBSyxDQUFDO2FBQ3hELENBQUM7WUFDRixHQUFHLFNBQVM7U0FDYixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDLENBQUM7QUFuQlcsUUFBQSxjQUFjLGtCQW1CekIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgQW1hem9uLmNvbSwgSW5jLiBvciBpdHMgYWZmaWxpYXRlcy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbi8vIFNQRFgtTGljZW5zZS1JZGVudGlmaWVyOiBBcGFjaGUtMi4wXG5cbmltcG9ydCB7IFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheVYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjb25zdCBhZGRUZW1wbGF0ZVRhZyA9IChjb25zdHJ1Y3Q6IENvbnN0cnVjdCwgdGFnOiBzdHJpbmcpID0+IHtcbiAgY29uc3Qgc3RhY2tEZXNjID0gU3RhY2sub2YoY29uc3RydWN0KS50ZW1wbGF0ZU9wdGlvbnMuZGVzY3JpcHRpb247XG4gIGNvbnN0IGJhc2VUZWxlbWV0cnkgPSAnc2J0LWF3cyAodWtzYi0xdHVwYm9jNTcpJztcbiAgbGV0IGRlc2NyaXB0aW9uID0gc3RhY2tEZXNjO1xuICAvLyBUaGVyZSBpcyBubyBkZXNjcmlwdGlvbiwganVzdCBtYWtlIGl0IHRlbGVtZXRyeSArIHRhZ3NcbiAgaWYgKHN0YWNrRGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZGVzY3JpcHRpb24gPSBhcHBlbmRUYWdUb0Rlc2NyaXB0aW9uKGJhc2VUZWxlbWV0cnksIHRhZyk7XG4gIH1cbiAgLy8gVGhlcmUgaXMgYSBkZXNjcmlwdGlvbiwgYW5kIGl0IGRvZXNuJ3QgY29udGFpbiB0ZWxlbWV0cnkuIFdlIG5lZWQgdG8gYXBwZW5kIHRlbGVtZXRyeSArIHRhZ3MgdG8gaXRcbiAgZWxzZSBpZiAoIXN0YWNrRGVzYy5pbmNsdWRlcyhiYXNlVGVsZW1ldHJ5KSkge1xuICAgIGRlc2NyaXB0aW9uID0gYXBwZW5kVGFnVG9EZXNjcmlwdGlvbihgJHtzdGFja0Rlc2N9IC0gJHtiYXNlVGVsZW1ldHJ5fWAsIHRhZyk7XG4gIH1cbiAgLy8gVGhlcmUgaXMgYSB0ZWxlbWV0cnkgZGVzY3JpcHRpb24gYWxyZWFkeVxuICBlbHNlIHtcbiAgICBkZXNjcmlwdGlvbiA9IGFwcGVuZFRhZ1RvRGVzY3JpcHRpb24oc3RhY2tEZXNjLCB0YWcpO1xuICB9XG4gIFN0YWNrLm9mKGNvbnN0cnVjdCkudGVtcGxhdGVPcHRpb25zLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG59O1xuXG5jb25zdCBhcHBlbmRUYWdUb0Rlc2NyaXB0aW9uID0gKGV4aXN0aW5nRGVzY3JpcHRpb246IHN0cmluZywgbmV3VGFnOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAvLyBDaGVjayBpZiB0aGUgZXhpc3RpbmcgZGVzY3JpcHRpb24gYWxyZWFkeSBoYXMgdGFnc1xuICBpZiAoZXhpc3RpbmdEZXNjcmlwdGlvbi5pbmNsdWRlcygnKHRhZzonKSkge1xuICAgIC8vIEV4dHJhY3QgdGhlIGV4aXN0aW5nIHRhZ3NcbiAgICBjb25zdCBzdGFydEluZGV4ID0gZXhpc3RpbmdEZXNjcmlwdGlvbi5pbmRleE9mKCcodGFnOicpICsgNjtcbiAgICBjb25zdCBlbmRJbmRleCA9IGV4aXN0aW5nRGVzY3JpcHRpb24ubGFzdEluZGV4T2YoJyknKTtcbiAgICBjb25zdCBleGlzdGluZ1RhZ3MgPSBleGlzdGluZ0Rlc2NyaXB0aW9uLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmRJbmRleCkuc3BsaXQoJywgJyk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgbmV3IHRhZyBhbHJlYWR5IGV4aXN0c1xuICAgIGlmICghZXhpc3RpbmdUYWdzLmluY2x1ZGVzKG5ld1RhZykpIHtcbiAgICAgIC8vIEFwcGVuZCB0aGUgbmV3IHRhZyB0byB0aGUgZXhpc3RpbmcgdGFnc1xuICAgICAgZXhpc3RpbmdUYWdzLnB1c2gobmV3VGFnKTtcbiAgICAgIGNvbnN0IG5ld0Rlc2NyaXB0aW9uID0gYCR7ZXhpc3RpbmdEZXNjcmlwdGlvbi5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleCl9JHtleGlzdGluZ1RhZ3Muam9pbignLCAnKX0pYDtcbiAgICAgIHJldHVybiBuZXdEZXNjcmlwdGlvbjtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIG5ldyB0YWcgYWxyZWFkeSBleGlzdHMsIHJldHVybiB0aGUgb3JpZ2luYWwgZGVzY3JpcHRpb25cbiAgICAgIHJldHVybiBleGlzdGluZ0Rlc2NyaXB0aW9uO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBBcHBlbmQgdGhlIG5ldyB0YWcgdG8gdGhlIGRlc2NyaXB0aW9uXG4gICAgcmV0dXJuIGAke2V4aXN0aW5nRGVzY3JpcHRpb259ICh0YWc6ICR7bmV3VGFnfSlgO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgZ2VuZXJhdGVBV1NNYW5hZ2VkUnVsZVNldCA9IChtYW5hZ2VkR3JvdXBOYW1lOiBzdHJpbmcsIHByaW9yaXR5OiBudW1iZXIpID0+IHtcbiAgY29uc3QgdmVuZG9yTmFtZSA9ICdBV1MnO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IGAke3ZlbmRvck5hbWV9LSR7bWFuYWdlZEdyb3VwTmFtZX1gLFxuICAgIHByaW9yaXR5LFxuICAgIG92ZXJyaWRlQWN0aW9uOiB7IG5vbmU6IHt9IH0sXG4gICAgc3RhdGVtZW50OiB7XG4gICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XG4gICAgICAgIG5hbWU6IG1hbmFnZWRHcm91cE5hbWUsXG4gICAgICAgIHZlbmRvck5hbWU6IHZlbmRvck5hbWUsXG4gICAgICB9LFxuICAgIH0sXG4gICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgbWV0cmljTmFtZTogbWFuYWdlZEdyb3VwTmFtZSxcbiAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgfSxcbiAgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBjb25kaXRpb25hbGx5QWRkU2NvcGUgPSAodW5rbm93blNjb3BlPzogc3RyaW5nKSA9PiB7XG4gIGlmICh1bmtub3duU2NvcGUpIHtcbiAgICByZXR1cm4gW3Vua25vd25TY29wZV07XG4gIH1cbiAgcmV0dXJuIFtdO1xufTtcblxuZXhwb3J0IGludGVyZmFjZSBJUm91dGUge1xuICByZWFkb25seSBtZXRob2Q6IGFwaWdhdGV3YXlWMi5IdHRwTWV0aG9kO1xuICByZWFkb25seSBzY29wZT86IHN0cmluZztcbiAgcmVhZG9ubHkgcGF0aDogc3RyaW5nO1xuICByZWFkb25seSBpbnRlZ3JhdGlvbjogYXBpZ2F0ZXdheVYyLkh0dHBSb3V0ZUludGVncmF0aW9uO1xufVxuZXhwb3J0IGNvbnN0IGdlbmVyYXRlUm91dGVzID0gKFxuICBhcGk6IGFwaWdhdGV3YXlWMi5IdHRwQXBpLFxuICByb3V0ZXM6IElSb3V0ZVtdLFxuICBhdXRob3JpemVyPzogYXBpZ2F0ZXdheVYyLklIdHRwUm91dGVBdXRob3JpemVyXG4pID0+IHtcbiAgbGV0IGFsbFJvdXRlczogYXBpZ2F0ZXdheVYyLkh0dHBSb3V0ZVtdID0gW107XG4gIHJvdXRlcy5mb3JFYWNoKChyb3V0ZSkgPT4ge1xuICAgIGFsbFJvdXRlcyA9IFtcbiAgICAgIC4uLmFwaS5hZGRSb3V0ZXMoe1xuICAgICAgICBwYXRoOiByb3V0ZS5wYXRoLFxuICAgICAgICBtZXRob2RzOiBbcm91dGUubWV0aG9kXSxcbiAgICAgICAgaW50ZWdyYXRpb246IHJvdXRlLmludGVncmF0aW9uLFxuICAgICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxuICAgICAgICBhdXRob3JpemF0aW9uU2NvcGVzOiBjb25kaXRpb25hbGx5QWRkU2NvcGUocm91dGUuc2NvcGUpLFxuICAgICAgfSksXG4gICAgICAuLi5hbGxSb3V0ZXMsXG4gICAgXTtcbiAgfSk7XG4gIHJldHVybiBhbGxSb3V0ZXM7XG59O1xuIl19
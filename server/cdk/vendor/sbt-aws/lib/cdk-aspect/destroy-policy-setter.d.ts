import { IAspect } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
export declare class DestroyPolicySetter implements IAspect {
    visit(node: IConstruct): void;
}

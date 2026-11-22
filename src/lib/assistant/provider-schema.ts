import {z} from 'zod';
import {assistantPagePlanSchema,assistantProposalSchema} from './model';

// Strict provider schemas require every object property. Internal CMS plans
// still allow omitted items; on the provider boundary non-list sections use [].
const section=assistantPagePlanSchema.shape.sections.element;
const providerPage=assistantPagePlanSchema.extend({
 sections:z.array(section.extend({items:section.shape.items.unwrap()})).min(1).max(8)
});
const variants=assistantProposalSchema.options;
export const assistantProviderEnvelopeSchema=z.object({
 proposal:z.union([
  variants[0],variants[1].extend({page:providerPage}),variants[2],variants[3],variants[4]
 ])
}).strict();

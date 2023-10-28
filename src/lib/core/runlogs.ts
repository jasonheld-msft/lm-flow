import z from 'zod';

import {ModelDefinitionList} from './models.js';

const StageLog = z.object({
  timestamp: z.date(),
  stage: z.string(),
  model: z.string(),
  input: z.any(),
  prompt: z.string(),
  completion: z.string(),
  output: z.any(),
  expected: z.any(),
  judgment: z.any(),
});
type StageLog = z.infer<typeof StageLog>;

const TestCaseLog = z.object({
  id: z.string(),
  sha: z.string(),
  log: z.array(StageLog),
});

type TestCaseLog = z.infer<typeof TestCaseLog>;

const RunLog = z.object({
  cmd: z.string(),
  cwd: z.string(),
  id: z.string(),
  models: ModelDefinitionList,
  timestamp: z.date(),
  user: z.string(),
  // tool version
  cases: z.array(TestCaseLog),
});
export type RunLog = z.infer<typeof RunLog>;

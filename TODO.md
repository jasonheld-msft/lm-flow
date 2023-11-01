* Top
  * Mocha
    * x configure
    * x Boolean expression parser cases
    * x Link cases - migrage from link7Test.ts
  * Factoring for use as a package
    * X Stage definition file? - decided not to do this
    * Also special folder that is .gitignored
    * Remove pipelines folder
  * links/ensembles
    * Rename Link to Stage (or Node or something else)
    * Rename process to eval
    * Convert MuxLink.input() to return child index.
    * Add createExpectedCompletion() to Link/Stage
    * Add `export * from './link7.js';` to lib/core/index.ts
      * Need to get rid of types.ts first
      * Fix imports in unit tests
    * New zod file loaders
    * Catch exceptions at top of eval process for test case.
    * Add judgments to top level of test case.
      * Allow expected and judge functions on sequence and mux
      * Sequence
      * Mux
    * Revert appplication.ts, keep trainer.ts for now
    * x TestCaseType
    * End-to-end integration
      * Integrate with evaluateTestCases
      * Remove stage
      * x Pass optional TestCase argument through process
      * x Remove `expected` from link
    * model override flags
    * training
    * x Fix prettier configuration after move to pure ESM packages
    * x judge() and expected
  * iterator symbol for AvailableModels
  * Eliminate concept of stage model override - put in config file?
  * Separate folders for
    * config
    * runs
    * training
    * tests
  * Train command
  * Add context to TestCases
  * . Model definition should not reside in data/cases.
  * OpenAI integration
  * Consider hashing object without tags field.
    * Parse, remove tags, serialize, hash.
  * Constants for environment variable and file names
  * . Models definition file and command-line argument
    * Need to decide default configuration location (models and stages)
  * Test result formatter
    * Handling dates
    * Do we still need luxon?
  * Pipeline vs graph
    * Force type error if ZodTypes are wrong in Stage.types.
  * Move .env configuration out of configure() - separate from logger.
  * Reorganize types.ts
  * Configure mocha and test runner


  * Accept yaml or json inputs
  * Command check for duplicate flags?
  * console.log() => logger.log()
  * Rework wrapper now that Configuration contains logger
  * x Add command line, configuration, user, cwd to log, run file name/id
  * x Write logs
    * Need ability to write failed log.
    * Need some way to parse logs without pipeline
    * x Naming - run folder - Date followed by GUID?
  * Test runner
    * Move makeStages() to configuration.
    * x Move makeModels() to configuration.
    * x Clean command
    * Batch running
      * x Concurrancy in test cases
      * Concurrancy in LLM calls?
  * Clean up variable, function, class, type naming
  * . Add logging to inference and eval
  * Separate inference from eval
  * Handle exceptions in eval
  * x Move configure.ts into core
  * x Rename stage functions
    * x makePrompt
    * x parseCompletion
    * x makeTrainingCase
  * x Add hash to test cases
  * x Test case loader/validator
  * x Zod
  * x Recommended extensions
  * x Dev container
* README.md
  * Toolchain configuration
  * Build
  * Run
  * Explain design
  * Scenarios
    * Use a set of test cases to evaluate model
    * Format the output of an evaluation run
    * Use a set of test cases to train a model
    * Create a test case
* Reuse
  * LLM invocation
  * x File tree walker
  * x Filter by boolean tag expressions
  * x Bring over suite-predicate.test.ts
  * x SHA computation
  * x LICENSE
* Configure
  * Jest or Mocha tests
  * x Commander
  * x Dotenv
  * x .gitignore
  * x Node engine version
* Design
  * Naming convention
  * TestCase file
  * EvaluationResult file
  * Training set
  * -models option
  * Project
  * BackProject
  * Format command?
* Steps
  * Format results
    * Summary
    * Results CSV
    * Logs
* See note on fs-extra@9.0.13: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/51521 





* Pure ESM: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
* Pure ESM Gist: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
* Typescript: https://www.typescriptlang.org/docs/handbook/modules/reference.html#node16-nodenext
* Migration: https://dev.to/logto/migrate-a-60k-loc-typescript-nodejs-repo-to-esm-and-testing-become-4x-faster-12-5f82


~~~
// Experiment to see if higher kinded types could be used to
// reduce code duplication in Mux
// https://stackoverflow.com/questions/37323581/how-to-specify-generic-type-as-a-generic-higher-kinded-types?rq=4
// https://stackoverflow.com/questions/64394190/how-to-have-a-generic-type-argument-be-itself-a-generic
// https://github.com/microsoft/TypeScript/issues/1213
// export type MuxMap<F, T> = T extends readonly [
export type MuxMap<G, F extends G<any>, T> = T extends readonly [
  infer HEAD,
  ...infer TAIL
]
  ? F<HEAD> | MuxMap<F, TAIL>
  : never;
~~~
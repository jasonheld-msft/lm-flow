* Top
  * x Rename stage functions
    * x makePrompt
    * x parseCompletion
    * x makeTrainingCase
  * Stage definition file
  * . Model definition should not reside in data/cases.
  * Reorganize types.ts
  * x Move configure.ts into core
  * Models definition file and command-line argument
  * Constants for environment variable names
  * Add context to TestCases
  * Add command line, configuration, user, cwd to log, run file name/id
  * Accept yaml or json inputs
  * Consider hashing object without tags field.
    * Parse, remove tags, serialize, hash.
  * Force type error if ZodTypes are wrong in Stage.types.
  * Test runner
    * Move makeModels() and makeStages() to configuration.
    * Write logs
      * Need ability to write failed log.
      * Need some way to parse logs without pipeline
      * Naming - run folder - Date followed by GUID?
    * Clean command
    * Batch running
      * x Concurrancy in test cases
      * Concurrancy in LLM calls?
  * Test result formatter
  * Pipeline vs graph
  * OpenAI integration
  * Clean up variable, function, class, type naming
  * . Add logging to inference and eval
  * Separate inference from eval
  * Handle exceptions in eval
  * Move .env configuration out of configure() - separate from logger.
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

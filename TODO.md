* Top
  * console.log() => logger.log()
  * Rework wrapper now that Configuration contains logger
  * Factoring for use as a package
    * Also special folder that is gitignored
  * Command check for duplicate flags?
  * Add context to TestCases
  * Add command line, configuration, user, cwd to log, run file name/id
  * x Write logs
    * Need ability to write failed log.
    * Need some way to parse logs without pipeline
    * x Naming - run folder - Date followed by GUID?
  * Stage definition file
  * . Model definition should not reside in data/cases.
  * Consider hashing object without tags field.
    * Parse, remove tags, serialize, hash.
  * Constants for environment variable and file names
  * . Models definition file and command-line argument
    * Need to decide default configuration location (models and stages)
  * Test result formatter
    * Handling dates
    * Do we still need luxon?
  * Pipeline vs graph
  * OpenAI integration
  * Move .env configuration out of configure() - separate from logger.
  * Reorganize types.ts
  * Accept yaml or json inputs
  * Force type error if ZodTypes are wrong in Stage.types.
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

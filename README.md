# model-flow

`model-flow` is an experimental library for evalating and training ennsembles of language models.

## Using model-flow

* Create ensemble definition in TypeScript.
* Use model-flow to create command-line tool.
* Author test cases.
* Evaluate a subset of test cases.
* Generate model training data from a subset of test cases.

## Building model-flow

Instructions for setting up your environment and building `model-flow` can be found [here](./documentation/build.md).

## Running the Examples

`model-flow` comes with an example, using an ensemble of a single OpenAI GPT 3.5 model. Here's the help message command:

~~~
% node build/src/samples/openai.js -h     
Usage: openai [options] [command]

Tool to train and evaluate multi-LLM systems.

Options:
  -h, --help        display help for command

Commands:
  eval [options]    Evaluate a multi-model system
  train [options]   Train a multi-model system
  format [options]  Format results
  clean [options]   remove all files from output folder
  help [command]    display help for command

The following environment variables can also be defined in .env:
  OPENAI_API_KEY - OpenAI API key
  OPENAI_ENDPOINT - OpenAI API endpoint (defaults to https://api.openai.com/v1/chat/completions)
  OPENAI_ORGANIZATION - OpenAI organization
  AZURE_OPENAI_API_KEY - Azure OpenAI api key
  AZURE_OPENAI_ENDPOINT - Azure OpenAI endpoint
  INPUT_FOLDER - Folder with test cases (defaults to ./data/cases)
  OUTPUT_FOLDER - Folder to write run logs (defaults to ./data/runs)
~~~

Before running this example, you must set the OPENAI_API_KEY environment variable or add it to the `.env` file. 

~~~
% node build/src/samples/openai.js eval -i data/cases2
model-flow tool run "eval" command on Fri Nov 03 2023 11:00:36 GMT-0700 (Pacific Daylight Time).
Configuration from "./.env":
Configuration:
  INPUT_FOLDER: data/cases2
  OUTPUT_FOLDER: ./data/runs
  FILTER: (no filter)
  CONCURRANCY: 1

Processed 1 test case
Saving run log to "./data/runs/cab52e78-bf01-46bf-9c21-0a1ae8ffb985.yaml".
Completed evaluation run.

No warnings.
No errors.
~~~

The run log is in `./data/runs/cab52e78-bf01-46bf-9c21-0a1ae8ffb985.yaml`:
~~~
testRunId: cab52e78-bf01-46bf-9c21-0a1ae8ffb985
cmd: >-
  node.exe
  ./build/src/samples/openai.js eval -i data/cases2
cwd: /git/model-flow
timestamp: 2023-11-03T18:00:36.832Z
user: mike
models:
  - type: mock
    name: model1
    config:
      exactMatch: false
      defaultResponse: I don't understand
      cache:
        - prompt: hello, world
          completion: '2'
        - prompt: hello
          completion: '1'
  - type: mock
    name: model2
    config:
      exactMatch: false
      defaultResponse: I don't understand
      cache:
        - prompt: '0'
          completion: goodbye
        - prompt: '1'
          completion: hello
        - prompt: '2'
          completion: hello hello
  - type: azure
    name: azure-3.5
    config:
      max_tokens: 3000
  - type: openai
    name: openai-3.5
    config:
      model: gpt-3.5
      max_tokens: 3000
  - type: openai
    name: openai-3.5-turbo-16k
    config:
      model: gpt-3.5-turbo-16k
      max_tokens: 3000
  - type: openai
    name: openai-4
    config:
      model: gpt-4
      max_tokens: 3000
cases:
  - testCaseId: one
    sha: 81c17cd8a076416a2c767dd2462c23b3aee7637c29205955180fb0b40780d292
    context:
      user: user1
      date: 2023-11-01T23:12:40.452Z
    log:
      type: model
      model: openai-3.5-turbo-16k
      name: openai
      input: Hello, world
      prompt:
        - role: system
          content: >-
            You are an assistant that counts the number of words in the user
            text prompt.

            Return only the number.
        - role: user
          content: Hello, world
      completion: '2'
      output: 2
      judgment: true
      expected: 2
~~~
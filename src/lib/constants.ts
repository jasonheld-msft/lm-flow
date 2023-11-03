///////////////////////////////////////////////////////////////////////////////
//
// Environment Variables
//
///////////////////////////////////////////////////////////////////////////////

// OpenAI
export const openai_api_key = 'OPENAI_API_KEY';
export const openai_endpoint = 'OPENAI_ENDPOINT';
export const default_openai_endpoint =
  'https://api.openai.com/v1/chat/completions';
export const openai_organization = 'OPENAI_ORGANIZATION';

// Azure
export const azure_openai_api_key = 'AZURE_OPENAI_API_KEY';
export const azure_openai_endpoint = 'AZURE_OPENAI_ENDPOINT';

// Tool
export const input_folder = 'INPUT_FOLDER';
export const defaultInputFolder = './data/cases';
export const output_folder = 'OUTPUT_FOLDER';
export const defaultOutputFolder = './data/runs';
export const defaultConcurrancy = 1;
export const defaultEnvFile = './.env';

export const environmentVariables = [
  // OpenAI
  {key: openai_api_key, description: 'OpenAI API key'},
  {
    key: openai_endpoint,
    description: 'OpenAI API endpoint',
    default: default_openai_endpoint,
  },
  {key: openai_organization, description: 'OpenAI organization'},

  // Azure
  {key: azure_openai_api_key, description: 'Azure OpenAI api key'},
  {key: azure_openai_endpoint, description: 'Azure OpenAI endpoint'},

  // Tool
  {
    key: input_folder,
    description: 'Folder with test cases',
    default: defaultInputFolder,
  },
  {
    key: output_folder,
    description: 'Folder to write run logs',
    default: defaultOutputFolder,
  },
];

export function environmentHelp(): string {
  const lines = environmentVariables.map(
    x =>
      `  ${x.key} - ${x.description}${
        x.default ? ` (defaults to ${x.default})` : ''
      }`
  );
  return [
    '',
    'The following environment variables can also be defined in .env:',
    ...lines,
  ].join('\n');
}

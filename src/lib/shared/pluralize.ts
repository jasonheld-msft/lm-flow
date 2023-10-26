export function pluralize(count: number, single: string, multiple: string) {
  return count === 1 ? single : multiple;
}

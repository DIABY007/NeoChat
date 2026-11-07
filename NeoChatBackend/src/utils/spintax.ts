export function processSpintax(text: string): string {
  let result = text;
  const spintaxPattern = /\{([^{}]+)\}/g;
  
  let match;
  while ((match = spintaxPattern.exec(result)) !== null) {
    const options = match[1].split('|');
    const randomOption = options[Math.floor(Math.random() * options.length)];
    result = result.replace(match[0], randomOption);
    spintaxPattern.lastIndex = 0;
  }
  
  return result;
}

export function hasSpintax(text: string): boolean {
  return /\{[^{}]+\}/.test(text);
}

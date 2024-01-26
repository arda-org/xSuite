export const splitCommaSeparatedArgs = (input: string) => {
  const result = [];
  let currentSegment = "";
  let angleBracketCount = 0;

  for (const char of input) {
    if (char === "," && angleBracketCount === 0) {
      result.push(currentSegment);
      currentSegment = "";
    } else {
      currentSegment += char;

      if (char === "<") {
        angleBracketCount++;
      } else if (char === ">") {
        angleBracketCount--;
      }
    }
  }

  if (currentSegment !== "") {
    result.push(currentSegment);
  }

  return result;
};

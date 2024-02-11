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

export const replaceInObject = (
  obj: any,
  replacements: [toReplace: string, replaceValue: string][],
) => {
  if (typeof obj === "object") {
    for (const keys in obj) {
      if (typeof obj[keys] === "object") {
        replaceInObject(obj[keys], replacements);
      } else if (typeof obj[keys] === "string") {
        replacements.forEach((r) => {
          obj[keys] = obj[keys].replace(r[0], r[1]);
        });
      }
    }
  }
  return obj;
};

export const scrollToSegment = (id: string) => {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
};

export const splitIntoSentences = (text: string): string[] => {
  return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
};

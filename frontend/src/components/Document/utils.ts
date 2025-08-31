import { TDocumentType } from "../../store/DocumentStore";

export const scrollToSegment = (id: string) => {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
};

export const splitIntoSentences = (text: string): string[] => {
  return text.match(/[^\.!\?]+[\.!\?]+/g) || [];
};

export const getSegmentIdByIndex = (
  type: TDocumentType,
  index: number,
): string => {
  return `${type}-segment-${index}`;
};

export const getSegmentIndexById = (id: string): number => {
  return parseInt(id.split("-").pop() || "-1", 10);
};

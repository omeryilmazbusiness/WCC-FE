export type SearchEntityType =
  | "customer"
  | "lead"
  | "booking"
  | "conversation"
  | "task"
  | "package"
  | "departure"
  | "supplier"
  | string;

export type SearchHit = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  hrefHint: string;
  score: number;
};

export type SearchResult = {
  query: string;
  hits: SearchHit[];
};

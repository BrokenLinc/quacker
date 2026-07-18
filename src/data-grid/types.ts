/** Stub types for ValueDisplay (legacy data-grid scaffolding). */

export interface DataGridColumnMeta {
  type?: string;
  subtype?: string;
  options?: { value: unknown; label: string }[];
  format?: (value: unknown) => React.ReactNode;
  trueFalseLabels?: [string, string];
  dateFormat?: string;
}

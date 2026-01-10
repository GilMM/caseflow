// src/lib/ui/priority.js
export const CASE_PRIORITIES = [
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "normal", label: "Normal" },
    { value: "low", label: "Low" },
  ];
  
  export const priorityColor = (p) =>
    ({ urgent: "red", high: "volcano", normal: "default", low: "cyan" }[p] || "default");
  
  export function priorityLabel(value) {
    return CASE_PRIORITIES.find((x) => x.value === value)?.label || value || "—";
  }
  
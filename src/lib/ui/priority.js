// src/lib/ui/priority.js

export const PRIORITIES = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];
  
  export const priorityOptions = PRIORITIES;
  
  export const priorityColor = (p) =>
    ({
      urgent: "red",
      high: "volcano",
      normal: "default",
      low: "cyan",
    }[p] || "default");
  
  export function priorityLabel(value) {
    return PRIORITIES.find((x) => x.value === value)?.label || value || "—";
  }
  
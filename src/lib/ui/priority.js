// src/lib/ui/priority.js
import {
    ThunderboltOutlined,
    FireOutlined,
    MinusCircleOutlined,
    InfoCircleOutlined,
  } from "@ant-design/icons";
  
  export const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ];
  
  export function priorityLabel(value) {
    return PRIORITY_OPTIONS.find((p) => p.value === value)?.label || value || "—";
  }
  
  export function getPriorityMeta(value) {
    const v = String(value || "").toLowerCase();
  
    const map = {
      urgent: { color: "red", Icon: ThunderboltOutlined, label: "Urgent" },
      high: { color: "volcano", Icon: FireOutlined, label: "High" },
      normal: { color: "default", Icon: InfoCircleOutlined, label: "Normal" },
      low: { color: "cyan", Icon: MinusCircleOutlined, label: "Low" },
    };
  
    return map[v] || { color: "default", Icon: InfoCircleOutlined, label: priorityLabel(value) };
  }
  
  // Back-compat
  export const priorityColor = (p) => getPriorityMeta(p).color;
  
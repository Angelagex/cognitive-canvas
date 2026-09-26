export const baseAttributes = {
  createdAt: {
    type: "number",
    default: () => Date.now(),
    readOnly: true,
  },
  updatedAt: {
    type: "number",
    default: () => Date.now(),
    set: () => Date.now(),
  },
  deletedAt: {
    type: "number",
    required: false,
  },
} as const;

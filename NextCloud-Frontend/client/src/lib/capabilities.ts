export type AppCapabilities = {
  auth: boolean;
  files: boolean;
  talk: boolean;
  deck: boolean;
  calendar: boolean;
  contacts: boolean;
  notes: boolean;
  mail: boolean;
  activity: boolean;
  source: string;
  checkedAt: string;
  apps: string[];
};

export const defaultCapabilities: AppCapabilities = {
  auth: true,
  files: true,
  talk: false,
  deck: false,
  calendar: false,
  contacts: false,
  notes: true,
  mail: false,
  activity: false,
  source: "default",
  checkedAt: "",
  apps: [],
};

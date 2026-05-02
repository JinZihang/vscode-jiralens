export type JiraUserInfo = {
  self: string;
  key: string;
  name: string;
  displayName: string;
  avatarUrls: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  emailAddress: string;
  timeZone: string;
  active: boolean;
};

export type JiraVersionInfo = {
  self: string;
  id: string;
  name: string;
  description: string;
  archived: boolean;
  released: boolean;
  releaseDate: string;
};

export type JiraComponentInfo = {
  self: string;
  id: string;
  name: string;
  description: string;
};

export type JiraStatusCategoryInfo = {
  self: string;
  id: number;
  key: string;
  name: string;
  colorName: string;
};

export type JiraStatusInfo = {
  self: string;
  id: string;
  name: string;
  iconUrl: string;
  description: string;
  statusCategory: JiraStatusCategoryInfo;
};

export type JiraIssueTypeInfo = {
  self: string;
  id: string;
  avatarId?: number;
  name: string;
  iconUrl: string;
  description: string;
  subtask: boolean;
};

export type JiraResolutionInfo = {
  self: string;
  id: string;
  name: string;
  description: string;
};

export type JiraPriorityInfo = {
  self: string;
  id: string;
  name: string;
  iconUrl: string;
};

export type JiraProjectInfo = {
  self: string;
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls: {
    '16x16': string;
    '24x24': string;
    '32x32': string;
    '48x48': string;
  };
  projectCategory?: {
    self: string;
    id: string;
    name: string;
    description: string;
  };
};

export type JiraAttachmentInfo = {
  self: string;
  id: string;
  author: JiraUserInfo;
  filename: string;
  thumbnail: string;
  mimeType: string;
  size: number;
  content: string;
  created: string;
};

export type JiraLinkedIssueDetails = {
  self: string;
  id: string;
  key: string;
  fields: {
    summary: string;
    status: JiraStatusInfo;
    priority: JiraPriorityInfo;
    issuetype: JiraIssueTypeInfo;
  };
};

export type JiraIssueLinkInfo = {
  self: string;
  id: string;
  type: {
    self: string;
    id: string;
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: JiraLinkedIssueDetails;
  outwardIssue?: JiraLinkedIssueDetails;
};

export type JiraCommentInfo = {
  self: string;
  id: string;
  author: JiraUserInfo;
  updateAuthor: JiraUserInfo;
  body: string;
  created: string;
  updated: string;
};

export type JiraIssueFields = {
  summary: string;
  description: string | null;
  issuetype?: JiraIssueTypeInfo;
  status?: JiraStatusInfo;
  resolution?: JiraResolutionInfo | null;
  assignee?: JiraUserInfo | null;
  reporter?: JiraUserInfo | null;
  priority?: JiraPriorityInfo | null;
  fixVersions?: JiraVersionInfo[];
  versions?: JiraVersionInfo[];
  components?: JiraComponentInfo[];
  labels?: string[];
  environment?: string | null;
  created: string;
  updated: string;
  resolutiondate?: string | null;
  attachment?: JiraAttachmentInfo[];
  issuelinks?: JiraIssueLinkInfo[];
  comment?: {
    comments: JiraCommentInfo[];
    maxResults: number;
    total: number;
    startAt: number;
  };
  project?: JiraProjectInfo;
  [key: string]: unknown;
};

export type JiraIssue = {
  id: string;
  key: string;
  self: string;
  expand: string;
  fields: JiraIssueFields;
};

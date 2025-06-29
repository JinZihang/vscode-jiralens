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
    status: {
      self: string;
      id: string;
      name: string;
      iconUrl: string;
      description: string;
      statusCategory: {
        self: string;
        id: number;
        key: string;
        name: string;
        colorName: string;
      };
    };
    priority: {
      self: string;
      id: string;
      name: string;
      iconUrl: string;
    };
    issuetype: {
      self: string;
      id: string;
      avatarId: number;
      name: string;
      iconUrl: string;
      description: string;
      subtask: boolean;
    };
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

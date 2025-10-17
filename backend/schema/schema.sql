-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accountledger (
  LedgerID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  AccountID bigint NOT NULL,
  JournalEntryID bigint NOT NULL,
  TransactionDate date NOT NULL,
  Description text,
  Debit numeric NOT NULL DEFAULT 0.00,
  Credit numeric NOT NULL DEFAULT 0.00,
  PostTimestamp timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accountledger_pkey PRIMARY KEY (LedgerID),
  CONSTRAINT accountledger_AccountID_fkey FOREIGN KEY (AccountID) REFERENCES public.chartofaccounts(AccountID),
  CONSTRAINT accountledger_JournalEntryID_fkey FOREIGN KEY (JournalEntryID) REFERENCES public.journalentries(JournalEntryID)
);
CREATE TABLE public.chartofaccounts (
  AccountID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  AccountNumber text NOT NULL UNIQUE,
  AccountName text NOT NULL UNIQUE,
  AccountDescription text,
  NormalSide text NOT NULL,
  Category text NOT NULL,
  Subcategory text,
  InitialBalance numeric NOT NULL DEFAULT 0.00,
  DisplayOrder integer,
  StatementType text,
  IsActive boolean NOT NULL DEFAULT true,
  DateCreated timestamp with time zone NOT NULL DEFAULT now(),
  CreatedByUserID uuid NOT NULL,
  Comment text,
  CONSTRAINT chartofaccounts_pkey PRIMARY KEY (AccountID),
  CONSTRAINT chartofaccounts_CreatedByUserID_fkey FOREIGN KEY (CreatedByUserID) REFERENCES public.profiles(id)
);
CREATE TABLE public.errormessages (
  ErrorID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  ErrorCode text NOT NULL UNIQUE,
  ErrorMessageText text NOT NULL,
  Severity text,
  CONSTRAINT errormessages_pkey PRIMARY KEY (ErrorID)
);
CREATE TABLE public.eventlogs (
  LogID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  UserID uuid,
  Timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ActionType text NOT NULL,
  TableName text NOT NULL,
  RecordID text,
  BeforeValue jsonb,
  AfterValue jsonb,
  CONSTRAINT eventlogs_pkey PRIMARY KEY (LogID),
  CONSTRAINT eventlogs_UserID_fkey FOREIGN KEY (UserID) REFERENCES public.profiles(id)
);
CREATE TABLE public.journalattachments (
  AttachmentID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  JournalEntryID bigint NOT NULL,
  FileName text NOT NULL,
  FilePath text NOT NULL,
  FileType text,
  FileSize bigint,
  UploadedByUserID uuid NOT NULL,
  UploadTimestamp timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT journalattachments_pkey PRIMARY KEY (AttachmentID),
  CONSTRAINT journalattachments_JournalEntryID_fkey FOREIGN KEY (JournalEntryID) REFERENCES public.journalentries(JournalEntryID),
  CONSTRAINT journalattachments_UploadedByUserID_fkey FOREIGN KEY (UploadedByUserID) REFERENCES public.profiles(id)
);
CREATE TABLE public.journalentries (
  JournalEntryID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  EntryDate date NOT NULL,
  Description text,
  Status text NOT NULL DEFAULT 'Pending'::text,
  IsAdjustingEntry boolean NOT NULL DEFAULT false,
  CreatedByUserID uuid NOT NULL,
  CreationDate timestamp with time zone NOT NULL DEFAULT now(),
  ApprovedByUserID uuid,
  ApprovalDate timestamp with time zone,
  RejectionReason text,
  CONSTRAINT journalentries_pkey PRIMARY KEY (JournalEntryID),
  CONSTRAINT journalentries_CreatedByUserID_fkey FOREIGN KEY (CreatedByUserID) REFERENCES public.profiles(id),
  CONSTRAINT journalentries_ApprovedByUserID_fkey FOREIGN KEY (ApprovedByUserID) REFERENCES public.profiles(id)
);
CREATE TABLE public.journalentrylines (
  LineID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  JournalEntryID bigint NOT NULL,
  AccountID bigint NOT NULL,
  Type text NOT NULL,
  Amount numeric NOT NULL,
  CONSTRAINT journalentrylines_pkey PRIMARY KEY (LineID),
  CONSTRAINT journalentrylines_JournalEntryID_fkey FOREIGN KEY (JournalEntryID) REFERENCES public.journalentries(JournalEntryID),
  CONSTRAINT journalentrylines_AccountID_fkey FOREIGN KEY (AccountID) REFERENCES public.chartofaccounts(AccountID)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  Username text NOT NULL UNIQUE,
  FirstName text NOT NULL,
  LastName text NOT NULL,
  ProfilePictureURL text,
  RoleID bigint NOT NULL,
  IsActive boolean NOT NULL DEFAULT true,
  DateCreated timestamp with time zone NOT NULL DEFAULT now(),
  DOB date,
  Address text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_RoleID_fkey FOREIGN KEY (RoleID) REFERENCES public.roles(RoleID)
);
CREATE TABLE public.registrationrequests (
  RequestID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  FirstName text NOT NULL,
  LastName text NOT NULL,
  Email text NOT NULL UNIQUE,
  RequestDate timestamp with time zone NOT NULL DEFAULT now(),
  Status text NOT NULL DEFAULT 'Pending'::text,
  ReviewedByUserID uuid,
  ReviewDate timestamp with time zone,
  DOB date,
  Address text,
  CONSTRAINT registrationrequests_pkey PRIMARY KEY (RequestID),
  CONSTRAINT registrationrequests_ReviewedByUserID_fkey FOREIGN KEY (ReviewedByUserID) REFERENCES public.profiles(id)
);
CREATE TABLE public.roles (
  RoleID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  RoleName text NOT NULL UNIQUE,
  CONSTRAINT roles_pkey PRIMARY KEY (RoleID)
);
CREATE TABLE public.securityquestions (
  questionid bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  questiontext text NOT NULL UNIQUE,
  CONSTRAINT securityquestions_pkey PRIMARY KEY (questionid)
);
CREATE TABLE public.signupinvitations (
  invitationid bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  requestid bigint NOT NULL,
  token text NOT NULL UNIQUE,
  expiresat timestamp with time zone NOT NULL,
  usedat timestamp with time zone,
  approveduserrole bigint,
  CONSTRAINT signupinvitations_pkey PRIMARY KEY (invitationid),
  CONSTRAINT signupinvitations_requestid_fkey FOREIGN KEY (requestid) REFERENCES public.registrationrequests(RequestID),
  CONSTRAINT signupinvitations_approveduserrole_fkey FOREIGN KEY (approveduserrole) REFERENCES public.roles(RoleID)
);
CREATE TABLE public.usersecurityanswers (
  useranswerid bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  userid uuid NOT NULL,
  questionid bigint NOT NULL,
  answerhash text NOT NULL,
  CONSTRAINT usersecurityanswers_pkey PRIMARY KEY (useranswerid),
  CONSTRAINT usersecurityanswers_userid_fkey FOREIGN KEY (userid) REFERENCES public.profiles(id),
  CONSTRAINT usersecurityanswers_questionid_fkey FOREIGN KEY (questionid) REFERENCES public.securityquestions(questionid)
);
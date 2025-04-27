declare global {
  interface OrganizationPrivateMetadata {
    automatedRepliesCount?: number;
    automatedRepliesLimitExceededAt?: string;
    freeTrialEndsAt?: string;
    trialExpiredNotificationSentAt?: string;
  }
}

// Why: single source of truth for the commit trailer Korca appends when the
// "Korca Attribution" toggle (`enableGitHubAttribution`) is on. Used by both
// the terminal git/gh shim and the AI commit-message generator so the two
// code paths agree on the exact string.

export const KORCA_GIT_COMMIT_TRAILER = 'Co-authored-by: Korca <help@stably.ai>'

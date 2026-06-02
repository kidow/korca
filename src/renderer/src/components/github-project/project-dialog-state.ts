type RepoBackedProjectDialogState = {
  repoId: string
}

type SlugProjectDialogState = {
  origin: {
    owner: string
    repo: string
  }
}

type RepoNotInKorcaDialogState = {
  owner: string
  repo: string
}

type LookupSlug = (slug: string) => readonly unknown[]

function hasRepoMatch(lookupSlug: LookupSlug, owner: string, repo: string): boolean {
  return lookupSlug(`${owner}/${repo}`).length > 0
}

export function resolveRepoBackedProjectDialogState<T extends RepoBackedProjectDialogState>(
  dialog: T | null,
  liveRepoIds: ReadonlySet<string>
): T | null {
  if (dialog && !liveRepoIds.has(dialog.repoId)) {
    return null
  }
  return dialog
}

export function resolveMissingRepoProjectDialogState<
  TSlugDialog extends SlugProjectDialogState,
  TRepoNotInKorca extends RepoNotInKorcaDialogState
>(args: {
  slugIndexReady: boolean
  slugDialog: TSlugDialog | null
  repoNotInKorca: TRepoNotInKorca | null
  lookupSlug: LookupSlug
}): {
  slugDialog: TSlugDialog | null
  repoNotInKorca: TRepoNotInKorca | null
} {
  const { lookupSlug, repoNotInKorca, slugDialog, slugIndexReady } = args
  if (!slugIndexReady) {
    return { slugDialog, repoNotInKorca }
  }
  return {
    slugDialog:
      slugDialog && hasRepoMatch(lookupSlug, slugDialog.origin.owner, slugDialog.origin.repo)
        ? null
        : slugDialog,
    repoNotInKorca:
      repoNotInKorca && hasRepoMatch(lookupSlug, repoNotInKorca.owner, repoNotInKorca.repo)
        ? null
        : repoNotInKorca
  }
}

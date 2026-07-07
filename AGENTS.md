# Agent Workflow

- Work one GitHub issue at a time.
- Use the branch named in the issue description unless the user says otherwise.
- Commit completed work in sensible, reviewable units instead of leaving changes uncommitted.
- Include the GitHub issue number in each commit message body, for example `Refs #123`, so commits appear on the issue page.
- Before committing, run the verification commands relevant to the issue scope.
- After an issue is implemented and verified, push the branch and open a pull request for that issue.
- Use the GitHub CLI (`gh`) for GitHub operations such as PR creation, PR lookup, issue lookup, and issue/PR updates.
- Keep user-provided local reference files out of commits unless the user explicitly asks to include them.

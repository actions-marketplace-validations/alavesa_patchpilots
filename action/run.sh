#!/usr/bin/env bash
set -euo pipefail

# Build CLI flags
FLAGS="--json --severity ${INPUT_SEVERITY}"
if [ -n "${INPUT_MODEL}" ]; then FLAGS="${FLAGS} --model ${INPUT_MODEL}"; fi
if [ -n "${INPUT_SKIP}" ]; then FLAGS="${FLAGS} --skip ${INPUT_SKIP}"; fi

echo "::group::Running PatchPilots audit"
echo "Model: ${INPUT_MODEL}"
echo "Severity: ${INPUT_SEVERITY}"
echo "Skip: ${INPUT_SKIP:-none}"
echo "Changed only: ${INPUT_CHANGED_ONLY:-false}"

# Determine target path
TARGET_PATH="${INPUT_PATH}"

if [ "${INPUT_CHANGED_ONLY}" = "true" ]; then
  # Get files changed in the PR
  BASE_SHA=$(jq -r '.pull_request.base.sha // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "")
  if [ -n "${BASE_SHA}" ]; then
    CHANGED_FILES=$(git diff --name-only "${BASE_SHA}"...HEAD -- "${INPUT_PATH}" 2>/dev/null | head -50 || echo "")
    if [ -n "${CHANGED_FILES}" ]; then
      # Create a temp directory with symlinks to changed files
      TMPDIR=$(mktemp -d)
      while IFS= read -r file; do
        if [ -f "${file}" ]; then
          mkdir -p "${TMPDIR}/$(dirname "${file}")"
          cp "${file}" "${TMPDIR}/${file}"
        fi
      done <<< "${CHANGED_FILES}"
      TARGET_PATH="${TMPDIR}"
      echo "Reviewing ${CHANGED_FILES_COUNT:-$(echo "${CHANGED_FILES}" | wc -l | tr -d ' ')} changed file(s)"
    else
      echo "::warning::No changed files found in ${INPUT_PATH} — reviewing all files"
    fi
  else
    echo "::warning::Could not determine base SHA — reviewing all files"
  fi
fi

echo "Path: ${TARGET_PATH}"

# Run patchpilots audit — JSON goes to stdout, logs to stderr
# shellcheck disable=SC2086
RESULT=$(patchpilots audit "${TARGET_PATH}" ${FLAGS} 2>/tmp/patchpilots-stderr.log) || true

echo "::endgroup::"

# If no output, show stderr for debugging and exit
if [ -z "${RESULT}" ] || ! echo "${RESULT}" | jq empty 2>/dev/null; then
  echo "::warning::PatchPilots produced no valid JSON output"
  if [ -f /tmp/patchpilots-stderr.log ]; then
    echo "::group::PatchPilots stderr output"
    cat /tmp/patchpilots-stderr.log
    echo "::endgroup::"
  fi
  exit 0
fi

# Clean up temp directory paths from changed_only mode
if [ -n "${TMPDIR:-}" ] && [ "${INPUT_CHANGED_ONLY}" = "true" ]; then
  RESULT=$(echo "${RESULT}" | sed "s|${TMPDIR}/||g")
fi

# Save raw JSON
echo "${RESULT}" > /tmp/patchpilots-result.json

# Format as markdown comment
COMMENT=$(node "${GITHUB_ACTION_PATH}/action/format-comment.cjs" /tmp/patchpilots-result.json)

# Post or update PR comment
PR_NUMBER=$(jq -r '.pull_request.number // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "")

if [ -n "${PR_NUMBER}" ]; then
  # Look for existing PatchPilots comment to update (avoid spam)
  EXISTING=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    --jq '.[] | select(.body | startswith("<!-- patchpilots-report -->")) | .id' \
    | head -1 || echo "")

  if [ -n "${EXISTING}" ]; then
    echo "Updating existing PatchPilots comment..."
    gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${EXISTING}" \
      -X PATCH -f body="${COMMENT}"
  else
    echo "Posting PatchPilots comment..."
    gh pr comment "${PR_NUMBER}" --body "${COMMENT}"
  fi
else
  echo "::warning::Not running in a PR context — printing results to log"
  echo "${COMMENT}"
fi

# Set outputs
TOTAL_FINDINGS=$(echo "${RESULT}" | jq -r '.totalFindings // 0')
TOTAL_PATCHES=$(echo "${RESULT}" | jq -r '.totalPatches // 0')
RISK_SCORE=$(echo "${RESULT}" | jq -r '.riskScore // "none"')

echo "total_findings=${TOTAL_FINDINGS}" >> "${GITHUB_OUTPUT}"
echo "total_patches=${TOTAL_PATCHES}" >> "${GITHUB_OUTPUT}"
echo "risk_score=${RISK_SCORE}" >> "${GITHUB_OUTPUT}"

# Fail on critical findings if configured
if [ "${INPUT_FAIL_ON_CRITICAL}" = "true" ]; then
  REVIEW_CRITICAL=$(echo "${RESULT}" | jq '[(.review.findings // [])[] | select(.severity == "critical")] | length')
  SECURITY_CRITICAL=$(echo "${RESULT}" | jq '[(.security.findings // [])[] | select(.severity == "critical")] | length')
  TOTAL_CRITICAL=$((REVIEW_CRITICAL + SECURITY_CRITICAL))

  if [ "${TOTAL_CRITICAL}" -gt 0 ]; then
    echo "::error::PatchPilots found ${TOTAL_CRITICAL} critical finding(s)"
    exit 1
  fi
fi

echo "PatchPilots audit complete: ${TOTAL_FINDINGS} findings, ${TOTAL_PATCHES} patches, risk=${RISK_SCORE}"

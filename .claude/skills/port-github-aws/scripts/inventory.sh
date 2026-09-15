#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: inventory.sh --source-repo OWNER/REPO --target-repo OWNER/REPO --source-profile PROFILE --target-profile PROFILE --source-region REGION --target-region REGION [--source-stack NAME] [--target-stack NAME]"
}

source_repo=''
target_repo=''
source_profile=''
target_profile=''
source_region=''
target_region=''
source_stack=''
target_stack=''

while (($# > 0)); do
  case "$1" in
    --source-repo) source_repo="${2:-}"; shift 2 ;;
    --target-repo) target_repo="${2:-}"; shift 2 ;;
    --source-profile) source_profile="${2:-}"; shift 2 ;;
    --target-profile) target_profile="${2:-}"; shift 2 ;;
    --source-region) source_region="${2:-}"; shift 2 ;;
    --target-region) target_region="${2:-}"; shift 2 ;;
    --source-stack) source_stack="${2:-}"; shift 2 ;;
    --target-stack) target_stack="${2:-}"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

for command in gh git aws; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }
done

for value in source_repo target_repo source_profile target_profile source_region target_region; do
  if [[ -z "${!value}" ]]; then
    echo "Missing required value: $value" >&2
    usage >&2
    exit 2
  fi
done

github_repo() {
  local label="$1"
  local repository="$2"
  echo
  echo "## GitHub $label: $repository"
  if ! gh repo view "$repository" --json nameWithOwner,url,visibility,defaultBranchRef,isArchived,isFork,viewerPermission,mergeCommitAllowed,rebaseMergeAllowed,squashMergeAllowed,deleteBranchOnMerge; then
    echo "Repository is absent or inaccessible: $repository"
    return
  fi
  echo "Protected branches:"
  gh api --paginate "repos/$repository/branches?protected=true" --jq '.[] | [.name, .commit.sha] | @tsv' || true
  echo "Repository rulesets:"
  gh api --paginate "repos/$repository/rulesets" --jq '.[] | [.id, .name, .target, .enforcement] | @tsv' || true
  echo "Actions variables:"
  gh variable list --repo "$repository" || true
  echo "Actions secret names:"
  gh secret list --repo "$repository" || true
  echo "Environments:"
  gh api --paginate "repos/$repository/environments" --jq '.environments[]? | [.name, .protection_rules[]?.type] | @tsv' || true
  echo "Actions permissions:"
  gh api "repos/$repository/actions/permissions" || true
}

aws_identity() {
  local label="$1"
  local profile="$2"
  local region="$3"
  local stack="$4"
  echo
  echo "## AWS $label: profile=$profile region=$region"
  aws sts get-caller-identity --profile "$profile" --region "$region" --output json
  echo "Tagged fullstack-ts foundation resources:"
  aws resourcegroupstaggingapi get-resources \
    --profile "$profile" \
    --region "$region" \
    --tag-filters Key=fullstack-ts:scope,Values=permanent-preview-foundation \
    --query 'ResourceTagMappingList[].{Arn:ResourceARN,Tags:Tags}' \
    --output json || true
  if [[ -n "$stack" ]]; then
    echo "CloudFormation stack: $stack"
    aws cloudformation describe-stacks \
      --profile "$profile" \
      --region "$region" \
      --stack-name "$stack" \
      --query 'Stacks[0].{StackId:StackId,StackStatus:StackStatus,TerminationProtection:EnableTerminationProtection,Parameters:Parameters,Outputs:Outputs,Tags:Tags}' \
      --output json
    aws cloudformation list-stack-resources \
      --profile "$profile" \
      --region "$region" \
      --stack-name "$stack" \
      --query 'StackResourceSummaries[].{LogicalId:LogicalResourceId,Type:ResourceType,PhysicalId:PhysicalResourceId,Status:ResourceStatus}' \
      --output json
  else
    echo "No stack name supplied; stack details were not enumerated."
  fi
}

echo "# Read-only GitHub and AWS port inventory"
echo "Generated at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "GitHub CLI principal:"
gh api user --jq '{login: .login, id: .id}'

github_repo source "$source_repo"
github_repo target "$target_repo"
aws_identity source "$source_profile" "$source_region" "$source_stack"
aws_identity target "$target_profile" "$target_region" "$target_stack"

echo
echo "Inventory complete. No GitHub or AWS mutations were requested."

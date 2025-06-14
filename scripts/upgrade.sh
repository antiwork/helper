#!/bin/bash

set -e

UPSTREAM_REPO="${UPSTREAM_REPO:-https://github.com/antiwork/helper.git}"
TEMP_DIR=$(mktemp -d)
UPGRADE_COMMIT_PREFIX="chore: upgrade from antiwork/helper"

cleanup() {
    echo "Cleaning up temporary directory..."
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this script from the root of your Helper repository."
    exit 1
fi

echo "🔍 Checking current repository status..."

# Check if there are any uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them before upgrading."
    exit 1
fi

# Find the last upgrade commit or init commit
LAST_UPGRADE_COMMIT=$(git log --oneline --grep="$UPGRADE_COMMIT_PREFIX" -n 1 --format="%H" 2>/dev/null || echo "")

if [ -n "$LAST_UPGRADE_COMMIT" ]; then
    echo "📅 Found previous upgrade commit: $LAST_UPGRADE_COMMIT"
    LAST_UPGRADE_DATE=$(git show -s --format="%ci" "$LAST_UPGRADE_COMMIT")
    echo "📅 Last upgrade date: $LAST_UPGRADE_DATE"
    
    # Extract the upstream commit hash from the upgrade commit message
    UPSTREAM_COMMIT=$(git show -s --format="%B" "$LAST_UPGRADE_COMMIT" | grep -o "upstream: [a-f0-9]\{40\}" | cut -d' ' -f2 || echo "")
    if [ -z "$UPSTREAM_COMMIT" ]; then
        echo "⚠️  Warning: Could not find upstream commit hash in last upgrade message. Using commit date instead."
        SINCE_DATE="$LAST_UPGRADE_DATE"
    else
        echo "📍 Last upstream commit: $UPSTREAM_COMMIT"
        SINCE_COMMIT="$UPSTREAM_COMMIT"
    fi
else
    echo "📅 No previous upgrade commits found. Looking for initial commit..."
    INIT_COMMIT=$(git log --oneline --reverse | head -n 1 | cut -d' ' -f1)
    INIT_DATE=$(git show -s --format="%ci" "$INIT_COMMIT")
    echo "📅 Initial commit: $INIT_COMMIT ($INIT_DATE)"
    SINCE_DATE="$INIT_DATE"
fi

echo "📥 Cloning upstream repository..."
git clone "$UPSTREAM_REPO" "$TEMP_DIR/upstream"
cd "$TEMP_DIR/upstream"

# Get the latest commit info from upstream
LATEST_COMMIT=$(git rev-parse HEAD)
LATEST_COMMIT_DATE=$(git show -s --format="%ci" HEAD)
echo "📍 Latest upstream commit: $LATEST_COMMIT ($LATEST_COMMIT_DATE)"

# Generate patch of changes since last upgrade
echo "🔄 Generating patch of changes since last upgrade..."
if [ -n "$SINCE_COMMIT" ]; then
    # Use commit range if we have the exact commit
    COMMIT_COUNT=$(git rev-list --count "$SINCE_COMMIT..HEAD")
    if [ "$COMMIT_COUNT" -eq 0 ]; then
        echo "✅ Repository is already up to date!"
        exit 0
    fi
    echo "📊 Found $COMMIT_COUNT new commits to apply"
    git format-patch "$SINCE_COMMIT..HEAD" --stdout > "$TEMP_DIR/upgrade.patch"
else
    # Use date range if we only have the date
    COMMIT_COUNT=$(git rev-list --count --since="$SINCE_DATE" HEAD)
    if [ "$COMMIT_COUNT" -eq 0 ]; then
        echo "✅ Repository is already up to date!"
        exit 0
    fi
    echo "📊 Found $COMMIT_COUNT commits since last upgrade"
    git format-patch --since="$SINCE_DATE" --stdout > "$TEMP_DIR/upgrade.patch"
fi

# Go back to the original repository
cd - > /dev/null

# Apply the patch
echo "🎯 Applying upstream changes..."
if git apply --3way "$TEMP_DIR/upgrade.patch"; then
    echo "✅ Patch applied successfully"
else
    echo "⚠️  Patch application had conflicts. Please resolve them manually."
    echo "After resolving conflicts, run: git add . && git commit"
    echo "Use this commit message:"
    echo "$UPGRADE_COMMIT_PREFIX to $LATEST_COMMIT ($(date -I)) - upstream: $LATEST_COMMIT"
    exit 1
fi

# Stage all changes
git add .

# Check if there are any changes to commit
if git diff-index --quiet --cached HEAD --; then
    echo "✅ No changes to commit - repository is already up to date!"
    exit 0
fi

# Commit the changes
COMMIT_MESSAGE="$UPGRADE_COMMIT_PREFIX to $LATEST_COMMIT ($(date -I)) - upstream: $LATEST_COMMIT"
echo "💾 Committing upgrade..."
git commit -m "$COMMIT_MESSAGE"

echo "✅ Upgrade completed successfully!"
echo "📋 Summary:"
echo "   • Upgraded to upstream commit: $LATEST_COMMIT"
echo "   • Applied $COMMIT_COUNT commits"

# Generate GitHub diff link
if [ -n "$SINCE_COMMIT" ]; then
    DIFF_URL="https://github.com/antiwork/helper/compare/$SINCE_COMMIT...$LATEST_COMMIT"
else
    # If we used date-based search, show commits from a reasonable timeframe
    DIFF_URL="https://github.com/antiwork/helper/commits/main"
fi
echo "   • View changes: $DIFF_URL"

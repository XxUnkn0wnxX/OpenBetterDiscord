#!/usr/bin/env zsh

set -euo pipefail

if [[ "$OSTYPE" != darwin* ]]; then
    echo "This wrapper supports macOS only; use the Bun scripts on other platforms." >&2
    exit 1
fi

repo_dir="${0:A:h}"
cd "$repo_dir"

usage() {
    print -r -- "Usage: ./local-build.zsh [release|dev|dist|build|production|pack] [options]"
    print -r -- ""
    print -r -- "Modes:"
    print -r -- "  dev, dist   Build unpacked development files"
    print -r -- "  build       Alias for dev"
    print -r -- "  production  Build minified production files"
    print -r -- "  pack        Pack the existing dist files"
    print -r -- "  release     Build and stage the release ASAR (default)"
    print -r -- ""
    print -r -- "Options:"
    print -r -- "  --macos-recovery-timeout-seconds <seconds>  Build-time recovery timeout (dev: 90, release: 45)"
    print -r -- "  -mrts <seconds>                              Alias for the recovery timeout option"
    print -r -- "  --dry-run                                   Print the command without running it"
    print -r -- "  -h, --help                                  Show this help"
    print -r -- ""
    print -r -- "Examples:"
    print -r -- "  ./local-build.zsh"
    print -r -- "  ./local-build.zsh build --module=betterdiscord"
    print -r -- "  ./local-build.zsh -mrts 45"
    print -r -- "  ./local-build.zsh --macos-recovery-timeout-seconds 45"
    print -r -- "  ./local-build.zsh release --macos-recovery-timeout-seconds 45"
}

for argument in "$@"; do
    if [[ "$argument" = "-h" || "$argument" = "--help" ]]; then
        usage
        exit 0
    fi
done

dry_run=false
normalized_args=()
for argument in "$@"; do
    if [[ "$argument" = "--dry-run" ]]; then
        dry_run=true
    elif [[ "$argument" = "-mrts" ]]; then
        normalized_args+=("--macos-recovery-timeout-seconds")
    else
        normalized_args+=("$argument")
    fi
done
set -- "${normalized_args[@]}"

mode="release"
if [[ $# -gt 0 && "$1" != --* ]]; then
    mode="$1"
    shift
fi

case "$mode" in
    build|dev|dist)
        command=(bun scripts/build.ts "$@")
        ;;
    production)
        command=(bun scripts/build.ts --minify "$@")
        ;;
    pack)
        command=(bun scripts/pack.ts)
        ;;
    release)
        command=(bun scripts/dist.ts "$@")
        ;;
    *)
        usage >&2
        exit 1
        ;;
esac

if [[ "$dry_run" == true ]]; then
    print -n -r -- "Dry-run: "
    [[ "$mode" == "production" ]] && print -n -r -- "NODE_ENV=production "
    printf '%q ' "${command[@]}"
    print
elif [[ "$mode" == "production" ]]; then
    NODE_ENV=production "${command[@]}"
else
    "${command[@]}"
fi

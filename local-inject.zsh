#!/usr/bin/env zsh

set -euo pipefail

if [[ "$OSTYPE" != darwin* ]]; then
    echo "This wrapper supports macOS only; use the Bun scripts on other platforms." >&2
    exit 1
fi

repo_dir="${0:A:h}"
cd "$repo_dir"

dry_run=false
positional=()
for argument in "$@"; do
    if [[ "$argument" == "--dry-run" ]]; then
        dry_run=true
    else
        positional+=("$argument")
    fi
done

target="${positional[1]:-}"
inject_mode="${positional[2]:-release}"

if [[ "${#positional[@]}" -gt 2 ]]; then
    echo "Usage: ./local-inject.zsh [stable|ptb|canary] [release|dev|dist] [--dry-run]"
    exit 1
fi

if [[ -z "$target" ]]; then
    echo "Select Discord channel to inject:"
    echo "  1) stable"
    echo "  2) ptb"
    echo "  3) canary"
    printf "Choice [1-3]: "
    read -r selection

    case "$selection" in
        1|stable)
            target="stable"
            ;;
        2|ptb)
            target="ptb"
            ;;
        3|canary)
            target="canary"
            ;;
        *)
            echo "Invalid selection."
            exit 1
            ;;
    esac
fi

case "$inject_mode" in
    release|dev)
        ;;
    dist)
        inject_mode="dev"
        ;;
    *)
        echo "Usage: ./local-inject.zsh [stable|ptb|canary] [release|dev|dist] [--dry-run]"
        exit 1
        ;;
esac

case "$target" in
    stable|discord)
        app_name="Discord"
        inject_target=""
        ;;
    ptb)
        app_name="Discord PTB"
        inject_target="ptb"
        ;;
    canary)
        app_name="Discord Canary"
        inject_target="canary"
        ;;
    *)
        echo "Usage: ./local-inject.zsh [stable|ptb|canary] [release|dev|dist] [--dry-run]"
        exit 1
        ;;
esac

inject_args=("$inject_mode" "$target")
[[ "$dry_run" == true ]] && inject_args+=("--dry-run")
bun scripts/inject.ts "${inject_args[@]}"

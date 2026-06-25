#!/usr/bin/env bash
set -euo pipefail

MAX_PHASES=3
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-phases)
      MAX_PHASES="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

echo "GSD_AUTONOMY_LOOP: recon"
scripts/gsd-autonomous --recon

PHASES="$(scripts/gsd-autonomous --next-open --max "$MAX_PHASES")"

if [[ -z "$PHASES" ]]; then
  echo "GSD_AUTONOMY_LOOP: no ABIERTA_REAL phases"
  exit 0
fi

while IFS= read -r phase; do
  [[ -z "$phase" ]] && continue

  if [[ "$DRY_RUN" -eq 1 ]]; then
    scripts/gsd-autonomous --only "$phase" --dry-run
  else
    scripts/gsd-autonomous --only "$phase"
  fi
done <<< "$PHASES"

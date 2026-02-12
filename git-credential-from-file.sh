#!/bin/bash
# Git credential helper: lee usuario y token desde CREDENCIALES_GIT.txt
# Uso: git config credential.helper '!ruta/absoluta/a/git-credential-from-file.sh'

while read -r line; do
  [[ "$line" == "host="* ]] && host="${line#host=}"
done

if [[ "$host" != "github.com" ]]; then
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRED_FILE="$SCRIPT_DIR/CREDENCIALES_GIT.txt"
if [[ -f "$HOME/.github-creds" ]]; then
  CRED_FILE="$HOME/.github-creds"
elif [[ ! -f "$CRED_FILE" ]]; then
  exit 0
fi

while IFS= read -r line; do
  [[ "$line" =~ ^GITHUB_USER= ]] && GITHUB_USER="${line#GITHUB_USER=}"
  [[ "$line" =~ ^GITHUB_TOKEN= ]] && GITHUB_TOKEN="${line#GITHUB_TOKEN=}"
done < "$CRED_FILE"

if [[ -n "$GITHUB_USER" && -n "$GITHUB_TOKEN" ]]; then
  echo "username=$GITHUB_USER"
  echo "password=$GITHUB_TOKEN"
fi

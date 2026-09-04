#!/bin/bash
# 74 — BUILD APK AUTOMATISÉ (à lancer après `npm i -g eas-cli` + `eas login`)
# Usage : bash scripts/buildAPK.sh
set -e
echo "📦 Build APK LEX ACADEMY (EAS Build)..."
echo "Préreufs (une seule fois) : npm install -g eas-cli && eas login"
eas build -p android --profile production --non-interactive
echo "✅ Lien de téléchargement de l'APK fourni par Expo à la fin."
echo "Distribue-le par Bluetooth, clé USB ou WhatsApp — et active l'OTA (n°67) pour les mises à jour."

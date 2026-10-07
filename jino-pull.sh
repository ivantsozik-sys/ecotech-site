#!/bin/sh
# ЭКОТЕХ — обновление сайта на хостинге Джино из GitHub.
# Запускается заданием по расписанию на Джино (раз в 5 минут).
# Забирает ветку deploy (её собирает GitHub Actions только после успешной проверки сайта)
# и раскладывает файлы в каталог сайта. Файлы на сервере не удаляются.
#
# Задание по расписанию (cp.jino.ru → Управление → Задания по расписанию), одной строкой:
#   mkdir -p $HOME/ecotech-pull && curl -fsS --max-time 30 -o $HOME/ecotech-pull/pull.sh https://raw.githubusercontent.com/ivantsozik-sys/ecotech-site/deploy/jino-pull.sh && sh $HOME/ecotech-pull/pull.sh
#
# Журнал: ~/ecotech-pull/pull.log (последние 500 строк).

set -eu

REPO="ivantsozik-sys/ecotech-site"
BRANCH="deploy"
SITE_DIR="${SITE_DIR:-$HOME/domains/ecotechnew.ru}"
WORK="$HOME/ecotech-pull"
STATE="$WORK/current.txt"
LOG="$WORK/pull.log"
LOCK="$WORK/lock"
TMP="$WORK/tmp"

mkdir -p "$WORK"
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 500 ]; then
  tail -n 400 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
exec >>"$LOG" 2>&1

ts() { date '+%Y-%m-%d %H:%M:%S'; }

# Защита от одновременного запуска; зависшая блокировка снимается через 30 минут
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +30 2>/dev/null)" ]; then
    rm -rf "$LOCK"; mkdir "$LOCK"
  else
    exit 0
  fi
fi
trap 'rm -rf "$LOCK" "$TMP"' EXIT

if [ ! -d "$SITE_DIR" ]; then
  echo "$(ts) ОШИБКА: нет каталога сайта $SITE_DIR — укажите SITE_DIR в задании"
  exit 1
fi

# 1. Какая версия опубликована на GitHub
REMOTE=$(curl -fsS --max-time 30 "https://raw.githubusercontent.com/$REPO/$BRANCH/version.txt?t=$(date +%s)" | head -n 1 | tr -cd '0-9a-f') || {
  echo "$(ts) нет связи с GitHub, повтор в следующий запуск"; exit 0; }
[ -n "$REMOTE" ] || { echo "$(ts) пустой version.txt, пропуск"; exit 0; }

LOCAL=$(cat "$STATE" 2>/dev/null || true)
[ "$REMOTE" = "$LOCAL" ] && exit 0

# 2. Скачать и распаковать ветку deploy
rm -rf "$TMP"; mkdir -p "$TMP"
curl -fsSL --max-time 120 "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" -o "$TMP/deploy.tgz"
tar -xzf "$TMP/deploy.tgz" -C "$TMP"
SRC=$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n 1)

GOT=$(head -n 1 "$SRC/version.txt" 2>/dev/null | tr -cd '0-9a-f')
if [ "$GOT" != "$REMOTE" ]; then
  echo "$(ts) архив GitHub ещё не обновился (${GOT:-пусто} вместо $REMOTE), повтор в следующий запуск"
  exit 0
fi
if [ ! -f "$SRC/site/index.html" ]; then
  echo "$(ts) ОШИБКА: в архиве нет site/index.html, публикация отменена"
  exit 1
fi

# 3. Разложить файлы в каталог сайта
cp -R "$SRC/site/." "$SITE_DIR/"
echo "$REMOTE" > "$STATE"
echo "$(ts) опубликована версия $REMOTE"

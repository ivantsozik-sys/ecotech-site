<?php
/* ЭКОТЕХ · приём заявки с международной версии сайта (v1.2, 13.10.2026).
   Ничего не сохраняет на сервере: письмо уходит на info@ecotechnew.ru, вложение — только в письме. */
declare(strict_types=1);
date_default_timezone_set('Europe/Moscow');
const TO = 'info@ecotechnew.ru';
const FROM = 'info@ecotechnew.ru';
const MAX_FILE = 10485760; // 10 МБ
const EXT = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
function done(bool $ok, string $msg, int $code = 200): void {
    global $wantsJson;
    http_response_code($code);
    header('Cache-Control: no-store');
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'msg' => $msg], JSON_UNESCAPED_UNICODE);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        $back = htmlspecialchars($_SERVER['HTTP_REFERER'] ?? '/global/ru/', ENT_QUOTES);
        $t = $ok ? 'Заявка принята. Спасибо! / Request received. Thank you!' : 'Заявка не отправлена / Request not sent: ' . htmlspecialchars($msg, ENT_QUOTES);
        echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ЭКОТЕХ</title><link rel="stylesheet" href="/global/assets/css/tokens.css"><link rel="stylesheet" href="/global/assets/css/intl.css"></head>'
           . '<body class="chooser"><main class="chooser-in"><h1>ЭКОТЕХ</h1><p>' . $t . '</p><p><a href="' . $back . '">← Назад / Back</a> · <a href="mailto:info@ecotechnew.ru">info@ecotechnew.ru</a> · <a href="tel:+79162788784">+7 916 278-87-84</a></p></main></body></html>';
    }
    exit;
}
function field(string $k, int $max): string {
    $v = trim((string)($_POST[$k] ?? ''));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}
function hdr(string $s): string { return '=?UTF-8?B?' . base64_encode(str_replace(["\r", "\n"], ' ', $s)) . '?='; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') done(false, 'POST only', 405);
if (field('website', 200) !== '') done(true, 'ok');                       // ловушка для ботов
$ts = (int)field('ts', 20);
if ($ts > 0 && (time() - intdiv($ts, 1000)) < 3) done(false, 'too fast', 429);

$name = field('name', 200); $org = field('org', 300); $contact = field('contact', 200);
$task = field('task', 5000); $topic = field('topic', 200); $source = field('source', 200);
$flow = field('flow', 100); $lang = preg_replace('/[^a-z]/', '', field('lang', 5)) ?: 'ru';
if ($name === '' || $contact === '' || $task === '' || empty($_POST['consent'])) done(false, 'required fields', 400);

$body = "Новая заявка с сайта ecotechnew.ru/global/{$lang}/\n\n"
      . "Что очищаем: {$source}\nТема: {$topic}\nРасход, м³/ч: " . ($flow !== '' ? $flow : '—') . "\n\n"
      . "Имя: {$name}\nОрганизация и страна: {$org}\nКонтакт: {$contact}\n\nЗадача:\n{$task}\n\n"
      . "Согласие на обработку персональных данных: да\nДата: " . date('d.m.Y H:i') . " (МСК)\nIP: " . ($_SERVER['REMOTE_ADDR'] ?? '') . "\n";

$file = $_FILES['file'] ?? null;
$hasFile = $file && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
if ($hasFile) {
    if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > MAX_FILE) done(false, 'file too large', 413);
    $ext = strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, EXT, true)) done(false, 'file type', 415);
}

$headers = ['From: ' . hdr('Сайт ЭКОТЕХ') . ' <' . FROM . '>', 'MIME-Version: 1.0'];
if (filter_var($contact, FILTER_VALIDATE_EMAIL)) $headers[] = 'Reply-To: ' . $contact;
$subject = hdr('Заявка ЭКОТЕХ · ' . ($source ?: $topic) . ' · ' . $name);

if ($hasFile) {
    $b = 'b' . bin2hex(random_bytes(12));
    $headers[] = 'Content-Type: multipart/mixed; boundary="' . $b . '"';
    $safe = preg_replace('/[^\w.\-]+/u', '_', (string)$file['name']) ?: 'analysis.' . $ext;
    $msg = "--{$b}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($body))
         . "--{$b}\r\nContent-Type: application/octet-stream; name=\"" . hdr($safe) . "\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"" . hdr($safe) . "\"\r\n\r\n"
         . chunk_split(base64_encode((string)file_get_contents($file['tmp_name']))) . "--{$b}--";
} else {
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'Content-Transfer-Encoding: base64';
    $msg = chunk_split(base64_encode($body));
}
$ok = @mail(TO, $subject, $msg, implode("\r\n", $headers), '-f' . FROM);
$ok ? done(true, 'ok') : done(false, 'mail failed', 500);

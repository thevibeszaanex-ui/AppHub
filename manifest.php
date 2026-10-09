<?php

require_once __DIR__ . '/api/common.php';

header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    $appId = isset($_GET['app']) ? (string) $_GET['app'] : '';
    $app = null;
    if ($appId !== '') {
        foreach (apphub_read_apps() ?: array() as $candidate) {
            if (isset($candidate['id']) && (string) $candidate['id'] === $appId) {
                $app = $candidate;
                break;
            }
        }
    }

    $scriptPath = isset($_SERVER['SCRIPT_NAME']) ? str_replace('\\', '/', $_SERVER['SCRIPT_NAME']) : '/manifest.php';
    $basePath = rtrim(dirname($scriptPath), '/');
    $basePath = $basePath === '' ? '' : $basePath;
    $name = $app !== null && !empty($app['name']) ? (string) $app['name'] : 'AppHub Studio';
    $shortName = function_exists('mb_substr') ? mb_substr($name, 0, 12, 'UTF-8') : substr($name, 0, 12);
    $startUrl = $basePath . '/index.html';
    $manifestId = $basePath . '/';
    $icons = array();

    if ($app !== null) {
        $encodedId = rawurlencode((string) $app['id']);
        $startUrl .= '?app=' . $encodedId;
        $manifestId .= '?app=' . $encodedId;

        $iconPath = '';
        if (!empty($app['adminImage'])) {
            $iconPath = (string) $app['adminImage'];
        } elseif (!empty($app['iconImage'])) {
            $iconPath = (string) $app['iconImage'];
        }

        $uploadUrlPrefix = $basePath . '/uploads/';
        if (strpos($iconPath, $uploadUrlPrefix) === 0) {
            $relativeIconPath = substr($iconPath, strlen($basePath));
        } else {
            $relativeIconPath = '';
        }

        if (preg_match('/^\/uploads\/[a-f0-9]{32}\.(?:png|jpg|webp)$/', $relativeIconPath)) {
            $imageInfo = @getimagesize(__DIR__ . $relativeIconPath);
            $mimeType = $imageInfo !== false && isset($imageInfo['mime']) ? $imageInfo['mime'] : '';
            $width = $imageInfo !== false ? (int) $imageInfo[0] : 0;
            $height = $imageInfo !== false ? (int) $imageInfo[1] : 0;
            if ($width > 0 && $height > 0 && in_array($mimeType, array('image/png', 'image/jpeg', 'image/webp'), true)) {
                $icons[] = array(
                    'src' => $iconPath,
                    'sizes' => $width . 'x' . $height,
                    'type' => $mimeType,
                    'purpose' => 'any'
                );
            }
        }
    }

    echo json_encode(array(
        'id' => $manifestId,
        'name' => $name,
        'short_name' => $shortName,
        'description' => 'Aplicativo disponível na AppHub Studio.',
        'start_url' => $startUrl,
        'scope' => $basePath . '/',
        'display' => 'standalone',
        'background_color' => '#030712',
        'theme_color' => '#090d16',
        'icons' => $icons
    ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);
} catch (Throwable $error) {
    error_log('AppHub manifest error: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(array('error' => 'Não foi possível carregar os dados do aplicativo.'));
}

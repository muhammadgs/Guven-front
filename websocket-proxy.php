<?php
// websocket-proxy.php

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// OPTIONS request üçün
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// WebSocket upgrade request-i yoxla
$isWebSocket = isset($_SERVER['HTTP_UPGRADE']) &&
               strtolower($_SERVER['HTTP_UPGRADE']) === 'websocket';

if ($isWebSocket) {
    handleWebSocket();
} else {
    handleHttpRequest();
}

// ==================== FUNKSİYALAR ====================

function handleWebSocket() {
    $userId = extractUserId();
    $companyId = extractCompanyId();

    if (!$userId || !$companyId) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID və ya Company ID tapılmadı']);
        exit();
    }

    // Backend WebSocket URL
    $backendHost = 'vps.guvenfinans.az';
    $backendPort = 8008;
    $backendPath = "/api/v1/ws/notifications/{$userId}/{$companyId}";

    echo "🔌 WebSocket Proxy: {$userId}/{$companyId}\n";
    echo "📡 Backend: {$backendHost}:{$backendPort}\n";

    // WebSocket proxy etmək üçün 3 yanaşma:

    // 1. Redirect et (ən sadə)
    header("HTTP/1.1 301 Moved Permanently");
    header("Location: ws://{$backendHost}:{$backendPort}{$backendPath}");
    exit();

    // 2. Və ya WebSocket bağlantısını frontend-ə tövsiyə et
    // echo json_encode([
    //     'ws_url' => "ws://{$backendHost}:{$backendPort}{$backendPath}",
    //     'user_id' => $userId,
    //     'company_id' => $companyId,
    //     'message' => 'Frontend birbaşa bu URL-ə qoşulmalıdır'
    // ]);
}

function handleHttpRequest() {
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'] ?? '/';
    $query = $_SERVER['QUERY_STRING'] ?? '';

    echo "📨 HTTP Request: {$method} {$path}\n";
    echo "🔧 Bu WebSocket proxy-dir, normal HTTP request-lər üçün proxy.php istifadə edin.\n";

    http_response_code(400);
    echo json_encode([
        'error' => 'Bu endpoint yalnız WebSocket üçündür',
        'note' => 'Normal API sorğuları üçün proxy.php istifadə edin'
    ]);
}

function extractUserId() {
    // URL-dən user_id çıxart
    $path = $_SERVER['REQUEST_URI'] ?? '';

    // Pattern: /websocket-proxy.php/api/v1/ws/notifications/{user_id}/{company_id}
    $pattern = '/notifications\/(\d+)\/(\d+)/';

    if (preg_match($pattern, $path, $matches)) {
        return $matches[1]; // user_id
    }

    // Query param-dan yoxla
    if (isset($_GET['user_id'])) {
        return $_GET['user_id'];
    }

    // Header-dan yoxla
    $headers = getallheaders();
    if (isset($headers['X-User-Id'])) {
        return $headers['X-User-Id'];
    }

    return null;
}

function extractCompanyId() {
    // URL-dən company_id çıxart
    $path = $_SERVER['REQUEST_URI'] ?? '';

    // Pattern: /websocket-proxy.php/api/v1/ws/notifications/{user_id}/{company_id}
    $pattern = '/notifications\/(\d+)\/(\d+)/';

    if (preg_match($pattern, $path, $matches)) {
        return $matches[2]; // company_id
    }

    // Query param-dan yoxla
    if (isset($_GET['company_id'])) {
        return $_GET['company_id'];
    }

    // Header-dan yoxla
    $headers = getallheaders();
    if (isset($headers['X-Company-Id'])) {
        return $headers['X-Company-Id'];
    }

    return null;
}

// WebSocket handshake emal etmək
function performWebSocketHandshake($secWebSocketKey, $host, $port, $path) {
    $key = base64_encode(sha1($secWebSocketKey . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true));

    $headers = "HTTP/1.1 101 Switching Protocols\r\n";
    $headers .= "Upgrade: websocket\r\n";
    $headers .= "Connection: Upgrade\r\n";
    $headers .= "Sec-WebSocket-Accept: $key\r\n";
    $headers .= "\r\n";

    return $headers;
}
?>
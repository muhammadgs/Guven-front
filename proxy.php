<?php
// proxy.php - HƏM 8008, HƏM 8010 PORTLARINA YÖNLƏNDİRMƏ
// ==================== ✅ OPTIONS SORĞULARINI TUT (ƏN YUXARIDA) ====================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}

// ==================== CORS BAŞLIQLARI ====================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// ==================== KONFİQURASİYA ====================
$targets = [
    'main' => 'http://vps.guvenfinans.az:8008',
    'telegram' => 'http://vps.guvenfinans.az:8010',
    'onec' => 'http://vps.guvenfinans.az:8020'
];

// Default olaraq əsas backend
$target_base = $targets['main'];

// ==================== ENDPOINT-Ə GÖRƏ PORT SEÇİMİ ====================
$request_uri = $_SERVER['REQUEST_URI'];

// /proxy.php hissəsini sil
if (strpos($request_uri, '/proxy.php') === 0) {
    $path = substr($request_uri, strlen('/proxy.php'));
} else {
    $path = $request_uri;
}

// Sorgu parametrlərini ayır
$query_pos = strpos($path, '?');
if ($query_pos !== false) {
    $path = substr($path, 0, $query_pos);
}

$path_lower = strtolower($path);

// 1C Bridge endpoint-ləri
$onec_patterns = [
    '/products',
    '/customers',
    '/multi-baza',
    '/auto-sync',
    '/sync',
    '/orders',
    '/bank-accounts',      // ✅ yeni
    '/cash-desks',         // ✅ yeni
    '/warehouses',         // ✅ yeni
    '/units-of-measure',   // ✅ yeni
    '/product-groups'      // ✅ yeni
];foreach ($onec_patterns as $pattern) {
    if (strpos($path_lower, $pattern) !== false) {
        $target_base = $targets['onec'];
        error_log("🏭 1C BRIDGE: $path -> port 8020");
        break;
    }
}

error_log("🎯 Using target: $target_base for path: $path");

// Full URL yarat (BİR DƏFƏ)
$url = $target_base . $path;
if ($_SERVER['QUERY_STRING']) {
    $url .= '?' . $_SERVER['QUERY_STRING'];
}

// Gələn request-i al
$method = $_SERVER['REQUEST_METHOD'];

// DEBUG: FormData varsa log et
error_log("PROXY DEBUG - Method: $method, Path: $path, Target: $target_base, URL: $url");

// Headers hazırla
$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) === 'host') continue;
    if (strtolower($key) === 'content-length') continue;
    $headers[] = "$key: $value";
}

// Əlavə headers
$headers[] = "X-Forwarded-For: " . $_SERVER['REMOTE_ADDR'];
$headers[] = "X-Real-IP: " . $_SERVER['REMOTE_ADDR'];

// Cookie-ləri göndər
$cookies = '';
foreach ($_COOKIE as $key => $value) {
    $cookies .= $key . '=' . rawurlencode($value) . '; ';
}
if ($cookies) {
    $headers[] = "Cookie: " . rtrim($cookies, '; ');
}

// cURL session
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// ============ FORMDATA FIX ============
if ($method === 'POST' && (!empty($_FILES) || !empty($_POST))) {
    $postData = [];

    if (!empty($_FILES)) {
        foreach ($_FILES as $key => $file) {
            if (file_exists($file['tmp_name']) && $file['error'] === UPLOAD_ERR_OK) {
                $postData[$key] = new CURLFile(
                    $file['tmp_name'],
                    $file['type'],
                    $file['name']
                );
            }
        }
    }

    if (!empty($_POST)) {
        foreach ($_POST as $key => $value) {
            $postData[$key] = $value;
        }
    }

    if (!empty($postData)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        $headers = array_filter($headers, function($header) {
            return stripos($header, 'Content-Type:') === false;
        });
    }
} else {
    $input = file_get_contents('php://input');
    if ($input && in_array($method, ['POST', 'PUT', 'PATCH'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
        if (!empty($input) && json_decode($input) !== null) {
            $headers[] = "Content-Type: application/json";
            $headers[] = "Content-Length: " . strlen($input);
        }
    }
}
// ============ FORMDATA FIX SONU ============

if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$curl_info = curl_getinfo($ch);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    error_log("CURL Error: $curl_error");
    http_response_code(500);
    echo json_encode(['error' => 'Proxy error: ' . $curl_error]);
    exit;
}

$header_size = $curl_info['header_size'];
$response_headers = substr($response, 0, $header_size);
$response_body = substr($response, $header_size);

$header_lines = explode("\r\n", $response_headers);

foreach ($header_lines as $header_line) {
    if (stripos($header_line, 'Set-Cookie:') === 0) {
        $cookie_header = substr($header_line, strlen('Set-Cookie:'));
        $cookie_parts = explode(';', $cookie_header, 2);
        $cookie_pair = trim($cookie_parts[0]);

        $equals_pos = strpos($cookie_pair, '=');
        if ($equals_pos !== false) {
            $cookie_name = substr($cookie_pair, 0, $equals_pos);
            $cookie_value = substr($cookie_pair, $equals_pos + 1);

            setcookie(
                $cookie_name,
                $cookie_value,
                [
                    'expires' => time() + 86400 * 7,
                    'path' => '/',
                    'domain' => '.guvenfinans.az',
                    'secure' => true,
                    'httponly' => true,
                    'samesite' => 'Lax'
                ]
            );
        }
    }
}

http_response_code($curl_info['http_code']);

foreach ($header_lines as $header_line) {
    if (empty(trim($header_line))) continue;
    if (stripos($header_line, 'Set-Cookie:') === 0) continue;
    header($header_line);
}

echo $response_body;
?>
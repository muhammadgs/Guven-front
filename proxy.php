<?php
// ==================== ✅ OPTIONS SORĞULARINI TUT ====================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Request-ID');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
    http_response_code(200);
    exit;
}

// ==================== CORS BAŞLIQLARI ====================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Request-ID');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

// ==================== PATH HESABLA ====================
$request_uri = $_SERVER['REQUEST_URI'];
if (strpos($request_uri, '/proxy.php') === 0) {
    $path = substr($request_uri, strlen('/proxy.php'));
} else {
    $path = $request_uri;
}

$query_pos = strpos($path, '?');
if ($query_pos !== false) {
    $path = substr($path, 0, $query_pos);
}

if ($path === '/api/v1/taxpayer/lookup' && $_SERVER['REQUEST_METHOD'] === 'POST') {

    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $tin  = preg_replace('/\D/', '', (string)($data['tin'] ?? ''));

    if (strlen($tin) !== 10) {
        http_response_code(400);
        echo json_encode(['error' => 'VOEN 10 reqem olmalidir', 'received' => $tin]);
        exit;
    }

    // ✅ Düzgün payload
    $payload = json_encode([
        'tin'             => $tin,
        'type'            => 'legalEntity',
        'serviceCode'     => 'checkLegalName',
        'isStateRegistry' => true
    ]);

    $ch = curl_init('https://new.e-taxes.gov.az/api/po/authless/public/v1/authless/findTaxpayer');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json, text/plain, */*',
            'Accept-Language: az-AZ,az;q=0.9,en-US;q=0.8',
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin: https://new.e-taxes.gov.az',
            'Referer: https://new.e-taxes.gov.az/etaxes/services/legal-entity-info',
            'Sec-Fetch-Dest: empty',
            'Sec-Fetch-Mode: cors',
            'Sec-Fetch-Site: same-origin',
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_ENCODING       => '',
    ]);

    $response  = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err       = curl_error($ch);
    curl_close($ch);

    if ($err) {
        http_response_code(502);
        echo json_encode(['error' => $err]);
        exit;
    }

    http_response_code($http_code);
    echo $response ?: '{}';
    exit;
}

// ==================== QALAN SORĞULAR ÜÇÜN PROXY ====================
$targets = [
    'main' => 'http://vps.guvenfinans.az:8008',
    'telegram' => 'http://vps.guvenfinans.az:8010',
    'onec' => 'http://vps.guvenfinans.az:8020'
];

$target_base = $targets['main'];

// 1C endpoint-ləri
$path_lower = strtolower($path);
$onec_patterns = ['/products', '/customers', '/multi-baza', '/auto-sync', '/sync', '/orders', '/bank-accounts', '/cash-desks', '/warehouses', '/units-of-measure', '/product-groups'];

foreach ($onec_patterns as $pattern) {
    if (strpos($path_lower, $pattern) !== false) {
        $target_base = $targets['onec'];
        break;
    }
}

$url = $target_base . $path;
if ($_SERVER['QUERY_STRING']) {
    $url .= '?' . $_SERVER['QUERY_STRING'];
}

$method = $_SERVER['REQUEST_METHOD'];

// Headers
$headers = [];
foreach (getallheaders() as $key => $value) {
    if (strtolower($key) === 'host') continue;
    if (strtolower($key) === 'content-length') continue;
    $headers[] = "$key: $value";
}
$headers[] = "X-Forwarded-For: " . $_SERVER['REMOTE_ADDR'];

// Cookie
$cookies = '';
foreach ($_COOKIE as $key => $value) {
    $cookies .= $key . '=' . rawurlencode($value) . '; ';
}
if ($cookies) {
    $headers[] = "Cookie: " . rtrim($cookies, '; ');
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Body
if ($method === 'POST' && (!empty($_FILES) || !empty($_POST))) {
    $postData = [];
    if (!empty($_FILES)) {
        foreach ($_FILES as $key => $file) {
            if (file_exists($file['tmp_name']) && $file['error'] === UPLOAD_ERR_OK) {
                $postData[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
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
        $headers = array_filter($headers, function($h) {
            return stripos($h, 'Content-Type:') === false;
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

if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}

$response = curl_exec($ch);
$curl_info = curl_getinfo($ch);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Proxy error: ' . $curl_error]);
    exit;
}

$header_size = $curl_info['header_size'];
$response_headers = substr($response, 0, $header_size);
$response_body = substr($response, $header_size);

$header_lines = explode("\r\n", $response_headers);
foreach ($header_lines as $header_line) {
    if (empty(trim($header_line))) continue;
    if (stripos($header_line, 'Set-Cookie:') === 0) {
        $cookie_header = substr($header_line, strlen('Set-Cookie:'));
        $cookie_parts = explode(';', $cookie_header, 2);
        $cookie_pair = trim($cookie_parts[0]);
        $equals_pos = strpos($cookie_pair, '=');
        if ($equals_pos !== false) {
            $cookie_name = substr($cookie_pair, 0, $equals_pos);
            $cookie_value = substr($cookie_pair, $equals_pos + 1);
            setcookie($cookie_name, $cookie_value, [
                'expires' => time() + 86400 * 7,
                'path' => '/',
                'domain' => '.guvenfinans.az',
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }
    } else {
        header($header_line);
    }
}

http_response_code($curl_info['http_code']);
echo $response_body;
?>
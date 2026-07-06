<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$tin = '1904138011';

// Minimal - heç bir extra header yox
$tests = [
    'test1_bare' => [
        'Content-Type: application/json',
    ],
    'test2_with_accept' => [
        'Content-Type: application/json',
        'Accept: application/json, text/plain, */*',
    ],
    'test3_with_language' => [
        'Content-Type: application/json',
        'Accept: application/json, text/plain, */*',
        'Accept-Language: az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7',
    ],
    'test4_full_browser' => [
        'Content-Type: application/json',
        'Accept: application/json, text/plain, */*',
        'Accept-Language: az-AZ,az;q=0.9,en-US;q=0.8,en;q=0.7',
        'Origin: https://new.e-taxes.gov.az',
        'Referer: https://new.e-taxes.gov.az/etaxes/services/legal-entity-info',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Sec-Fetch-Dest: empty',
        'Sec-Fetch-Mode: cors',
        'Sec-Fetch-Site: same-origin',
        'sec-ch-ua: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile: ?0',
        'sec-ch-ua-platform: "Windows"',
    ],
];

$results = [];
foreach ($tests as $name => $headers) {
    $ch = curl_init('https://new.e-taxes.gov.az/api/po/authless/public/v1/authless/findTaxpayer');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode(['tin' => $tin]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_ENCODING       => '',
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $results[$name] = [
        'code' => $code,
        'ok'   => $code === 200,
        'resp' => $code === 200 ? 'SUCCESS' : substr($resp, 0, 100)
    ];
}

echo json_encode($results, JSON_PRETTY_PRINT);
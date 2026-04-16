<?php
/**
 * Headless theme base template.
 * Redirects all default UI routes to the React frontend.
 * Whitelists auth routes so OAuth2 and login still render normally.
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '';

$allowedSegments = [
    '/login',
    '/logout',
    '/index.php/login',
    '/index.php/apps/oauth2/authorize',
    '/index.php/apps/oauth2/api',
    '/apps/oauth2/authorize',
];

foreach ($allowedSegments as $segment) {
    if (strpos($requestUri, $segment) !== false) {
        // Allow Nextcloud to render its own HTML for auth pages
        return;
    }
}

// All other UI routes -> redirect to React frontend
$frontendUrl = getenv('FRONTEND_URL') ?: 'https://drive.icingtree.com';
header('Location: ' . $frontendUrl, true, 302);
exit;

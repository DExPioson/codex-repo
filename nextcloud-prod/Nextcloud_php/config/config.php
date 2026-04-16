<?php
$CONFIG = array (
  'htaccess.RewriteBase' => '/',
  'memcache.local' => '\\OC\\Memcache\\APCu',
  'apps_paths' => 
  array (
    0 => 
    array (
      'path' => '/var/www/html/apps',
      'url' => '/apps',
      'writable' => false,
    ),
    1 => 
    array (
      'path' => '/var/www/html/custom_apps',
      'url' => '/custom_apps',
      'writable' => true,
    ),
  ),
  'upgrade.disable-web' => true,
  'instanceid' => 'ocu7f1qmsf5j',
  'passwordsalt' => 'uL2dsLSvuJEuLTMwetTMUr1pcMD3PS',
  'secret' => 'E+fVZZrQ+2bK/fC3ZQPdY97VH4WStwDPuoXG4D1jbhBn23xe',
  'trusted_domains' => 
  array (
    0 => '18.61.33.72',
    1 => 'drive.spacepe.in',
  ),
  'api_enabled' => true,
  'datadirectory' => '/var/www/html/data',
  'dbtype' => 'pgsql',
  'version' => '30.0.2.2',
  'overwrite.cli.url' => 'http://18.61.33.72',
  'dbname' => 'nextcloud',
  'dbhost' => 'postgres',
  'dbport' => '',
  'dbtableprefix' => 'oc_',
  'dbuser' => 'oc_spacepe',
  'dbpassword' => 'TejOgYa2DQDz30xy7OPPlhWIaglJll',
  'installed' => true,
  'overwriteprotocol' => 'https',
  'maintenance' => false,
  'oidc_login' => 
  array (
    'auto_redirect' => true,
    'provider_url' => 'https://keycloak.spacepe.in/realms/nextcloud',
    'client_id' => 'drive.techrajendra.com',
    'client_secret' => 'XQCQLYE6h277vQi86zfHKfPH63OtJQez',
    'login_attribute' => 'preferred_username',
    'post_logout_redirect_uri' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/logout?redirect_uri=https://nextcloud.spacepe.in/login',
  ),
  'oidc_endpoints' => 
  array (
    'issuer' => 'https://keycloak.spacepe.in/realms/nextcloud',
    'authorization_endpoint' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/auth',
    'token_endpoint' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/token',
    'introspection_endpoint' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/token/introspect',
    'userinfo_endpoint' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/userinfo',
    'end_session_endpoint' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/logout',
    'post_logout_redirect_uri' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/logout?redirect_uri=https://nextcloud.spacepe.in/login',
    'jwks_uri' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/certs',
    'check_session_iframe' => 'https://keycloak.spacepe.in/realms/nextcloud/protocol/openid-connect/login-status-iframe.html',
  ),
  'defaultapp' => '',
);

# METU DTX historical website archive

Host: https://arsiv.metudtx.com

Gateway snapshot: `144fd2e09b2a9e03d38bcf691d0890bbd322221e` (23 September 2026).
Portal landing snapshot: `6a9b3bb8e52947bc372437b14df65d37b1297edd`, served under `/platform/`.

This legacy repository does not publish the current METU DTX website. Internal legacy gateway and portal links stay on the archive host. External programmes and operational applications retain their original destinations.

HTML pages include an archive banner and noindex metadata. Original historical content is retained. The archive is intended as a temporary reference during the new website transition.

## Publishing

GitHub Pages: `main`, repository root, custom domain `arsiv.metudtx.com`.
DNS: CNAME `arsiv` -> `metudtx.github.io`. No apex-domain, www, MX or other subdomain changes are needed.
Enable HTTPS after the certificate is issued.

## Retiring the archive

When explicitly requested, unpublish this repository's Pages site and remove only the `arsiv` DNS record. Preserve repository history. Do not change the new site's infrastructure.

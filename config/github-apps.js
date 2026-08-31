/**
 * Curated list of open-source apps that ship a signed APK in their GitHub
 * releases. The collector reads the repo's latest release, gates on the repo's
 * SPDX license (only redistributable licenses pass), downloads the APK, reads
 * its manifest for the real package id / version / checksum, and builds a
 * direct-download card — the "Obtainium" idea, curated.
 *
 * `category` is one of the ids in config/catalog.config.js (falls back to OTHER
 * if omitted or unknown). Keep the list hand-picked and small.
 */
export const GITHUB_APPS = [
  { repo: 'TeamNewPipe/NewPipe', category: 'VIDEO_PLAYERS' },
  { repo: 'FossifyOrg/Gallery', category: 'PHOTOGRAPHY' },
  { repo: 'FossifyOrg/Calendar', category: 'PRODUCTIVITY' },
  { repo: 'FossifyOrg/Messages', category: 'COMMUNICATION' },
  { repo: 'bitwarden/android', category: 'TOOLS' }
];

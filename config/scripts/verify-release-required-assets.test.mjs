import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractManifestAssetNames,
  getRequiredReleaseAssetNames,
  verifyRequiredReleaseAssets
} from './verify-release-required-assets.mjs'

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn(async () => body),
    text: vi.fn(async () => (typeof body === 'string' ? body : JSON.stringify(body)))
  }
}

function releaseWithAssets(tag, assetNames) {
  return {
    tag_name: tag,
    draft: true,
    prerelease: false,
    assets: assetNames.map((name, index) => ({
      id: index + 1,
      name,
      state: 'uploaded',
      size: 123
    }))
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getRequiredReleaseAssetNames', () => {
  it('includes both mac updater ZIP names for the tag version', () => {
    expect(getRequiredReleaseAssetNames('v1.4.27')).toEqual(
      expect.arrayContaining([
        'Korca-1.4.27-mac.zip',
        'Korca-1.4.27-mac.zip.blockmap',
        'Korca-1.4.27-arm64-mac.zip',
        'Korca-1.4.27-arm64-mac.zip.blockmap'
      ])
    )
  })

  it('includes the Linux RPM alongside the existing AppImage and deb names', () => {
    expect(getRequiredReleaseAssetNames('v1.4.27')).toEqual(
      expect.arrayContaining([
        'korca-linux.AppImage',
        'korca-ide_1.4.27_amd64.deb',
        'korca-ide-1.4.27.x86_64.rpm'
      ])
    )
  })
})

describe('extractManifestAssetNames', () => {
  it('extracts relative and absolute manifest asset names', () => {
    expect(
      extractManifestAssetNames(
        [
          'files:',
          '  - url: Korca-1.4.27-arm64-mac.zip',
          '  - url: https://example.com/downloads/korca-windows-setup.exe',
          'path: korca-linux.AppImage'
        ].join('\n')
      )
    ).toEqual(['Korca-1.4.27-arm64-mac.zip', 'korca-windows-setup.exe', 'korca-linux.AppImage'])
  })
})

describe('verifyRequiredReleaseAssets', () => {
  it('fails when a manifest-referenced asset has not been uploaded', async () => {
    const tag = 'v1.4.27'
    const required = getRequiredReleaseAssetNames(tag)
    const assets = required.filter((name) => name !== 'Korca-1.4.27-arm64-mac.zip')
    const release = releaseWithAssets(tag, assets)
    const latestMacAsset = release.assets.find((asset) => asset.name === 'latest-mac.yml')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([release]))
      .mockResolvedValueOnce(
        jsonResponse(
          [
            'version: 1.4.27',
            'files:',
            '  - url: Korca-1.4.27-arm64-mac.zip',
            '    sha512: test',
            'path: Korca-1.4.27-arm64-mac.zip'
          ].join('\n')
        )
      )
      .mockResolvedValue(jsonResponse('version: 1.4.27\n'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      verifyRequiredReleaseAssets({ repo: 'stablyai/korca', tag, token: 'token' })
    ).rejects.toThrow('Missing: Korca-1.4.27-arm64-mac.zip')
    expect(latestMacAsset).toBeTruthy()
  })
})

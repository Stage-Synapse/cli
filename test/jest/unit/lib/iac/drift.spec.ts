import * as mockFs from 'mock-fs';

import {
  DCTL_EXIT_CODES,
  generateArgs,
  parseDriftAnalysisResults,
  translateExitCode,
} from '../../../../../src/lib/iac/drift';
import envPaths from 'env-paths';
import { EXIT_CODES } from '../../../../../src/cli/exit-codes';
import * as fs from 'fs';
import * as path from 'path';
import {
  DescribeOptions,
  DriftAnalysis,
  GenDriftIgnoreOptions,
} from '../../../../../src/lib/iac/types';

const paths = envPaths('snyk');

describe('driftctl integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  it('describe: default arguments are correct', () => {
    const args = generateArgs({ kind: 'describe' });
    expect(args).toEqual([
      'scan',
      '--no-version-check',
      '--output',
      'json://stdout',
      '--config-dir',
      paths.cache,
      '--to',
      'aws+tf',
    ]);
  });

  it('gen-driftignore: default arguments are correct', () => {
    const args = generateArgs({ kind: 'gen-driftignore' });
    expect(args).toEqual(['gen-driftignore', '--no-version-check']);
  });

  it('describe: passing options generate correct arguments', () => {
    const args = generateArgs({
      kind: 'describe',
      'config-dir': 'confdir',
      'tf-lockfile': 'tflockfile',
      'tf-provider-version': 'tfproviderversion',
      'tfc-endpoint': 'tfcendpoint',
      'tfc-token': 'tfctoken',
      deep: true,
      driftignore: 'driftignore',
      filter: 'filter',
      from: 'from',
      headers: 'headers',
      quiet: true,
      strict: true,
      to: 'to',
      'only-managed': true,
      'only-unmanaged': true,
    } as DescribeOptions);
    expect(args).toEqual([
      'scan',
      '--no-version-check',
      '--quiet',
      '--filter',
      'filter',
      '--output',
      'json://stdout',
      '--headers',
      'headers',
      '--tfc-token',
      'tfctoken',
      '--tfc-endpoint',
      'tfcendpoint',
      '--tf-provider-version',
      'tfproviderversion',
      '--strict',
      '--deep',
      '--only-managed',
      '--only-unmanaged',
      '--driftignore',
      'driftignore',
      '--tf-lockfile',
      'tflockfile',
      '--config-dir',
      'confdir',
      '--from',
      'from',
      '--to',
      'to',
    ]);
  });

  it('describe: from arguments is a coma separated list', () => {
    const args = generateArgs({
      kind: 'describe',
      from: 'path1,path2,path3',
    } as DescribeOptions);
    expect(args).toEqual([
      'scan',
      '--no-version-check',
      '--output',
      'json://stdout',
      '--config-dir',
      paths.cache,
      '--from',
      'path1',
      '--from',
      'path2',
      '--from',
      'path3',
      '--to',
      'aws+tf',
    ]);
  });

  it('gen-driftignore: passing options generate correct arguments', () => {
    const args = generateArgs({
      kind: 'gen-driftignore',
      'exclude-changed': true,
      'exclude-missing': true,
      'exclude-unmanaged': true,
      input: 'analysis.json',
      output: '/dev/stdout',
      org: 'testing-org', // Ensure that this should not be translated to args
    } as GenDriftIgnoreOptions);
    expect(args).toEqual([
      'gen-driftignore',
      '--no-version-check',
      '--input',
      'analysis.json',
      '--output',
      '/dev/stdout',
      '--exclude-changed',
      '--exclude-missing',
      '--exclude-unmanaged',
    ]);
  });

  it('run driftctl: exit code is translated', () => {
    expect(translateExitCode(DCTL_EXIT_CODES.EXIT_IN_SYNC)).toEqual(0);
    expect(translateExitCode(DCTL_EXIT_CODES.EXIT_NOT_IN_SYNC)).toEqual(
      EXIT_CODES.VULNS_FOUND,
    );
    expect(translateExitCode(DCTL_EXIT_CODES.EXIT_ERROR)).toEqual(
      EXIT_CODES.ERROR,
    );
    expect(translateExitCode(42)).toEqual(EXIT_CODES.ERROR);
  });
});

// That test mostly cover the Types definition
// There is no really any custom logic in that method
describe('parseDriftAnalysisResults ', () => {
  it('should parse correctly drift analysis', () => {
    const driftAnalysisFile = fs.readFileSync(
      path.resolve(__dirname, `fixtures/driftctl-analysis.json`),
    );
    const analysis = parseDriftAnalysisResults(driftAnalysisFile.toString());
    const expected: DriftAnalysis = {
      coverage: 33,
      alerts: {
        aws_iam_access_key: [
          {
            message: 'This is an alert',
          },
        ],
      },
      missing: [
        {
          id: 'test-driftctl2',
          type: 'aws_iam_user',
        },
        {
          id: 'AKIA5QYBVVD2Y6PBAAPY',
          type: 'aws_iam_access_key',
        },
      ],
      differences: [
        {
          res: {
            id: 'AKIA5QYBVVD25KFXJHYJ',
            type: 'aws_iam_access_key',
          },
          changelog: [
            {
              computed: false,
              from: 'Active',
              path: ['status'],
              to: 'Inactive',
              type: 'update',
            },
          ],
        },
      ],
      managed: [
        {
          id: 'AKIA5QYBVVD25KFXJHYJ',
          type: 'aws_iam_access_key',
        },
        {
          id: 'test-managed',
          type: 'aws_iam_user',
        },
      ],
      options: {
        deep: true,
        only_managed: false,
        only_unmanaged: false,
      },
      provider_name: 'AWS',
      provider_version: '2.18.5',
      scan_duration: 123,
      summary: {
        total_missing: 2,
        total_changed: 1,
        total_iac_source_count: 3,
        total_managed: 2,
        total_resources: 6,
        total_unmanaged: 2,
      },
      unmanaged: [
        {
          id: 'driftctl',
          type: 'aws_s3_bucket_policy',
        },
        {
          id: 'driftctl',
          type: 'aws_s3_bucket_notification',
        },
      ],
    };
    expect(analysis).toEqual(expected);
  });
});

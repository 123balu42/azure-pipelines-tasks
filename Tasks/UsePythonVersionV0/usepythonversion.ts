import * as os from 'os';
import * as path from 'path';

import * as semver from 'semver';

import * as task from 'azure-pipelines-task-lib/task';
import * as tool from 'azure-pipelines-tool-lib/tool';

import { Platform } from './taskutil';
import * as toolUtil  from './toolutil';
import { desugarDevVersion, pythonVersionToSemantic } from './versionspec';

interface TaskParameters {
    versionSpec: string,
    addToPath: boolean,
    architecture: string
}

// Python has "scripts" or "bin" directories where command-line tools that come with packages are installed.
// This is where pip is, along with anything that pip installs.
// There is a seperate directory for `pip install --user`.
//
// For reference, these directories are as follows:
//   macOS / Linux:
//      <sys.prefix>/bin (by default /usr/local/bin, but not on hosted agents -- see the `else`)
//      (--user) ~/.local/bin
//   Windows:
//      <Python installation dir>\Scripts
//      (--user) %APPDATA%\Python\PythonXY\Scripts
// See https://docs.python.org/3/library/sysconfig.html
function binDir(installDir: string, platform: Platform): string {
    if (platform === Platform.Windows) {
        return path.join(installDir, 'Scripts');
    } else {
        return path.join(installDir, 'bin');
    }
}

function pypyNotFoundError(pypyVersion: 2 | 3) {
    throw new Error([
        task.loc('PyPyNotFound', pypyVersion),
        // 'Python' is intentional here
        task.loc('ToolNotFoundMicrosoftHosted', 'Python', 'https://aka.ms/hosted-agent-software'),
        task.loc('ToolNotFoundSelfHosted', 'Python', 'https://go.microsoft.com/fwlink/?linkid=871498')
    ].join(os.EOL));
}

// Note on the tool cache layout for PyPy:
// PyPy has its own versioning scheme that doesn't follow the Python versioning scheme,
// But publishes separate binaries for "PyPy2" and "PyPy3", which correspond to Python 2 and 3 respectively.
// We want to support switching between PyPy2 and PyPy3, but don't really care about the particular version of PyPy.

function usePypy(addToPath: boolean, platform: Platform): void {
    const installDir: string | null = tool.findLocalTool('PyPy2', '*', 'x64');

    if (!installDir) {
        // PyPy2 not installed in $(Agent.ToolsDirectory)
        throw pypyNotFoundError(2);
    }

    // For PyPy, the python executable is in the bin dir
    const _binDir = binDir(installDir, platform);
    task.setVariable('pythonLocation', _binDir); 

    if (addToPath) {
        toolUtil.prependPathSafe(_binDir);
    }
}

function usePypy3(addToPath: boolean, platform: Platform): void {
    const installDir: string | null = tool.findLocalTool('PyPy3', '*', 'x64');

    if (!installDir) {
        // PyPy3 not installed in $(Agent.ToolsDirectory)
        throw pypyNotFoundError(3);
    }

    // For PyPy, the python executable is in the bin dir
    const _binDir = binDir(installDir, platform);
    task.setVariable('pythonLocation', _binDir);

    if (addToPath) {
        toolUtil.prependPathSafe(_binDir);
    }
}

async function useCpythonVersion(parameters: Readonly<TaskParameters>, platform: Platform): Promise<void> {
    const desugaredVersionSpec = desugarDevVersion(parameters.versionSpec);
    const semanticVersionSpec = pythonVersionToSemantic(desugaredVersionSpec);
    task.debug(`Semantic version spec of ${parameters.versionSpec} is ${semanticVersionSpec}`);

    const installDir: string | null = tool.findLocalTool('Python', semanticVersionSpec, parameters.architecture);
    if (!installDir) {
        // Fail and list available versions
        const x86Versions = tool.findLocalToolVersions('Python', 'x86')
            .map(s => `${s} (x86)`)
            .join(os.EOL);

        const x64Versions = tool.findLocalToolVersions('Python', 'x64')
            .map(s => `${s} (x64)`)
            .join(os.EOL);

        throw new Error([
            task.loc('VersionNotFound', parameters.versionSpec, parameters.architecture),
            task.loc('ListAvailableVersions', task.getVariable('Agent.ToolsDirectory')),
            x86Versions,
            x64Versions,
            task.loc('ToolNotFoundMicrosoftHosted', 'Python', 'https://aka.ms/hosted-agent-software'),
            task.loc('ToolNotFoundSelfHosted', 'Python', 'https://go.microsoft.com/fwlink/?linkid=871498')
        ].join(os.EOL));
    }

    task.setVariable('pythonLocation', installDir);
    if (parameters.addToPath) {
        toolUtil.prependPathSafe(installDir);
        toolUtil.prependPathSafe(binDir(installDir, platform))

        if (platform === Platform.Windows) {
            // Add --user directory
            // `installDir` from tool cache should look like $AGENT_TOOLSDIRECTORY/Python/<semantic version>/x64/
            // So if `findLocalTool` succeeded above, we must have a conformant `installDir`
            const version = path.basename(path.dirname(installDir));
            const major = semver.major(version);
            const minor = semver.minor(version);

            const userScriptsDir = path.join(process.env['APPDATA'], 'Python', `Python${major}${minor}`, 'Scripts');
            toolUtil.prependPathSafe(userScriptsDir);
        }
        // On Linux and macOS, pip will create the --user directory and add it to PATH as needed.
    }
}

export async function usePythonVersion(parameters: Readonly<TaskParameters>, platform: Platform): Promise<void> {
    switch (parameters.versionSpec.toUpperCase()) {
        case 'PYPY': return usePypy(parameters.addToPath, platform);
        case 'PYPY3': return usePypy3(parameters.addToPath, platform);
        default: return await useCpythonVersion(parameters, platform);
    }
}
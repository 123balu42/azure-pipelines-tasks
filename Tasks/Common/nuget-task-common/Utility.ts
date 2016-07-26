/// <reference path="../../../definitions/Q.d.ts" />

import * as tl from 'vsts-task-lib/task';
import * as path from 'path'
import * as os from 'os';

// Attempts to resolve paths the same way the legacy PowerShell's Find-Files worked
export function resolveFilterSpec(filterSpec: string, basePath?: string, allowEmptyMatch?: boolean): string[] {
    let patterns = filterSpec.split(";");
    let result = new Set<string>();

    patterns.forEach(pattern => {
        let isNegative = false;
        if (pattern.startsWith("+:")) {
            pattern = pattern.substr(2);
        }
        else if (pattern.startsWith("-:")) {
            pattern = pattern.substr(2);
            isNegative = true;
        }

        if (basePath) {
            pattern = path.resolve(basePath, pattern);
        }

        let thisPatternFiles = resolveWildcardPath(pattern, true);
        thisPatternFiles.forEach(file => {
            if (isNegative) {
                result.delete(file);
            }
            else {
                result.add(file);
            }
        });
    });

    // Fail if no matching files were found
    if (!allowEmptyMatch && (!result || result.size == 0)) {
        throw new Error('No matching files were found with search pattern: ' + filterSpec);
    }

    return Array.from(result);
}

export function resolveWildcardPath(pattern: string, allowEmptyWildcardMatch?: boolean): string[] {
    let isWindows = os.platform() === 'win32';
    let toPosixPath = (path: string) => path;
    let toNativePath = (path: string) => path;
    if (isWindows) {
        // minimatch assumes paths use /, so on Windows, make paths use /
        // This needs to be done both to the pattern and to the filenames.
        toPosixPath = (path: string) => path.replace(/\\/g, "/");

        // tl.find always returns forward slashes. This is problematic with UNC paths because NuGet
        // interprets that as a switch argument instead of a path.
        toNativePath = (path: string) => path.replace(/\//g, "\\");
    }

    // Resolve files for the specified value or pattern
    var filesList: string[];
    if (pattern.indexOf('*') == -1 && pattern.indexOf('?') == -1) {
        
        // No pattern found, check literal path to a single file
        tl.checkPath(pattern, 'files');

        // Use the specified single file
        filesList = [pattern];

    } else {
        var firstWildcardIndex = function (str) {
            var idx = str.indexOf('*');

            var idxOfWildcard = str.indexOf('?');
            if (idxOfWildcard > -1) {
                return (idx > -1) ?
                    Math.min(idx, idxOfWildcard) : idxOfWildcard;
            }

            return idx;
        }

        // Find app files matching the specified pattern
        tl.debug('Matching glob pattern: ' + pattern);

        // First find the most complete path without any matching patterns
        var idx = firstWildcardIndex(pattern);
        tl.debug('Index of first wildcard: ' + idx);
        var findPathRoot = path.dirname(pattern.slice(0, idx));

        tl.debug('find root dir: ' + findPathRoot);

        // Now we get a list of all files under this root
        var allFiles = tl.find(findPathRoot);

        // Now matching the pattern against all files
        // Turn off a bunch of minimatch features to replicate the be
        let patternFilter = tl.filter(
            toPosixPath(pattern), {
                matchBase: true,
                nobrace: true,
                noext: true,
                nocomment: true,
                nonegate: true,
                nocase: isWindows,
                dot: isWindows
            });

        filesList = allFiles.filter((file, index, array) => patternFilter(toPosixPath(file), index, array));

        // Fail if no matching .sln files were found
        if (!allowEmptyWildcardMatch && (!filesList || filesList.length == 0)) {
            throw new Error('No matching files were found with search pattern: ' + pattern);
        }
    }

    return filesList.map(toNativePath);
}
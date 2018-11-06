import tl = require("vsts-task-lib/task");
import path = require("path");
import glob = require('glob');
import fs = require('fs');

export class Utility {

    public static getGithubEndPointToken(): string {
        const githubEndpoint = tl.getInput(Inputs.githubEndpoint);
        const githubEndpointObject = tl.getEndpointAuthorization(githubEndpoint, false);
        let githubEndpointToken: string = null;

        if (githubEndpointObject.scheme === 'PersonalAccessToken') {
            githubEndpointToken = githubEndpointObject.parameters.accessToken
        } else {
            // scheme: 'OAuth'
            githubEndpointToken = githubEndpointObject.parameters.AccessToken
        }

        return githubEndpointToken;
    }

    public static getUploadAssets(): string[] {
        let githubReleaseAssetInput = tl.getInput(Inputs.githubReleaseAsset);
        let githubReleaseAssets = [];

        /** Check for one or multiples files into array
         *  Accept wildcards to look for files
         */
        if (githubReleaseAssetInput) {
            githubReleaseAssets = glob.sync(githubReleaseAssetInput);
        }

        return githubReleaseAssets;
    }

    public static validateUploadAssets(): void {
        const assets: string[] = this.getUploadAssets();

        if (assets && assets.length > 0) {
            try {
                assets.forEach(function (asset) {
                    fs.accessSync(path.resolve(asset));
            })
            } catch (err) {
                throw new Error(tl.loc("MissingAssetError", err.path));
            }
        }
    }

    public static getReleaseNote(): string {
        let releaseNotesSelection = tl.getInput(Inputs.releaseNotesSelection);
        let releaseNote: string = undefined;

        if (releaseNotesSelection === 'file') {
            let releaseNotesFile = tl.getPathInput(Inputs.releaseNotesFile, false, true);
            releaseNote = fs.readFileSync(releaseNotesFile).toString();
        } 
        else if (releaseNotesSelection === 'input') {
            releaseNote = tl.getInput(Inputs.releaseNotesInput);
        }
        tl.debug("ReleaseNote:\n" + releaseNote);
        return releaseNote;
    }

    public static getGitHubApiUrl(): string {
        let githubApiUrlInput: string = undefined; // Todo: mdakbar: get GHE url
        return githubApiUrlInput ? githubApiUrlInput : "https://api.github.com"; // url without slash at end
    }
}

export class Inputs {
    public static readonly action = "action";
    public static readonly repositoryName = "repositoryName";
    public static readonly tagCreate = "tagCreate";
    public static readonly tagEdit = "tagEdit";
    public static readonly target = "target";
    public static readonly releaseTitle = "releaseTitle";
    public static readonly isdraft = "isdraft";
    public static readonly isprerelease = "isprerelease";
    public static readonly githubEndpoint = "githubEndpoint";
    public static readonly githubReleaseAsset = "githubReleaseAsset";
    public static readonly releaseNotesSelection = "releaseNotesSelection";
    public static readonly releaseNotesFile = "releaseNotesFile";
    public static readonly releaseNotesInput = "releaseNotesInput";
    public static readonly deleteExistingAssets = "deleteExistingAssets";
}
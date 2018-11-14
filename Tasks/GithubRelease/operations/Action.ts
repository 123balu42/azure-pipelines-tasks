import tl = require("vsts-task-lib/task");
import path = require("path");
import fs = require('fs');
import { WebResponse } from "./webClient";
import { Release } from "./Release";
import { Utility, Inputs, AssetUploadMode } from "./Utility";

export class Action {

    public static async createReleaseAction(repositoryName: string, tag: string, target: string, releaseTitle: string, isDraft: boolean, isPrerelease: boolean): Promise<void> {

        try {
            Utility.validateUploadAssets(); 
            console.log(tl.loc("CreatingRelease"));

            let response: WebResponse = await Release.createRelease(repositoryName, tag, target, releaseTitle, isDraft, isPrerelease);
            tl.debug("Create release response:\n" + JSON.stringify(response));

            if (response.statusCode === 201) {
                if (!tl.getBoolInput(Inputs.isDraft)) {
                    console.log(tl.loc("CreateReleaseSuccess", response.body[this._htmlUrlkey]));
                }
                else {
                    console.log(tl.loc("DraftReleaseCreatedSuccess"), response.body[this._htmlUrlkey]);
                }

                const uploadUrl: string = response.body[this._uploadUrlkey];
                await this._uploadAssets(repositoryName, uploadUrl, []);
            }
            else {           
                throw new Error(tl.loc("CreateReleaseError"));
            }

            tl.setResult(tl.TaskResult.Succeeded, "");
        } catch (error) {
            tl.setResult(tl.TaskResult.Failed, error);
        }    
    }

    public static async editReleaseAction(repositoryName: string, tag: string, releaseTitle: string, isDraft: boolean, isPrerelease: boolean): Promise<void> {
        
        try {
            Utility.validateUploadAssets();     
            console.log(tl.loc("EditingRelease"));

            let response: WebResponse = await Release.editRelease(repositoryName, tag, releaseTitle, isDraft, isPrerelease);
            tl.debug("Edit release response:\n" + JSON.stringify(response));

            if (response.statusCode === 200) {
                console.log(tl.loc("EditReleaseSuccess"));

                const uploadUrl: string = response.body[this._uploadUrlkey];
                await this._uploadAssets(repositoryName, uploadUrl, response.body[this._assetsKey]);
            }
            else {
                throw new Error(tl.loc("EditReleaseError"));
            }

            tl.setResult(tl.TaskResult.Succeeded, "");
        } catch (error) {
            tl.setResult(tl.TaskResult.Failed, error);
        }    
    }

    public static async discardReleaseAction(repositoryName: string, tag: string): Promise<void> {

        try {
            console.log(tl.loc("DiscardingRelease"));
            let response: WebResponse = await Release.discardRelease(repositoryName, tag);
            tl.debug("Discard release response:\n" + JSON.stringify(response));

            if (response.statusCode === 204) {
                console.log(tl.loc("DiscardReleaseSuccess"));
            }
            else {
                throw new Error(tl.loc("DiscardReleaseError"));
            }

            tl.setResult(tl.TaskResult.Succeeded, "");
        } catch (error) {
            tl.setResult(tl.TaskResult.Failed, error);
        }    
    }

    private static async _uploadAssets(repositoryName: string, uploadUrl: string, existingAssets): Promise<void> {
        const assetUploadMode = tl.getInput(Inputs.assetUploadMode);
        let assets: string[] = Utility.getUploadAssets() || [];

        if (!!assetUploadMode && assetUploadMode === AssetUploadMode.delete) {
            await this._deleteAssets(repositoryName, existingAssets);
        }

        for (let index = 0; index < assets.length; index++) {
            const asset = assets[index];
            console.log(tl.loc("UploadingAsset", asset));

            if (fs.lstatSync(path.resolve(asset)).isDirectory()) {
                console.log(tl.loc("AssetIsDirectoryError", asset));
                continue;
            }

            let uploadResponse = await Release.uploadReleaseAsset(uploadUrl, asset);
            
            if (uploadResponse.statusCode === 201) {
                console.log(tl.loc("UploadAssetSuccess", asset));
            }
            else if (uploadResponse.statusCode === 422 && uploadResponse.body.errors && uploadResponse.body.errors.length > 0 && uploadResponse.body.errors[0].code === 'already_exists') {
                
                if (!!assetUploadMode && assetUploadMode === AssetUploadMode.replace) {
                    console.log(tl.loc("DuplicateAssetFound", asset));
                    console.log(tl.loc("DeletingDuplicateAsset", asset));

                    const fileName = path.basename(asset);

                    for (let existingAsset of existingAssets) {
                        if (fileName === existingAsset.name) {
                            await this._deleteAssets(repositoryName, [existingAsset]);
                            index--;
                            break;
                        }
                    }
                }
                else {
                    tl.debug("Upload asset response:\n" + JSON.stringify(uploadResponse));
                    throw new Error(tl.loc("DuplicateAssetFound", asset));
                }
            }
            else {
                tl.debug("Upload asset response:\n" + JSON.stringify(uploadResponse));
                throw new Error(tl.loc("UploadAssetError"));
            }
        }
    }

    private static async _deleteAssets(repositoryName: string, assets) {
        for (let asset of assets) {
            let deleteAssetResponse = await Release.deleteReleaseAsset(asset.id, repositoryName);

            if (deleteAssetResponse.statusCode === 204) {
                console.log(tl.loc("AssetDeletedSuccessfully", asset));
            }
            else {
                tl.debug("Delete asset response:\n" + JSON.stringify(deleteAssetResponse));
                throw new Error(tl.loc("ErrorDeletingAsset", asset));
            }
        }
    }

    private static readonly _uploadUrlkey: string = "upload_url";
    private static readonly _htmlUrlkey: string = "html_url";
    private static readonly _assetsKey: string = "assets";
}

export class ActionType {
    public static readonly create = "create";
    public static readonly edit = "edit";
    public static readonly discard = "discard";
}
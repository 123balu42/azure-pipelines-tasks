import path = require("path");
import fs = require('fs');
import os = require('os');
import util = require('util');
import tl = require("vsts-task-lib/task");

import armCompute = require('azure-arm-rest/azure-arm-compute');
import armStorage = require('azure-arm-rest/azure-arm-storage');
import azureModel = require('azure-arm-rest/azureModels');
import azureStorage = require('azure-storage-transfer');
import compress = require('utility-common/compressutility');
import AzureVmssTaskParameters from "../models/AzureVmssTaskParameters";
import utils = require("./Utils")


export default class VirtualMachineScaleSet {
    private taskParameters: AzureVmssTaskParameters;

    constructor(taskParameters: AzureVmssTaskParameters) {
        this.taskParameters = taskParameters;
    }

    public async execute(): Promise<void> {
        /*var blobService = azureStorage.createBlobService("cdscd", "vervre");
        blobService.uploadBlobs("cdcsd", "ede", "csdcd");
        return;*/

        // get RG for SG
        /*
                let storageAccounts: Model.StorageAccount[] = await this.list(options);
        let index = storageAccounts.findIndex(account => account.name.toLowerCase() === accountName.toLowerCase());
        if(index < 0) {
            throw new Error('Could nor find storage account with name ' + accountName);
        }

        let resourceGroupName = getResourceGroupNameFromUri(storageAccounts[index].id);

        */


        var client = new armCompute.ComputeManagementClient(this.taskParameters.credentials, this.taskParameters.subscriptionId);
        var result = await this._getResourceGroupForVmss(client);
        var resourceGroupName: string = result.resourceGroupName;
        var osType: string = result.osType;
        if(!resourceGroupName) {
            throw(tl.loc("FailedToGetRGForVMSS", this.taskParameters.vmssName));
        }

        switch (this.taskParameters.action) {
            case "UpdateImage":
            case "Update image":
                await this._configureAppUsingCustomScriptExtension(client, resourceGroupName, osType);
                //await this._updateImageInternal(client, resourceGroupName);
                break;
            case "Configure application start-up":
                await this._configureAppUsingCustomScriptExtension(client, resourceGroupName, osType);
                break;
            default:
                throw tl.loc("InvalidAction", this.taskParameters.action);
        }
    }

    private async _uploadCustomScriptsToBlobService(storageDetails: StorageAccountInfo, customScriptInfo: CustomScriptsInfo) {
        let blobService = azureStorage.createBlobService(this.taskParameters.customScriptsStorageAccount, storageDetails.primaryAccessKey);
        let containerUrl = util.format("%s%s", storageDetails.primaryBlobUrl, "vststasks");

        // find all files under dir
        let fileList: string[] = tl.findMatch(customScriptInfo.dirPath, "**/*.*");

        let fileUris: string[] = [];
        fileList.forEach((filePath) => {
            let relativePath = path.relative(customScriptInfo.dirPath, filePath);
            let normalizedRelativePath = utils.normalizeRelativePath(relativePath);
            let fileUri = util.format("%s/%s", containerUrl, normalizedRelativePath);
            fileUris.push(fileUri);
        });

        await blobService.uploadBlobs(customScriptInfo.dirPath, "vststasks");
        return fileUris;
    }

    private async _getStorageAccountDetails(): Promise<StorageAccountInfo> {
        var storageArmClient = new armStorage.StorageManagementClient(this.taskParameters.credentials, this.taskParameters.subscriptionId);
        let storageAccounts: azureModel.StorageAccount[] = await storageArmClient.storageAccounts.list(null);
        let index = storageAccounts.findIndex(account => account.name.toLowerCase() === this.taskParameters.customScriptsStorageAccount.toLowerCase());
        if(index < 0) {
            throw new Error('Could nor find storage account with name ' + this.taskParameters.customScriptsStorageAccount);
        }

        let storageAccountResourceGroupName = utils.getResourceGroupNameFromUri(storageAccounts[index].id);
        let accessKeys = await storageArmClient.storageAccounts.listKeys(storageAccountResourceGroupName, this.taskParameters.customScriptsStorageAccount, null);

        return <StorageAccountInfo>{
            name: this.taskParameters.customScriptsStorageAccount,
            primaryBlobUrl: storageAccounts[index].properties.primaryEndpoints.blob,
            resourceGroupName: storageAccountResourceGroupName,
            primaryAccessKey: accessKeys[0]
        }
    }

    private async _configureAppUsingCustomScriptExtension(client: armCompute.ComputeManagementClient, resourceGroupName: string, osType: string): Promise<void> {
        if(!!this.taskParameters.customScriptsPath) {
            let customScriptInfo: CustomScriptsInfo = this._prepareCustomScripts(osType);
            let storageDetails: StorageAccountInfo = await this._getStorageAccountDetails();
            // upload custom script directory to blob storage
            let fileUris = await this._uploadCustomScriptsToBlobService(storageDetails, customScriptInfo);
            //return;
            var extensionMetadata: azureModel.VMExtensionMetadata = this._getCustomScriptExtensionMetadata(osType);
            var customScriptExtension: azureModel.VMExtension = {
                name: "CustomScriptExtension" + Date.now().toString(),
                properties: {
                    type: extensionMetadata.type,
                    publisher: extensionMetadata.publisher,
                    typeHandlerVersion: extensionMetadata.typeHandlerVersion,
                    autoUpgradeMinorVersion: true,
                    settings: {
                        "commandToExecute": customScriptInfo.command,
                        "fileUris": fileUris
                    },
                    protectedSettings: {
                        "storageAccountName": storageDetails.name,
                        "storageAccountKey": storageDetails.primaryAccessKey
                    }
                }
            };

            var matchingExtension = await this._getExistingCustomScriptExtension(client, resourceGroupName, customScriptExtension);

            // if extension already exists, remove it
            if(!!matchingExtension) {
                await this._deleteCustomScriptExtension(client, resourceGroupName, matchingExtension);
            }

            await this._installCustomScriptExtension(client, resourceGroupName, customScriptExtension);

        }
    }

    private _prepareCustomScripts(osType: string): CustomScriptsInfo {
        let archiveDirectory = path.join(os.tmpdir(), "vstsvmss" + Date.now().toString());
        let archiveFileName = this._getArchiveFilename();
        let archiveExt = this._getArchiveFileExtension(osType);
        let archiveFile = path.join(archiveDirectory, archiveFileName + archiveExt);
        let compressionType: string = archiveExt === ".zip" ? "zip" : "targz";

        if(!tl.exist(archiveDirectory)) {
            tl.mkdirP(archiveDirectory);
        }

        compress.createArchive(this.taskParameters.customScriptsPath, compressionType, archiveFile);

        if(osType === "Windows") {
            let invokerScriptPath = path.join(__dirname, "..", "Resources", "customScriptInvoker.ps1");
            tl.cp(invokerScriptPath, archiveDirectory, "-f", false);
            let archiveName = (archiveFileName + archiveExt).replace(/'/g, "''");
            let command = this.taskParameters.customScriptCommand.replace(/'/g, "''");
            let invokerCommand = `powershell ./customScriptInvoker.ps1 -zipName '${archiveName}' -command '${command}'`;
            return <CustomScriptsInfo>{
                dirPath: archiveDirectory,
                command: invokerCommand
            };
        } else {
            let invokerScriptPath = path.join(__dirname, "..", "Resources", "customScriptInvoker.sh");
            tl.cp(invokerScriptPath, archiveDirectory, "-f", false);
            let archiveName = (archiveFileName + archiveExt).replace(/'/g, "''");
            let command = this.taskParameters.customScriptCommand.replace(/'/g, "''");
            let invokerCommand = `./customScriptInvoker.sh '${archiveName}' '${command}'`;
            console.log("Invoker command: " + invokerCommand);
            return <CustomScriptsInfo>{
                dirPath: archiveDirectory,
                command: invokerCommand
            };
        }

    }

    private _getResourceGroupForVmss(client: armCompute.ComputeManagementClient): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            client.virtualMachineScaleSets.list(null, (error, result, request, response) => {
                if (error) {
                    return reject(tl.loc("VMSSListFetchFailed", utils.getError(error)));
                }

                var vmssList: azureModel.VMSS[] = result;
                if (vmssList.length == 0) {
                    console.log(tl.loc("NoVMSSFound", this.taskParameters.vmssName));
                    return resolve();
                }

                var resourceGroupName: string;
                var osType: string;
                for (var i = 0; i < vmssList.length; i++) {
                    if(vmssList[i].name.toUpperCase() === this.taskParameters.vmssName.toUpperCase())
                    {
                        resourceGroupName = utils.getResourceGroupNameFromUri(vmssList[i].id);
                        osType = vmssList[i].properties.virtualMachineProfile.storageProfile.osDisk.osType;
                        break;
                    }
                }

                return resolve({ resourceGroupName: resourceGroupName, osType: osType });
            });
        });
    }

    private _getExistingCustomScriptExtension(client: armCompute.ComputeManagementClient, resourceGroupName: string, customScriptExtension: azureModel.VMExtension): Promise<azureModel.VMExtension> {
        return new Promise<azureModel.VMExtension>((resolve, reject) => {
            client.virtualMachineExtensions.list(resourceGroupName, this.taskParameters.vmssName, azureModel.ComputeResourceType.VirtualMachineScaleSet, null, (error, result, request, response) => {
                if (error) {
                    // Just log warning, do not fail
                    tl.warning(tl.loc("GetVMSSExtensionsListFailed", this.taskParameters.vmssName, utils.getError(error)));
                }

                var extensions: azureModel.VMExtension[] = result || [];
                var matchingExtension: azureModel.VMExtension = null;
                extensions.forEach((extension: azureModel.VMExtension) => {
                    if(extension.properties.type === customScriptExtension.properties.type &&
                    extension.properties.publisher === customScriptExtension.properties.publisher) {
                        matchingExtension = extension;
                        return;
                    }
                });

                return resolve(matchingExtension);
            });
        });
    }

    private _deleteCustomScriptExtension(client: armCompute.ComputeManagementClient, resourceGroupName: string, customScriptExtension: azureModel.VMExtension): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            console.log(tl.loc("RemovingCustomScriptExtension", customScriptExtension.name));
            client.virtualMachineExtensions.deleteMethod(resourceGroupName, this.taskParameters.vmssName, azureModel.ComputeResourceType.VirtualMachineScaleSet, customScriptExtension.name, (error, result, request, response) => {
                if (error) {
                    // Just log warning, do not fail
                    tl.warning(tl.loc("RemoveVMSSExtensionsFailed", customScriptExtension.name, utils.getError(error)));
                } else {
                    console.log(tl.loc("CustomScriptExtensionRemoved", customScriptExtension.name));
                }

                return resolve();
            });
        });
    }

    private _installCustomScriptExtension(client: armCompute.ComputeManagementClient, resourceGroupName: string, customScriptExtension: azureModel.VMExtension): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            client.virtualMachineExtensions.createOrUpdate(resourceGroupName, this.taskParameters.vmssName, azureModel.ComputeResourceType.VirtualMachineScaleSet, customScriptExtension.name, customScriptExtension, (error, result, request, response) => {
                if (error) {
                    return reject(tl.loc("SettingVMExtensionFailed", utils.getError(error)));
                }

                console.log(tl.loc("CustomScriptExtensionInstalled", customScriptExtension.name));
                return resolve();
            });
        });
    }

    private _updateImageInternal(client: armCompute.ComputeManagementClient, resourceGroupName: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            client.virtualMachineScaleSets.updateImage(resourceGroupName, this.taskParameters.vmssName, this.taskParameters.imageUrl, null, (error, result, request, response) => {
                if (error) {
                    return reject(tl.loc("VMSSImageUpdateFailed", this.taskParameters.vmssName, utils.getError(error)));
                }
                console.log(tl.loc("UpdatedVMSSImage"));
                return resolve();
            });
        });
    }

    private _getCustomScriptExtensionMetadata(osType: string): azureModel.VMExtensionMetadata {
        if(osType === "Windows") {
            return <azureModel.VMExtensionMetadata>{
                type: "CustomScriptExtension",
                publisher: "Microsoft.Compute",
                typeHandlerVersion: "1.0"
            }
        } else if(osType === "Linux") {
            return <azureModel.VMExtensionMetadata>{
                type: "CustomScriptForLinux",
                publisher: "Microsoft.OSTCExtensions",
                typeHandlerVersion: "1.0"
            }
        }
    }

    private _getArchiveFilename(): string {
        let releaseId = tl.getVariable("release.releaseid");
        let releaseAttempt = tl.getVariable("release.attemptnumber");
        let filename: string = "cs-";
        if(!!releaseId && !!releaseAttempt) {
            filename = filename + releaseId + "-" + releaseAttempt;
        } else {
            filename = filename + tl.getVariable("build.buildid");
        }

        return filename;
    }

    private _getArchiveFileExtension(osType: string): string {
        if(osType === "Windows") {
            return ".zip";
        } else {
            return ".tar.gz";
        }
    }
}

class StorageAccountInfo {
    public name: string;
    public resourceGroupName: string;
    public primaryBlobUrl: string;
    public primaryAccessKey: string;
}

class CustomScriptsInfo {
    public dirPath: string;
    public command: string;
}
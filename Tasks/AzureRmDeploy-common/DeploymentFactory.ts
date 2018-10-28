import { TaskParameters, DeploymentType } from './operations/TaskParameters';
import { BuiltInLinuxWebAppDeploymentProvider } from './deploymentProvider/BuiltInLinuxWebAppDeploymentProvider';
import { IWebAppDeploymentProvider } from './deploymentProvider/IWebAppDeploymentProvider';
import { WindowsWebAppZipDeployProvider } from './deploymentProvider/WindowsWebAppZipDeployProvider';
import { WindowsWebAppRunFromZipProvider } from './deploymentProvider/WindowsWebAppRunFromZipProvider';
import tl = require('vsts-task-lib/task');
import { PackageType } from './webdeployment-common/packageUtility';
import { WindowsWebAppWarDeployProvider } from './deploymentProvider/WindowsWebAppWarDeployProvider';

export class DeploymentFactory {

    private _taskParams: TaskParameters;

    constructor(taskParams: TaskParameters) {
        this._taskParams = taskParams;
    }

    public async GetDeploymentProvider(): Promise<IWebAppDeploymentProvider> {
        if(this._taskParams.isLinuxApp) {
            tl.debug("Depolyment started for linux app service");
            return new BuiltInLinuxWebAppDeploymentProvider(this._taskParams);
        } else {
            tl.debug("Depolyment started for windows app service");
            return await this._getWindowsDeploymentProvider()
        }
    }

    private async _getWindowsDeploymentProvider(): Promise<IWebAppDeploymentProvider> {
        tl.debug("Package type of deployment is: "+ this._taskParams.Package.getPackageType());
        switch(this._taskParams.Package.getPackageType()){
            case PackageType.war:
                return new WindowsWebAppWarDeployProvider(this._taskParams);
            case PackageType.jar:
                return new WindowsWebAppZipDeployProvider(this._taskParams);
            default:
                return await this._getWindowsDeploymentProviderForZipAndFolderPackageType();
            }
    }

    private async _getWindowsDeploymentProviderForZipAndFolderPackageType(): Promise<IWebAppDeploymentProvider> {
        if(this._taskParams.DeploymentType != DeploymentType.auto) {
            return await this._getUserSelectedDeploymentProviderForWindow();
        } else {  
            return new WindowsWebAppRunFromZipProvider(this._taskParams);
        }
    }

    private async _getUserSelectedDeploymentProviderForWindow(): Promise<IWebAppDeploymentProvider> {
        switch(this._taskParams.DeploymentType){
            case DeploymentType.zipDeploy:
                return new WindowsWebAppZipDeployProvider(this._taskParams);
            case DeploymentType.runFromZip:
                return new WindowsWebAppRunFromZipProvider(this._taskParams);
        }
    }

}

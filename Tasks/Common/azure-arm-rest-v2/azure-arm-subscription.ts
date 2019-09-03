import tl = require('azure-pipelines-task-lib/task');
import msRestAzure = require('./azure-arm-common');
import azureServiceClientBase = require('./AzureServiceClientBase');
import depolymentsBase = require('./DeploymentsBase');

export class SubscriptionManagementClient extends azureServiceClientBase.AzureServiceClientBase {

    public deployments: SubscriptionDeployments;

    constructor(credentials: msRestAzure.ApplicationTokenCredentials, subscriptionId: string, options?: any) {
        super(credentials);
        this.validateInputs(subscriptionId);
        this.apiVersion = '2019-05-10';
        this.acceptLanguage = 'en-US';
        this.generateClientRequestId = true;
        if (!!options && !!options.longRunningOperationRetryTimeout) {
            this.longRunningOperationRetryTimeout = options.longRunningOperationRetryTimeout;
        }
        this.deployments = new SubscriptionDeployments(this);
        this.subscriptionId = subscriptionId;
    }

    private validateInputs(subscriptionId: string) {
        if (!subscriptionId) {
            throw new Error(tl.loc("SubscriptionIdCannotBeNull"));
        }
    }
}

export class SubscriptionDeployments extends depolymentsBase.DeploymentsBase {
    
    protected client: azureServiceClientBase.AzureServiceClientBase;

    constructor(client: SubscriptionManagementClient) {
        super(client);
    }

    public deploy(deploymentParameters, parameters, callback) {

        // Create HTTP request uri
        var uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/providers/Microsoft.Resources/deployments/{deploymentName}',
            {
                '{deploymentName}': deploymentParameters
            }
        );
        super.createOrUpdate(uri, deploymentParameters, parameters, callback);
    }

    public validate(deploymentParameters, parameters, callback) {

        // Create HTTP request uri
        var uri = this.client.getRequestUri(
            '//subscriptions/{subscriptionId}/providers/Microsoft.Resources/deployments/{deploymentName}/validate',
            {
                '{deploymentName}': deploymentParameters
            }
        );
        super.validate(uri, deploymentParameters, parameters, callback);
    }
}
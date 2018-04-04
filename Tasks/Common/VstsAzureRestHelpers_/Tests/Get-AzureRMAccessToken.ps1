[CmdletBinding()]
param()

# Arrange.
. $PSScriptRoot\..\..\..\..\Tests\lib\Initialize-Test.ps1
Microsoft.PowerShell.Core\Import-Module Microsoft.PowerShell.Security
$module = Microsoft.PowerShell.Core\Import-Module $PSScriptRoot\.. -PassThru
$endpoint = @{
    Url = "https://management.azure.com"
    Auth = @{
        Parameters = @{
            TenantId = 'Some tenant ID'
        }
        Scheme = 'ManagedServiceIdentity'
    }
    Data = @{
        SubscriptionId = 'Some subscription ID'
        SubscriptionName = 'Some subscription name'
        Environment = "AzureCloud"
        ActiveDirectoryServiceEndpointResourceId = "https://management.windows.azure.com"
    }
}

$variableSets = @(
    @{ environment = "AzureCloud" ; result = "https://management.azure.com/"}
)

$content = @"
           {"access_token" : "Dummy Token" }
"@

foreach ($variableSet in $variableSets) {

    Write-Verbose ('-' * 80)
    $endpoint.Data.Environment = $variableSet.environment

    Unregister-Mock Add-AzureStackDependencyData
    Unregister-Mock Invoke-WebRequest
    Register-Mock Add-AzureStackDependencyData { return $endpoint }
    Register-Mock Invoke-WebRequest { @{Content = $content} }

    # Act.
    $result = & $module Get-AzureRMAccessToken -Endpoint $endpoint 

    # Assert.
    Assert-AreEqual "Dummy Token" $result.access_token
}


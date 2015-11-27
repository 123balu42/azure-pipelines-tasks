# Utility Functions used by AzureFileCopy.ps1 (other than azure calls) #

$ErrorActionPreference = 'Stop'
$doSkipCACheckOption = '-SkipCACheck'
$doNotSkipCACheckOption = ''

function Write-TaskSpecificTelemetry
{
    param(
      [string]$codeKey
      )

    Write-Telemetry "$codeKey" "EB72CB01-A7E5-427B-A8A1-1B31CCAC8A43"
}

function Does-RequireSwitchAzureMode
{
    $azureVersion = Get-AzureCmdletsVersion

    $versionToCompare = New-Object -TypeName System.Version -ArgumentList "0.9.9"

    $result = Get-AzureVersionComparison -AzureVersion $azureVersion -CompareVersion $versionToCompare

    if(!$result)
    {
        Write-Verbose "Switch Azure mode is required." -Verbose
    }
    else
    {
        Write-Verbose "Switch Azure mode is not required." -Verbose
    }

    return !$result
}

function ThrowError
{
    param([string]$errorMessage)

    $readmelink = "http://aka.ms/azurefilecopyreadme"
    $helpMessage = (Get-LocalizedString -Key "For more info please refer to {0}" -ArgumentList $readmelink)
    throw "$errorMessage $helpMessage"
}

function Validate-AzurePowershellVersion
{
    Write-Verbose "Validating minimum required azure powershell version" -Verbose

    $currentVersion =  Get-AzureCmdletsVersion
    $minimumAzureVersion = New-Object System.Version(0, 9, 0)
    $versionCompatible = Get-AzureVersionComparison -AzureVersion $currentVersion -CompareVersion $minimumAzureVersion
    
    if(!$versionCompatible)
    {
        Write-TaskSpecificTelemetry "PREREQ_AzurePowerShellVersion"
        Throw (Get-LocalizedString -Key "The required minimum version {0} of the Azure Powershell Cmdlets are not installed. You can follow the instructions at http://azure.microsoft.com/en-in/documentation/articles/powershell-install-configure/ to get the latest Azure powershell" -ArgumentList $minimumAzureVersion)
    }

    Write-Verbose -Verbose "Validated the required azure powershell version"
}

function Get-AzureVMsCredentials
{
    param([string]$vmsAdminUserName,
          [string]$vmsAdminPassword)

    Write-Verbose "Azure VMs Admin Username: $vmsAdminUserName" -Verbose

    $azureVmsCredentials = New-Object 'System.Net.NetworkCredential' -ArgumentList $vmsAdminUserName, $vmsAdminPassword

    return $azureVmsCredentials
 }

function Get-SkipCACheckOption
{
    param([string]$skipCACheck)

    if ($skipCACheck -eq "false")
    {
        Write-Verbose "Not skipping CA Check" -Verbose
        return $doNotSkipCACheckOption
    }

    Write-Verbose "Skipping CA Check" -Verbose
    return $doSkipCACheckOption
}
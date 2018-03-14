[CmdletBinding()]
param()

. $PSScriptRoot\..\..\..\Tests\lib\Initialize-Test.ps1

## test 1
Register-Mock Get-VstsTaskVariable { "C:\agent\temp" } -- -Name "agent.tempDirectory"
Register-Mock Get-VstsTaskVariable { "2.120.3" } -- -Name "agent.version"

$env:Temp = "C:\env\temp\longPath"

# Act
. $PSScriptRoot/../../../Tasks/ServiceFabricDeploy/ServiceFabricSDK/Utilities.ps1
$tempDir = Get-TempDirectoryPath

# Assert
Assert-AreEqual -Expected "C:\agent\temp" -Actual $tempDir -Message "Agent temp dir should be used if shorter than env temp"

# Cleanup
Unregister-Mock Get-VstsTaskVariable


## test 2
Register-Mock Get-VstsTaskVariable { "C:\agent\temp\longPath" } -- -Name "agent.tempDirectory"
Register-Mock Get-VstsTaskVariable { "2.120.3" } -- -Name "agent.version"

$env:Temp = "C:\env\temp"

# Act
. $PSScriptRoot/../../../Tasks/ServiceFabricDeploy/ServiceFabricSDK/Utilities.ps1
$tempDir = Get-TempDirectoryPath

# Assert
Assert-AreEqual -Expected "C:\env\temp" -Actual $tempDir -Message "Env temp dir should be used if shorter than agent temp"

# Cleanup
Unregister-Mock Get-VstsTaskVariable


## test 3
Register-Mock Get-VstsTaskVariable { "C:\agent\temp" } -- -Name "agent.tempDirectory"
Register-Mock Get-VstsTaskVariable { "2.114.3" } -- -Name "agent.version"

$env:Temp = "C:\env\temp\longPath"

# Act
. $PSScriptRoot/../../../Tasks/ServiceFabricDeploy/ServiceFabricSDK/Utilities.ps1
$tempDir = Get-TempDirectoryPath

# Assert
Assert-AreEqual -Expected "C:\env\temp\longPath" -Actual $tempDir -Message "Env temp dir should be used if agent version is less than 2.115.0"

# Cleanup
Unregister-Mock Get-VstsTaskVariable
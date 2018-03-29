Import-VstsLocStrings -LiteralPath $PSScriptRoot/module.json

function Add-Tls12InSession {
    [CmdletBinding()]
    param()

    try {
        if ([Net.ServicePointManager]::SecurityProtocol -notcontains 'Tls12') {
            [Net.ServicePointManager]::SecurityProtocol += [Net.SecurityProtocolType]3072
            Write-Host (Get-VstsLocString -Key TLS12AddedInSession)
        }
        else {
            Write-Verbose 'TLS 1.2 already present in session.'
        }
    }
    catch {
        Write-VstsTaskError "Failed to add TLS 1.2 in session: $_.Exception.Message"
    }
}

function Assert-TlsError {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)] $exception 
    )

    if ($exception -eq $null)
    {
        return
    }

    $isWebException = $true
    $innerException = $exception
    while ($innerException.GetType() -ne [System.Net.WebException])
    {
        $innerException = $innerException.InnerException
        if ($innerException -eq $null)
        {
            $isWebException = $false
            break
        }
    }

    if (($isWebException -eq $true) -and ($innerException.InnerException -ne $null) -and ($innerException.InnerException.GetType() -eq [System.IO.IOException]))
    {
        Write-VstsTaskError -Message (Get-VstsLocString -Key UnsupportedTLSError)
    }
}

Export-ModuleMember -Function Add-Tls12InSession
Export-ModuleMember -Function Assert-TlsError
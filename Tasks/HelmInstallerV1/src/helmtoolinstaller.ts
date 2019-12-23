"use strict";

import tl = require('azure-pipelines-task-lib/task');
import path = require('path');
import * as toolLib from 'vsts-task-tool-lib/tool';
import utils = require("./utils");

tl.setResourcePath(path.join(__dirname, '..', 'task.json'));


async function configureHelm() {
    var version = await utils.getHelmVersion();
    var helmPath = await utils.downloadHelm(version);
    // prepend the tools path. instructs the agent to prepend for future tasks
    if (!process.env['PATH'].startsWith(path.dirname(helmPath))) {
        toolLib.prependPath(path.dirname(helmPath));
    }
}

async function verifyHelm() {
    console.log(tl.loc("VerifyHelmInstallation"));
    var helmVersion = await utils.getHelmVersion();
    var helmToolPath = tl.which("helm", true);
    var helmTool = tl.tool(helmToolPath);
    
    // Check if using Helm 2 or Helm 3
    if (helmVersion.startsWith("2")) {
        helmTool.arg("init");
        helmTool.arg("--client-only");
    } else {
        helmTool.arg("version");
    }

    return helmTool.exec()
}

configureHelm()
    .then(() => verifyHelm())
    .then(() => {
        tl.setResult(tl.TaskResult.Succeeded, "");
    }).catch((error) => {
        tl.setResult(tl.TaskResult.Failed, error)
    });
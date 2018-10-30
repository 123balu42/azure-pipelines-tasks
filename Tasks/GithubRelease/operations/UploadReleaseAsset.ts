import tl = require("vsts-task-lib/task");
import path = require("path");
import glob = require('glob');
import fs = require('fs');
import mime = require('mime');
import { WebRequest, sendRequest, WebResponse } from "./webClient";
import * as Utility from "./Utility";

export async function uploadReleaseAsset(uploadUrl: string, filePath: string): Promise<WebResponse> {
    console.log(tl.loc("UploadingAsset", filePath));

    let fileName = path.basename(filePath);
    let rd = fs.createReadStream(filePath);
    var stats = fs.statSync(filePath);

    // Form request
    let request = new WebRequest();
    request.uri = uploadUrl.split('{')[0] + '?name=' + fileName;
    request.method = "POST";
    request.headers = {
        "Content-Type": mime.lookup(fileName),
        'Content-Length': stats.size,
        'Authorization': 'token ' + Utility.getGithubEndPointToken(),
        'User-Agent': 'akbar-github-release upload'
    };
    request.body = rd;
    tl.debug("Upload release request:\n" + JSON.stringify(request, null, 2));

    // Send upload release asset request
    return await sendRequest(request);
}
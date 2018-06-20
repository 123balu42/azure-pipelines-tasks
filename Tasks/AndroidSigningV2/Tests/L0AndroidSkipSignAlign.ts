import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');

import * as sinon from 'sinon';
 
let taskPath = path.join(__dirname, '..', 'androidsigning.js');
let tr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tr.setInput('files', '/some/fake.apk');
tr.setInput('jarsign', 'false');
tr.setInput('zipalign', 'false');

const getVariable = sinon.stub();
getVariable.withArgs('AGENT_VERSION').returns('2.116.0');
getVariable.withArgs('VSTS_TASKVARIABLE_KEYSTORE_FILE_PATH').returns('/usr/lib/login.keystore');
getVariable.withArgs('HOME').returns('/users/test');
getVariable.withArgs('JAVA_HOME').returns('/fake/java/home');
getVariable.withArgs('ANDROID_HOME').returns('/fake/android/home');

tr.registerMockExport('getVariable', getVariable);

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    "checkPath": {
        "/some/fake.apk": true
    },
    "findMatch": {
        "/some/fake.apk": [
            "/some/fake.apk"
        ],
        "/fake/android/home": [
            "/fake/android/home/sdk1",
            "/fake/android/home/sdk2"
        ],
        "zipalign*": [
            "/fake/android/home/sdk1/zipalign",
            "/fake/android/home/sdk2/zipalign"
        ]
    },
    "exec": {
        "/fake/java/home/bin/jarsigner -keystore /some/store -storepass pass1 -keypass pass2 -signedjar /some/fake.apk /some/fake.apk.unsigned somealias": {
            "code": 0,
            "stdout": "jarsigner output here"
        },
        "/fake/android/home/sdk1/zipalign -v 4 /some/fake.apk.unaligned /some/fake.apk": {
            "code": 0,
            "stdout": "zipalign output here"
        }
    }
};
tr.setAnswers(a);

tr.run();
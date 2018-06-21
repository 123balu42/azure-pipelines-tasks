import * as path from 'path';

import { TaskMockRunner } from 'vsts-task-lib/mock-run';

import * as sinon from 'sinon';

const taskPath = path.join(__dirname, '..', 'androidsigning.js');
const taskRunner = new TaskMockRunner(taskPath);

const getInput = sinon.stub();
getInput.withArgs('files').returns('/some/path/*.apk');
getInput.withArgs('keystoreFile').returns('/some/store');
getInput.withArgs('keystorePass').returns('pass1');
getInput.withArgs('keystoreAlias').returns('somealias');
getInput.withArgs('keyPass').returns('pass2');
taskRunner.registerMockExport('getInput', getInput);

const getBoolInput = sinon.stub();
getBoolInput.withArgs('jarsign').returns(true);
getBoolInput.withArgs('zipalign').returns(true);
taskRunner.registerMockExport('getBoolInput', getBoolInput);

const getVariable = sinon.stub();
getVariable.withArgs('JAVA_HOME').returns('/fake/java/home');
getVariable.withArgs('ANDROID_HOME').returns('/fake/android/home');
taskRunner.registerMockExport('getVariable', getVariable);

const getTaskVariable = sinon.stub();
getTaskVariable.withArgs('KEYSTORE_FILE_PATH').returns('/some/store');
taskRunner.registerMockExport('getTaskVariable', getTaskVariable);

taskRunner.setAnswers({
    exec: {
        "/fake/java/home/bin/jarsigner -keystore /some/store -storepass pass1 -keypass pass2 -signedjar /some/path/a.apk /some/path/a.apk.unsigned somealias": {
            "code": 0,
            "stdout": "jarsigner output here"
        },
        "/fake/java/home/bin/jarsigner -keystore /some/store -storepass pass1 -keypass pass2 -signedjar /some/path/b.apk /some/path/b.apk.unsigned somealias": {
            "code": 0,
            "stdout": "jarsigner output here"
        },
        "/fake/android/home/sdk1/zipalign -v 4 /some/path/a.apk.unaligned /some/path/a.apk": {
            "code": 0,
            "stdout": "zipalign output here"
        },
        "/fake/android/home/sdk1/zipalign -v 4 /some/path/b.apk.unaligned /some/path/b.apk": {
            "code": 0,
            "stdout": "zipalign output here"
        }
    },
    checkPath: {
        "/some/path/a.apk": true,
        "/some/path/b.apk": true
    },
    findMatch: {
        "/some/path/*.apk": [
            "/some/path/a.apk",
            "/some/path/b.apk"
        ],
        "/fake/android/home": [
            "/fake/android/home/sdk1",
            "/fake/android/home/sdk2"
        ],
        "zipalign*": [
            "/fake/android/home/sdk1/zipalign",
            "/fake/android/home/sdk2/zipalign"
        ]
    }
});

taskRunner.run();

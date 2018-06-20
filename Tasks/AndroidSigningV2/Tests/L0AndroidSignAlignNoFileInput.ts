import * as path from 'path';

import * as ma from 'vsts-task-lib/mock-answer';
import * as tmrm from 'vsts-task-lib/mock-run';

import * as sinon from 'sinon';

let taskPath = path.join(__dirname, '..', 'androidsigning.js');
let tr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tr.setInput('files', '/some/path/nonexistent.apk');
tr.setInput('jarsign', 'true');
tr.setInput('zipalign', 'true');

const getVariable = sinon.stub();
getVariable.withArgs('AGENT_VERSION').returns('2.116.0');
getVariable.withArgs('HOME').returns('/users/test');
getVariable.withArgs('JAVA_HOME').returns('/fake/java/home');
getVariable.withArgs('ANDROID_HOME').returns('/fake/android/home');
tr.registerMockExport('getVariable', getVariable);

const getTaskVariable = sinon.stub();
getTaskVariable.withArgs('KEYSTORE_FILE_PATH').returns('/some/store');
tr.registerMockExport('getTaskVariable', getTaskVariable);

// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    "findMatch": {
        "/some/path/nonexistent.apk": [
        ]
    }
};
tr.setAnswers(a);

tr.run();





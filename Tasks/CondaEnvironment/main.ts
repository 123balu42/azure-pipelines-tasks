import * as path from 'path';
import * as task from 'vsts-task-lib/task';
import { getPlatform } from './taskutil';
import { condaEnvironment } from './conda';

(async () => {
    try {
        task.setResourcePath(path.join(__dirname, 'task.json'));
        await condaEnvironment({
        },
        getPlatform());
        task.setResult(task.TaskResult.Succeeded, "");
    } catch (error) {
        task.error(error.message);
        task.setResult(task.TaskResult.Failed, error.message);
    }
})();

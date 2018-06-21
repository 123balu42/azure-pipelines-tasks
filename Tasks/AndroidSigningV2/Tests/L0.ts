import * as assert from 'assert';
import * as path from 'path';

import { MockTestRunner} from 'vsts-task-lib/mock-test';

describe('AndroidSigning Suite', function () {
    this.timeout(parseInt(process.env.TASK_TEST_TIMEOUT) || 20000);
    before(() => {
    });

    after(() => {
    });

    it('Do not sign or zipalign if nothing is selected', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSkipSignAlign.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 0, 'should not run anything');
        assert(testRunner.stderr.length === 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');
    });

    it('Do not align or sign if input single file does not exist', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignAlignNoFileInput.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 0, 'should not run anything');
        assert(testRunner.errorIssues.length || testRunner.stderr.length > 0, 'should have written to stderr');
        assert(testRunner.failed, 'task should have failed');
    });

    it('Do not align or sign if input pattern does not match any files', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignAlignNoMatchingFileInput.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 0, 'should not run anything');
        assert(testRunner.errorIssues.length > 0 || testRunner.stderr.length > 0, 'should have written to stderr');
        assert(testRunner.failed, 'task should have failed');
    });

    it('Use jarsigner from PATH before searching in JAVA_HOME', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignAlignJarsignerFromPath.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 1, 'should have run jarsigner');
        assert(testRunner.stderr.length === 0, 'should have jarsigned file');
        assert(testRunner.succeeded, 'task should have succeeded');
    });

    it('Fail if jarsigner is not on PATH and JAVA_HOME is not set', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignAlignFailJarsignerNotFound.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 0, 'should not run anything');
        assert(testRunner.errorIssues.length > 0 || testRunner.stderr.length > 0, 'should have failed to locate jarsigner');
        assert(testRunner.failed, 'task should have failed');
    });

    it('Fail if ANDROID_HOME is not set', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignAlignAndroidHomeNotSet.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 0, 'should not run anything');
        assert(testRunner.errorIssues.length > 0 || testRunner.stderr.length > 0, 'should have failed to locate jarsigner');
        assert(testRunner.failed, 'task should have failed');
    });

    it('Signing a single file', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignSingleFile.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 1, 'should run jarsigner');
        assert(testRunner.errorIssues.length === 0 && testRunner.stderr.length === 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');
    });

    it('zipalign a single file', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidZipalignSingleFile.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 1, 'should run zipalign');
        assert(testRunner.errorIssues.length === 0 && testRunner.stderr.length === 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');
    });

    it('Signing and aligning multiple files', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0AndroidSignAlignMultipleFiles.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.invokedToolCount === 4, 'should have run jarsigner and zipalign twice each');
        assert(testRunner.errorIssues.length === 0 && testRunner.stderr.length === 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');
    });

    it('Download keystore file from SecureFile', function() {
        this.timeout(1000);

        const testPath = path.join(__dirname, 'L0DownloadKeystoreFile.js');
        const testRunner = new MockTestRunner(testPath);

        testRunner.run();

        assert(testRunner.stderr.length === 0, 'should not have written to stderr');
        assert(testRunner.succeeded, 'task should have succeeded');
    });
});

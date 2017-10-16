import * as tmrm from "vsts-task-lib/mock-run";
import * as tl from "vsts-task-lib";
import * as path from "path";
import * as mocks from "./L0Mocks";
var nock = require("nock");

let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(path.join(__dirname, '..', 'azuremonitoralerts.js'));

tmr.setInput("ConnectedServiceName", "azureRMSpn");
tmr.setInput("ResourceGroupName", "testRg");
tmr.setInput("ResourceType", "testResource.provider/type");
tmr.setInput("ResourceName", "testResourceName");
tmr.setInput("AlertRules", JSON.stringify(mocks.mockAlertRules));

nock("http://example.com", {
		reqheaders: {
        	'authorization': 'Bearer accessToken',
        	"accept": "application/json",
    		"user-agent": "TFS_useragent"
      	}
	})
	.get(/\/subscriptions\/sId\/resourceGroups\/testRg\/providers\/Microsoft.insights\/alertrules\/*/)
	.query({"api-version": "2016-03-01"})
	.reply(404)
	.persist();

nock("http://example.com", {
		reqheaders: {
        	"authorization": "Bearer accessToken",
        	"accept": "application/json",
    		"user-agent": "TFS_useragent"
      	}
	})
	.get("/subscriptions/sId/resourceGroups/testRg/resources")
	.query({
		"$filter": "resourceType EQ 'testResource.provider/type' AND name EQ 'testResourceName'" ,
		"api-version": "2017-05-10"
	})
	.reply(200, {
		value: [{ 
			id: "id",
			name: "myRule",
			location: "testlocation"
		}]
	})
	.persist();

nock("http://example.com", {
		reqheaders: {
        	"authorization": "Bearer accessToken",
        	"accept": "application/json",
		"content-type": "application/json; charset=utf-8",
    		"user-agent": "TFS_useragent"
      	}
	})
	.put(/\/subscriptions\/sId\/resourceGroups\/testRg\/providers\/Microsoft.insights\/alertrules\/Rule1/, mocks.getMetricRequestBody("Rule1", "testlocation", "GreaterThan", "metric1", "20", "PT5M"))
	.query({
		"api-version": "2016-03-01"
	})
	.reply(201);

nock("http://example.com", {
		reqheaders: {
        	"authorization": "Bearer accessToken",
        	"accept": "application/json",
		"content-type": "application/json; charset=utf-8",
    		"user-agent": "TFS_useragent"
      	}
	})
	.put(/\/subscriptions\/sId\/resourceGroups\/testRg\/providers\/Microsoft.insights\/alertrules\/Rule2/, mocks.getMetricRequestBody("Rule2", "testlocation", "LessThanOrEqual", "metric2", "10", "PT10M"))
	.query({
		"api-version": "2016-03-01"
	})
	.reply(201);

tmr.registerMock("./authorizationclient", mocks);
tmr.run();

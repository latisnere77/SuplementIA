"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// weaviate-admin.ts
var weaviate_admin_exports = {};
__export(weaviate_admin_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(weaviate_admin_exports);
var import_client_ecs = require("@aws-sdk/client-ecs");
var import_client_ec2 = require("@aws-sdk/client-ec2");
var CLUSTER = "suplementia-weaviate-oss-prod-cluster";
var SERVICE = "weaviate-service";
var ecsClient = new import_client_ecs.ECSClient({ region: process.env.AWS_REGION || "us-east-1" });
var ec2Client = new import_client_ec2.EC2Client({ region: process.env.AWS_REGION || "us-east-1" });
var handler = async (event) => {
  const { action } = JSON.parse(event.body);
  console.log(JSON.stringify({
    action,
    requestId: event.requestContext.requestId,
    sourceIp: event.requestContext.http?.sourceIp || event.requestContext.identity?.sourceIp || "unknown",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    cluster: CLUSTER,
    service: SERVICE
  }));
  try {
    switch (action) {
      case "start":
        await ecsClient.send(new import_client_ecs.UpdateServiceCommand({
          cluster: CLUSTER,
          service: SERVICE,
          desiredCount: 1
        }));
        console.log("Service start command executed successfully");
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            success: true,
            message: "Service starting. Wait ~2-3 minutes for full startup."
          })
        };
      case "stop":
        await ecsClient.send(new import_client_ecs.UpdateServiceCommand({
          cluster: CLUSTER,
          service: SERVICE,
          desiredCount: 0
        }));
        console.log("Service stop command executed successfully");
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            success: true,
            message: "Service stopping. This saves ~$1/hour."
          })
        };
      case "status":
        const serviceResponse = await ecsClient.send(new import_client_ecs.DescribeServicesCommand({
          cluster: CLUSTER,
          services: [SERVICE]
        }));
        const service = serviceResponse.services?.[0];
        if (!service) {
          return {
            statusCode: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Service not found" })
          };
        }
        const status = {
          desired: service.desiredCount || 0,
          running: service.runningCount || 0,
          pending: service.pendingCount || 0,
          publicIp: null,
          url: null
        };
        if (status.running > 0) {
          try {
            const tasksResponse = await ecsClient.send(new import_client_ecs.ListTasksCommand({
              cluster: CLUSTER,
              serviceName: SERVICE
            }));
            if (tasksResponse.taskArns && tasksResponse.taskArns.length > 0) {
              const taskDetailsResponse = await ecsClient.send(new import_client_ecs.DescribeTasksCommand({
                cluster: CLUSTER,
                tasks: [tasksResponse.taskArns[0]]
              }));
              const task = taskDetailsResponse.tasks?.[0];
              const eniId = task?.attachments?.[0]?.details?.find(
                (d) => d.name === "networkInterfaceId"
              )?.value;
              if (eniId) {
                const networkResponse = await ec2Client.send(
                  new import_client_ec2.DescribeNetworkInterfacesCommand({
                    NetworkInterfaceIds: [eniId]
                  })
                );
                const publicIp = networkResponse.NetworkInterfaces?.[0]?.Association?.PublicIp;
                if (publicIp) {
                  status.publicIp = publicIp;
                  status.url = `http://${publicIp}:8080`;
                }
              }
            }
          } catch (e) {
            console.error("Error getting IP:", e);
          }
        }
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({
            success: true,
            status
          })
        };
      default:
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Invalid action" })
        };
    }
  } catch (error) {
    console.error("Lambda execution error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to execute command",
        details: error.message
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});

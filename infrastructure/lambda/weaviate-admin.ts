import { ECSClient, UpdateServiceCommand, DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { EC2Client, DescribeNetworkInterfacesCommand } from '@aws-sdk/client-ec2';

const CLUSTER = 'suplementia-weaviate-oss-prod-cluster';
const SERVICE = 'weaviate-service';

const ecsClient = new ECSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });

interface AdminEvent {
    body: string;
    requestContext: {
        requestId: string;
        http?: {
            sourceIp: string;
        };
        identity?: {
            sourceIp: string;
        };
    };
}

export const handler = async (event: AdminEvent) => {
    const { action } = JSON.parse(event.body);

    // Audit logging
    console.log(JSON.stringify({
        action,
        requestId: event.requestContext.requestId,
        sourceIp: event.requestContext.http?.sourceIp || event.requestContext.identity?.sourceIp || 'unknown',
        timestamp: new Date().toISOString(),
        cluster: CLUSTER,
        service: SERVICE
    }));

    try {
        switch (action) {
            case 'start':
                await ecsClient.send(new UpdateServiceCommand({
                    cluster: CLUSTER,
                    service: SERVICE,
                    desiredCount: 1
                }));

                console.log('Service start command executed successfully');

                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'Service starting. Wait ~2-3 minutes for full startup.'
                    })
                };

            case 'stop':
                await ecsClient.send(new UpdateServiceCommand({
                    cluster: CLUSTER,
                    service: SERVICE,
                    desiredCount: 0
                }));

                console.log('Service stop command executed successfully');

                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        message: 'Service stopping. This saves ~$1/hour.'
                    })
                };

            case 'status':
                const serviceResponse = await ecsClient.send(new DescribeServicesCommand({
                    cluster: CLUSTER,
                    services: [SERVICE]
                }));

                const service = serviceResponse.services?.[0];
                if (!service) {
                    return {
                        statusCode: 404,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: 'Service not found' })
                    };
                }

                const status = {
                    desired: service.desiredCount || 0,
                    running: service.runningCount || 0,
                    pending: service.pendingCount || 0,
                    publicIp: null as string | null,
                    url: null as string | null
                };

                // Get public IP if running
                if (status.running > 0) {
                    try {
                        const tasksResponse = await ecsClient.send(new ListTasksCommand({
                            cluster: CLUSTER,
                            serviceName: SERVICE
                        }));

                        if (tasksResponse.taskArns && tasksResponse.taskArns.length > 0) {
                            const taskDetailsResponse = await ecsClient.send(new DescribeTasksCommand({
                                cluster: CLUSTER,
                                tasks: [tasksResponse.taskArns[0]]
                            }));

                            const task = taskDetailsResponse.tasks?.[0];
                            const eniId = task?.attachments?.[0]?.details?.find(
                                d => d.name === 'networkInterfaceId'
                            )?.value;

                            if (eniId) {
                                const networkResponse = await ec2Client.send(
                                    new DescribeNetworkInterfacesCommand({
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
                        console.error('Error getting IP:', e);
                    }
                }

                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        status
                    })
                };

            default:
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Invalid action' })
                };
        }
    } catch (error: any) {
        console.error('Lambda execution error:', error);

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Failed to execute command',
                details: error.message
            })
        };
    }
};

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CLUSTER = 'suplementia-weaviate-oss-prod-cluster';
const SERVICE = 'weaviate-service';

// Simple auth check - you can replace with proper auth later
function isAuthorized(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY || 'dev-key-change-me';
    return authHeader === `Bearer ${adminKey}`;
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { action } = await request.json();

        switch (action) {
            case 'start':
                await execAsync(`aws ecs update-service --cluster ${CLUSTER} --service ${SERVICE} --desired-count 1 --no-cli-pager`);
                return NextResponse.json({
                    success: true,
                    message: 'Service starting. Wait ~2-3 minutes for full startup.'
                });

            case 'stop':
                await execAsync(`aws ecs update-service --cluster ${CLUSTER} --service ${SERVICE} --desired-count 0 --no-cli-pager`);
                return NextResponse.json({
                    success: true,
                    message: 'Service stopping. This saves ~$1/hour.'
                });

            case 'status':
                const { stdout: serviceStatus } = await execAsync(
                    `aws ecs describe-services --cluster ${CLUSTER} --services ${SERVICE} --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount}' --output json`
                );

                const status = JSON.parse(serviceStatus);

                // Get public IP if running
                let publicIp = null;
                if (status.RunningCount > 0) {
                    try {
                        const { stdout: taskArn } = await execAsync(
                            `aws ecs list-tasks --cluster ${CLUSTER} --service-name ${SERVICE} --query 'taskArns[0]' --output text`
                        );

                        if (taskArn && taskArn !== 'None') {
                            const { stdout: eni } = await execAsync(
                                `aws ecs describe-tasks --cluster ${CLUSTER} --tasks ${taskArn.trim()} --query 'tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value' --output text`
                            );

                            if (eni) {
                                const { stdout: ip } = await execAsync(
                                    `aws ec2 describe-network-interfaces --network-interface-ids ${eni.trim()} --query 'NetworkInterfaces[0].Association.PublicIp' --output text`
                                );
                                publicIp = ip.trim();
                            }
                        }
                    } catch (e) {
                        console.error('Error getting IP:', e);
                    }
                }

                return NextResponse.json({
                    success: true,
                    status: {
                        desired: status.DesiredCount,
                        running: status.RunningCount,
                        pending: status.PendingCount,
                        publicIp: publicIp,
                        url: publicIp ? `http://${publicIp}:8080` : null
                    }
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Control error:', error);
        return NextResponse.json({
            error: 'Failed to execute command',
            details: error.message
        }, { status: 500 });
    }
}

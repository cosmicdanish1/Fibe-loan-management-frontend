
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Result, Button, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const NotFound: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        // Log detailed error info for debugging
        console.error(`[ROUTING ERROR] 404 Page Not Found`);
        console.error(`[ROUTING ERROR] Attempted Path: ${location.pathname}`);
        console.error(`[ROUTING ERROR] Search Params: ${location.search}`);
        console.error(`[ROUTING ERROR] Full URL: ${window.location.href}`);
    }, [location]);

    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <Result
                status="404"
                icon={<WarningOutlined className="text-red-500" />}
                title="Page Not Found"
                subTitle={
                    <div className="text-left max-w-md mx-auto bg-gray-100 p-4 rounded mt-4">
                        <Typography.Text type="danger" strong>Routing Error Details:</Typography.Text>
                        <div className="mt-2 text-xs font-mono text-gray-700">
                            <p><strong>Path:</strong> {location.pathname}</p>
                            <p><strong>Status:</strong> Route not defined in App.tsx</p>
                            <p className="mt-2">Please check if the route exists in <code>App.tsx</code> and matches the menu configuration.</p>
                        </div>
                    </div>
                }
                extra={
                    <Button type="primary" onClick={() => window.close()}>
                        Close Window
                    </Button>
                }
            />
        </div>
    );
};

export default NotFound;

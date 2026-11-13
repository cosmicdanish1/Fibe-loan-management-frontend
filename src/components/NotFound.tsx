
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Result, Button, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { reportEgg } from '../utils/eggHunt';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
    const location = useLocation();

    useEffect(() => {
        // Log detailed error info for debugging
        reportEgg('notfound');
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
                title={t('Page Not Found')}
                subTitle={
                    <div className="text-left max-w-md mx-auto bg-gray-100 p-4 rounded mt-4">
                        <Typography.Text type="danger" strong>{t('Routing Error Details:')}</Typography.Text>
                        <div className="mt-2 text-xs font-mono text-gray-700">
                            <p><strong>{t('Path:')}</strong> {location.pathname}</p>
                            <p><strong>{t('Status:')}</strong> {t('Route not defined in App.tsx')}</p>
                            <p className="mt-2">{t('Please check if the route exists in')} <code>{t('App.tsx')}</code> {t('and matches the menu configuration.')}</p>
                            {/* Easter egg #4 */}
                            <p className="mt-3 italic text-gray-500">Lost? We were too, once. Then we built this. - The Kova Studio</p>
                            <p className="mt-1 italic text-gray-500">Riddle: hold everything at once where the company signs its name; the ink is hiding.</p>
                        </div>
                    </div>
                }
                extra={
                    <Button type="primary" onClick={() => window.close()}>
                        {t('Close Window')}
                    </Button>
                }
            />
        </div>
    );
};

export default NotFound;

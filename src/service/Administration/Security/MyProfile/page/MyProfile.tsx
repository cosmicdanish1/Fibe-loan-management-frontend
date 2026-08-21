import React, { useState, useEffect, useRef } from 'react';
import {
    ConfigProvider,
    Tabs,
    Button,
    Input,
    Badge,
    Descriptions,
    Timeline,
    Tag,
    message
} from 'antd';
import {
    User,
    Mail,
    Phone,
    Briefcase,
    Shield,
    Key,
    Activity,
    Save,
    Camera,
    MapPin,
    Lock,
    History,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../auth/context/AuthContext';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { TabPane } = Tabs;

interface UserProfileData {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    department: string;
    role: string;
    joinDate: string;
    lastLogin: string;
    location: string;
    status: 'active' | 'inactive';
    activityLog: Array<{
        date: string;
        action: string;
        details: string;
        type: 'login' | 'security' | 'edit' | 'system';
    }>;
}

// Pixel/Dot Animation Component
const PixelCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Array<{ x: number, y: number, size: number, speedX: number, speedY: number, alpha: number }> = [];

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };

        const createParticles = () => {
            particles = [];
            const count = Math.floor((canvas.width * canvas.height) / 10000); // Density
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: (Math.random() - 0.5) * 0.5,
                    alpha: Math.random() * 0.5 + 0.1
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Connections
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)'; // Indigo-ish
            ctx.lineWidth = 0.5;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]!;

                // Update position
                p.x += p.speedX;
                p.y += p.speedY;

                // Bounce
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

                // Draw Particle
                ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j]!;
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 - dist / 1000})`;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        resize();
        createParticles();
        draw();

        window.addEventListener('resize', () => {
            resize();
            createParticles();
        });

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none opacity-50">
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};

const MyProfile: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Mock Data
    const [profileData, setProfileData] = useState<UserProfileData>({
        fullName: user?.username || 'Admin User',
        username: user?.username || 'admin',
        email: 'admin@loansystem.com',
        phone: '+91 98765 43210',
        department: 'IT Administration',
        role: user?.role || 'SUPER_ADMIN',
        joinDate: '15 Jan 2023',
        lastLogin: new Date().toLocaleString(),
        location: 'Mumbai, Head Office',
        status: 'active',
        activityLog: [
            { date: 'Today, 10:23 AM', action: 'System Login', details: 'Successful login from IP 192.168.1.45', type: 'login' },
            { date: 'Yesterday, 04:15 PM', action: 'Password Changed', details: 'Security policy update', type: 'security' },
            { date: '28 Dec, 11:00 AM', action: 'Role Updated', details: 'Granted higher privileges', type: 'system' },
            { date: '25 Dec, 09:30 AM', action: 'New Session', details: 'Login from new device', type: 'login' },
        ]
    });

    const [formData, setFormData] = useState(profileData);

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            setProfileData(formData);
            setEditMode(false);
            setLoading(false);
            message.success({ content: 'Profile Updated', icon: <Sparkles className="text-indigo-500" size={16} /> });
        }, 1000);
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'login': return <Key size={14} className="text-emerald-500" />;
            case 'security': return <Lock size={14} className="text-rose-500" />;
            case 'edit': return <Briefcase size={14} className="text-indigo-500" />;
            default: return <Activity size={14} className="text-slate-500" />;
        }
    };

    // Save Changes is only the page's active action while the profile form
    // is actually open for editing — mirrors the header button, which only
    // renders in editMode.
    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Save Changes',
        saveEnabled: editMode && !loading,
    });

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#6366f1',
                    borderRadius: 8,
                    fontFamily: "'Inter', sans-serif"
                }
            }}
        >
            <div className="min-h-screen bg-slate-50 p-6 font-sans relative">

                <div className="max-w-5xl mx-auto space-y-6 relative z-10">

                    {/* Header Card with Cool Animation */}
                    <div className="bg-white rounded-2xl p-0 shadow-sm border border-slate-200 relative overflow-hidden group">

                        {/* Animated Banner Background */}
                        <div className="absolute top-0 left-0 w-full h-40 bg-slate-900 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 z-10"></div>
                            <PixelCanvas /> {/* The pixel animation */}
                        </div>

                        <div className="relative pt-24 px-8 pb-8 flex flex-col md:flex-row items-start md:items-end gap-6 z-20">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="relative"
                            >
                                <div className="w-32 h-32 rounded-3xl bg-white p-1.5 shadow-xl rotate-3 transition-transform group-hover:rotate-0 duration-500">
                                    <div className="w-full h-full rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-slate-100">
                                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center text-4xl font-black text-white shadow-inner">
                                            {profileData.fullName.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <button className="absolute bottom-3 right-0 bg-white text-indigo-600 p-2.5 rounded-xl shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-50 hover:scale-110">
                                    <Camera size={16} />
                                </button>
                            </motion.div>

                            <div className="flex-1 mb-2 pl-2">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                            {profileData.fullName}
                                            {profileData.role === 'SUPER_ADMIN' && (
                                                <TooltipWrapper title="Verified Admin">
                                                    <Badge count={<Shield size={14} className="text-indigo-500" />} className="bg-transparent" />
                                                </TooltipWrapper>
                                            )}
                                        </h1>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-slate-500 font-bold fz-label uppercase tracking-wide flex items-center gap-1.5">
                                                <Briefcase size={12} className="text-indigo-400" /> {profileData.department}
                                            </span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-slate-500 font-bold fz-label uppercase tracking-wide flex items-center gap-1.5">
                                                <MapPin size={12} className="text-emerald-400" /> {profileData.location}
                                            </span>
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="flex gap-3"
                                    >
                                        <AnimatePresence mode="wait">
                                            {editMode ? (
                                                <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
                                                    <Button onClick={() => setEditMode(false)} className="font-bold border-slate-300 text-slate-600 hover:text-slate-800">Cancel</Button>
                                                    <Button type="primary" icon={<Save size={16} />} loading={loading} onClick={handleSave} className="bg-indigo-600 font-bold shadow-lg shadow-indigo-200">Save Changes</Button>
                                                </motion.div>
                                            ) : (
                                                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <Button onClick={() => setEditMode(true)} className="font-bold border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-200">Edit Profile</Button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                            >
                                <Tabs
                                    defaultActiveKey="1"
                                    type="card"
                                    tabBarStyle={{ marginBottom: 0, background: '#f8fafc', padding: '10px 10px 0' }}
                                    animated
                                >
                                    <TabPane tab="Personal Information" key="1">
                                        <div className="p-8">
                                            <Descriptions column={{ xxl: 2, xl: 2, lg: 1, md: 1, sm: 1, xs: 1 }} size="middle" layout="vertical" className="font-medium">
                                                <Descriptions.Item label={<span className="fz-caption font-black text-slate-400 uppercase tracking-widest">Full Name</span>}>
                                                    {editMode ? <Input className="font-bold" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} /> : <span className="font-bold text-slate-700 fz-body">{profileData.fullName}</span>}
                                                </Descriptions.Item>

                                                <Descriptions.Item label={<span className="fz-caption font-black text-slate-400 uppercase tracking-widest">Email Address</span>}>
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Mail size={16} className="text-indigo-400" />
                                                        {editMode ? <Input className="font-bold" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /> : <span className="font-semibold">{profileData.email}</span>}
                                                    </div>
                                                </Descriptions.Item>

                                                <Descriptions.Item label={<span className="fz-caption font-black text-slate-400 uppercase tracking-widest">Phone</span>}>
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Phone size={16} className="text-emerald-400" />
                                                        {editMode ? <Input className="font-bold" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /> : <span className="font-semibold">{profileData.phone}</span>}
                                                    </div>
                                                </Descriptions.Item>

                                                <Descriptions.Item label={<span className="fz-caption font-black text-slate-400 uppercase tracking-widest">Department</span>}>
                                                    {editMode ? <Input className="font-bold" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} /> : <span className="font-bold text-slate-700">{profileData.department}</span>}
                                                </Descriptions.Item>
                                            </Descriptions>

                                            <div className="mt-8 border-t border-slate-100 pt-8">
                                                <h3 className="fz-label font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                    <Shield size={14} /> System Identity
                                                </h3>
                                                <Descriptions column={2} layout="vertical">
                                                    <Descriptions.Item label={<span className="fz-caption font-black text-slate-400 uppercase tracking-widest">Username</span>}>
                                                        <div className="flex items-center gap-2">
                                                            <User size={16} className="text-slate-400" />
                                                            <span className="font-mono bg-slate-100 px-3 py-1 rounded-md text-slate-600 font-bold">{profileData.username}</span>
                                                        </div>
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label={<span className="fz-caption font-black text-slate-400 uppercase tracking-widest">Role</span>}>
                                                        <Tag color="purple" bordered={false} className="px-3 py-1 rounded-md font-bold uppercase fz-caption tracking-wide flex items-center gap-1 w-fit">
                                                            <Key size={10} /> {profileData.role}
                                                        </Tag>
                                                    </Descriptions.Item>
                                                </Descriptions>
                                            </div>
                                        </div>
                                    </TabPane>
                                    <TabPane tab="Security & Authentincation" key="2">
                                        <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                                            <div className="p-6 bg-slate-50 rounded-full text-indigo-500 shadow-inner">
                                                <Lock size={48} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <h3 className="fz-heading font-black text-slate-800 tracking-tight">Password Management</h3>
                                                <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium fz-body">Update your password regularly to keep your account secure.</p>
                                            </div>
                                            <Button type="primary" ghost size="large" icon={<Key size={16} />} className="font-bold uppercase tracking-wide fz-label h-10 px-8">
                                                Change Password
                                            </Button>
                                        </div>
                                    </TabPane>
                                </Tabs>
                            </motion.div>
                        </div>

                        {/* Activity */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <History size={18} className="text-indigo-500" />
                                        <h3 className="fz-label font-black text-slate-800 uppercase tracking-wide">Recent Activity</h3>
                                    </div>
                                    <Badge dot color="blue" />
                                </div>

                                <Timeline
                                    className="custom-timeline"
                                    items={profileData.activityLog.map((log) => ({
                                        dot: getLogIcon(log.type),
                                        children: (
                                            <div className="mb-6 last:mb-0 group cursor-default">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-slate-700 fz-label group-hover:text-indigo-600 transition-colors">{log.action}</span>
                                                    <span className="fz-caption text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded">{log.date}</span>
                                                </div>
                                                <p className="fz-label text-slate-500 mt-1 leading-relaxed font-medium">{log.details}</p>
                                            </div>
                                        )
                                    }))}
                                />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden ring-1 ring-white/10"
                            >
                                <Activity className="absolute -right-6 -bottom-6 text-indigo-500/20 w-40 h-40 animate-pulse" />
                                <h3 className="fz-caption font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles size={12} /> Live Session
                                </h3>
                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                    <div>
                                        <span className="fz-caption text-slate-500 block uppercase font-black tracking-wider">Device ID</span>
                                        <p className="fz-label font-mono font-bold mt-1 text-slate-300">WIN-X86-22</p>
                                    </div>
                                    <div>
                                        <span className="fz-caption text-slate-500 block uppercase font-black tracking-wider">Location</span>
                                        <p className="fz-label font-mono font-bold mt-1 text-slate-300">Mumbai, IN</p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-white/5">
                                        <span className="fz-caption text-slate-500 block uppercase font-black tracking-wider">Current IP Address</span>
                                        <p className="fz-body font-mono font-bold mt-1 text-emerald-400 tracking-wide">192.168.1.45</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                </div>
            </div>
        </ConfigProvider>
    );
};

// Helper
const TooltipWrapper = ({ title, children }: any) => {
    return (
        <div title={title} className="cursor-help">
            {children}
        </div>
    )
}

export default MyProfile;

import React, { useState } from 'react';
import { Outlet, useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, 
    ListItemIcon, ListItemText, Box, Divider, Avatar, Menu, MenuItem, Tooltip, 
    ListItemButton, useTheme, useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DesignServicesIcon from '@mui/icons-material/DesignServices';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import PublicIcon from '@mui/icons-material/Public';

const drawerWidth = 260;

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorElUser, setAnchorElUser] = useState(null);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleLogout = () => {
        handleCloseUserMenu();
        logout();
    };
    
    const handleProfile = () => {
        handleCloseUserMenu();
        navigate('/profile');
    };

    const isActiveRoute = (path) => location.pathname === path;

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Services', icon: <DesignServicesIcon />, path: '/services' },
        { text: 'Incidents', icon: <ReportProblemIcon />, path: '/incidents' },
        { text: 'Teams', icon: <PeopleIcon />, path: '/teams' },
    ];

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '64px',
                borderBottom: `1px solid ${theme.palette.divider}`
            }}>
                <Typography 
                    variant="h6" 
                    component={RouterLink} 
                    to="/dashboard" 
                    sx={{ 
                        fontWeight: 'bold', 
                        color: theme.palette.primary.main,
                        textDecoration: 'none' 
                    }}
                >
                    Status Page
                </Typography>
            </Box>
            
            <Box sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1, px: 1 }}>
                    MAIN MENU
                </Typography>
                <List disablePadding>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component={RouterLink}
                                to={item.path}
                                selected={isActiveRoute(item.path)}
                                onClick={mobileOpen ? handleDrawerToggle : undefined}
                                sx={{
                                    borderRadius: 2,
                                    py: 1,
                                    '&.Mui-selected': {
                                        bgcolor: `${theme.palette.primary.main}15`,
                                        color: theme.palette.primary.main,
                                        '&:hover': {
                                            bgcolor: `${theme.palette.primary.main}25`,
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: theme.palette.primary.main,
                                        }
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
            
            {user && user.organization_slug && (
                <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1, px: 1 }}>
                        EXTERNAL
                    </Typography>
                    <List disablePadding>
                        <ListItem disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                component="a"
                                href={`/status/${user.organization_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ borderRadius: 2, py: 1 }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <PublicIcon />
                                </ListItemIcon>
                                <ListItemText primary="Public Status Page" />
                            </ListItemButton>
                        </ListItem>
                    </List>
                </Box>
            )}
        </Box>
    );

    const getAvatarContent = () => {
        if (user?.username) {
            return user.username.charAt(0).toUpperCase();
        } else if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return <AccountCircleIcon />; 
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: 'white',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    boxShadow: 'none',
                }}
            >
                <Toolbar>
                    <IconButton
                        color="primary"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography 
                        variant="h6" 
                        component="div" 
                        sx={{ 
                            flexGrow: 1, 
                            color: theme.palette.text.primary,
                            fontWeight: 600,
                            display: { xs: 'none', sm: 'block' }
                        }}
                    >
                        {menuItems.find(item => isActiveRoute(item.path))?.text || 'Dashboard'}
                    </Typography>
                    
                    {user ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {!isMobile && (
                                <Typography variant="body2" sx={{ mr: 2, color: theme.palette.text.secondary }}>
                                    {user.username || user.email}
                                </Typography>
                            )}
                            <Tooltip title="Account settings">
                                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0.5 }}>
                                    <Avatar 
                                        alt={user.username || user.email}
                                        sx={{ 
                                            width: 38, 
                                            height: 38,
                                            bgcolor: theme.palette.primary.main,
                                            color: 'white',
                                            fontWeight: 500
                                        }}
                                    > 
                                        {getAvatarContent()}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>
                            <Menu
                                sx={{ mt: '45px' }}
                                id="menu-appbar"
                                anchorEl={anchorElUser}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                keepMounted
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                open={Boolean(anchorElUser)}
                                onClose={handleCloseUserMenu}
                                PaperProps={{
                                    elevation: 2,
                                    sx: { 
                                        minWidth: 180,
                                        borderRadius: 2,
                                        mt: 1.5,
                                    }
                                }}
                            >
                                <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                                    <ListItemIcon sx={{ color: theme.palette.text.primary }}>
                                        <AccountCircleIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary="Profile" />
                                </MenuItem>
                                <Divider />
                                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                                    <ListItemIcon sx={{ color: theme.palette.error.main }}>
                                        <ExitToAppIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary="Logout" primaryTypographyProps={{ color: theme.palette.error.main }} />
                                </MenuItem>
                            </Menu>
                        </Box>
                    ) : (
                        <Button 
                            color="primary" 
                            variant="contained"
                            component={RouterLink} 
                            to="/login"
                        >
                            Login
                        </Button>
                    )}
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, 
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { 
                            boxSizing: 'border-box', 
                            width: drawerWidth,
                            borderRight: 'none',
                            boxShadow: 3
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { 
                            boxSizing: 'border-box', 
                            width: drawerWidth,
                            borderRight: `1px solid ${theme.palette.divider}`
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ 
                    flexGrow: 1, 
                    p: 3, 
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    bgcolor: theme.palette.background.default,
                    height: '100vh',
                    overflow: 'auto',
                    pb: 10
                }}
            >
                <Toolbar />
                <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;

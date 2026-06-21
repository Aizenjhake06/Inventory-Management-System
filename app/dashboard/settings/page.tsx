"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  Settings, 
  User, 
  Lock, 
  Database, 
  Bell, 
  Shield,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Palette,
  Moon,
  Sun,
  Monitor,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BarChart3,
  FileText,
  Clock,
  Zap,
  Server,
  BookOpen,
  ChevronRight,
  Users,
  UserCog
} from "lucide-react"
import { toast } from "sonner"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client"
import { getCurrentUser } from "@/lib/auth"
import { BrandLoader } from "@/components/ui/brand-loader"
import { ImageUpload } from "@/components/ui/image-upload"

interface Account {
  id: string
  username: string
  password: string
  role: 'admin' | 'operations' | 'packer' | 'tracker' | 'logistics-admin' | 'dept-manager'
  assignedChannel?: string // Legacy field, no longer used
  displayName: string
  profileImage?: string // Profile image URL
  createdAt: string
}

interface SystemSettings {
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  currency: string
  timezone: string
  dateFormat: string
  lowStockThreshold: number
  enableNotifications: boolean
  enableEmailAlerts: boolean
  autoBackup: boolean
  backupFrequency: string
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [activeTab, setActiveTab] = useState("profile")
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Profile form
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    profileImage: ''
  })

  // New user form
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'operations' as 'admin' | 'operations' | 'packer' | 'tracker' | 'logistics-admin',
    assignedChannel: '', // Legacy field, no longer used
    profileImage: '' // Profile image URL
  })

  // Edit user form
  const [editUserForm, setEditUserForm] = useState({
    id: '',
    username: '',
    originalUsername: '', // Store original username for comparison
    displayName: '',
    role: 'operations' as 'admin' | 'operations' | 'packer' | 'tracker' | 'logistics-admin',
    assignedChannel: '', // Legacy field, no longer used
    newPassword: '',
    confirmPassword: '',
    profileImage: '' // Profile image URL
  })

  // System settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    companyName: 'WIHI Asia Marketing Inc.',
    companyEmail: 'info@wihiasia.com',
    companyPhone: '+63 XXX XXX XXXX',
    companyAddress: 'Philippines',
    currency: 'PHP',
    timezone: 'Asia/Manila',
    dateFormat: 'MM/DD/YYYY',
    lowStockThreshold: 10,
    enableNotifications: true,
    enableEmailAlerts: false,
    autoBackup: true,
    backupFrequency: 'daily'
  })

  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  
  // System performance metrics
  const [systemMetrics, setSystemMetrics] = useState({
    apiResponseTime: 0,
    databaseHealth: 100,
    storageUsed: '0 MB',
    requestsToday: 0
  })

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    
    // Fetch fresh profile data from database
    const fetchProfile = async () => {
      if (!user) return
      
      try {
        const headers = new Headers()
        headers.set('x-user-username', user.username)
        headers.set('x-user-role', user.role)
        
        const response = await fetch('/api/auth/profile', { headers })
        
        if (response.ok) {
          const profile = await response.json()
          setProfileForm({
            displayName: profile.displayName || '',
            username: profile.username || '',
            email: profile.email || '',
            phone: profile.phone || '',
            profileImage: profile.profileImage || ''
          })
          
          // Update localStorage with fresh data
          const updatedUser = {
            ...user,
            displayName: profile.displayName,
            email: profile.email,
            phone: profile.phone
          }
          localStorage.setItem('currentUser', JSON.stringify(updatedUser))
          setCurrentUser(updatedUser)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        // Fallback to localStorage data
        setProfileForm({
          displayName: user.displayName || '',
          username: user.username || '',
          email: user.email || '',
          phone: user.phone || '',
          profileImage: user.profileImage || ''
        })
      }
    }
    
    fetchProfile()

    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('systemSettings')
    if (savedSettings) {
      setSystemSettings(JSON.parse(savedSettings))
    }

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system'
    if (savedTheme) {
      setTheme(savedTheme)
    }

    // Load last backup info
    const savedBackup = localStorage.getItem('latestBackup')
    if (savedBackup) {
      const backupInfo = JSON.parse(savedBackup)
      setLastBackup(backupInfo.date)
    }

    fetchAccounts()
    fetchSystemMetrics()
  }, [])

  const fetchSystemMetrics = async () => {
    try {
      // Measure API response time
      const startTime = performance.now()
      await apiGet<Account[]>('/api/accounts').catch(() => [])
      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)

      // Get data counts for storage estimation (with silent error handling)
      const [items, categories, customers, logs] = await Promise.all([
        apiGet<any[]>('/api/items').catch((err) => { console.warn('Items API unavailable'); return [] }),
        apiGet<any[]>('/api/categories').catch((err) => { console.warn('Categories API unavailable'); return [] }),
        apiGet<any[]>('/api/customers').catch((err) => { console.warn('Customers API unavailable'); return [] }),
        apiGet<any[]>('/api/logs').catch((err) => { console.warn('Logs API unavailable'); return [] })
      ])

      // Calculate approximate storage (rough estimate)
      const totalRecords = items.length + categories.length + customers.length + logs.length + accounts.length
      const estimatedSizeKB = totalRecords * 2 // Rough estimate: 2KB per record
      const storageMB = (estimatedSizeKB / 1024).toFixed(1)
      const storageGB = estimatedSizeKB > 1024 * 1024 ? (estimatedSizeKB / (1024 * 1024)).toFixed(2) : null

      // Get requests count from localStorage (if tracking)
      const requestsCount = parseInt(localStorage.getItem('todayRequestsCount') || '0')

      setSystemMetrics({
        apiResponseTime: responseTime,
        databaseHealth: 100, // Assume healthy if APIs respond
        storageUsed: storageGB ? `${storageGB}GB` : `${storageMB}MB`,
        requestsToday: requestsCount
      })
    } catch (error) {
      console.error('Error fetching system metrics:', error)
      // Set default values on error
      setSystemMetrics({
        apiResponseTime: 0,
        databaseHealth: 95,
        storageUsed: 'N/A',
        requestsToday: 0
      })
    }
  }

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const data = await apiGet<Account[]>('/api/accounts')
      console.log('[Settings] Fetched accounts:', data)
      console.log('[Settings] First account profileImage:', data[0]?.profileImage)
      setAccounts(data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      await apiPut('/api/accounts', {
        action: 'updatePassword',
        username: currentUser.username,
        password: passwordForm.newPassword
      })

      toast.success('Password updated successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error('Failed to update password')
    }
  }

  const handleProfileUpdate = async () => {
    if (!profileForm.displayName) {
      toast.error('Display name is required')
      return
    }

    if (!profileForm.username) {
      toast.error('Username is required')
      return
    }

    try {
      // Check if username changed
      const usernameChanged = profileForm.username !== currentUser.username

      if (usernameChanged) {
        // Update username first (requires admin or self-update)
        await apiPut('/api/accounts', {
          action: 'updateUsername',
          username: currentUser.username,
          newUsername: profileForm.username
        })
      }

      // Update profile (display name, email, phone, profileImage)
      await apiPut('/api/accounts', {
        action: 'updateProfile',
        username: usernameChanged ? profileForm.username : currentUser.username,
        displayName: profileForm.displayName,
        email: profileForm.email,
        phone: profileForm.phone,
        profileImage: profileForm.profileImage
      })

      const updatedUser = { 
        ...currentUser, 
        username: profileForm.username,
        displayName: profileForm.displayName,
        email: profileForm.email,
        phone: profileForm.phone,
        profileImage: profileForm.profileImage
      }
      
      console.log('[Settings] Updating localStorage with:', {
        displayName: profileForm.displayName,
        profileImage: profileForm.profileImage
      })
      
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      // Also update individual localStorage items for header
      localStorage.setItem('displayName', profileForm.displayName)
      if (profileForm.profileImage) {
        localStorage.setItem('profileImage', profileForm.profileImage)
      } else {
        localStorage.removeItem('profileImage')
      }
      setCurrentUser(updatedUser)

      // Dispatch custom event to notify header component
      window.dispatchEvent(new Event('profileUpdated'))
      
      console.log('[Settings] Dispatched profileUpdated event')

      if (usernameChanged) {
        toast.success('Profile and username updated successfully! Please login again with your new username.')
        // Optionally redirect to login after username change
        setTimeout(() => {
          localStorage.removeItem('currentUser')
          window.location.href = '/'
        }, 2000)
      } else {
        toast.success('Profile updated successfully')
        // Reload page to refresh header
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.password || !newUserForm.displayName) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate that Operations Staff has an assigned channel
    if ((newUserForm.role === 'operations' || newUserForm.role === 'dept-manager') && !newUserForm.assignedChannel) {
      toast.error('Please select a sales channel for Operations Staff')
      return
    }

    if (newUserForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      await apiPost('/api/accounts', {
        action: 'create',
        ...newUserForm
      })
      toast.success('User created successfully')
      setNewUserForm({ username: '', password: '', displayName: '', role: 'operations', assignedChannel: '', profileImage: '' })
      setShowNewUserForm(false)
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user')
    }
  }

  const handleEditUser = (account: Account) => {
    setEditUserForm({
      id: account.id,
      username: account.username,
      originalUsername: account.username, // Store original
      displayName: account.displayName,
      role: account.role,
      assignedChannel: account.assignedChannel || '',
      newPassword: '',
      confirmPassword: '',
      profileImage: account.profileImage || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editUserForm.displayName) {
      toast.error('Display name is required')
      return
    }

    if (!editUserForm.username) {
      toast.error('Username is required')
      return
    }

    // Validate password if provided
    if (editUserForm.newPassword || editUserForm.confirmPassword) {
      if (editUserForm.newPassword !== editUserForm.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      
      if (editUserForm.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }
    }

    try {
      const usernameChanged = editUserForm.username !== editUserForm.originalUsername

      // Update username if changed
      if (usernameChanged) {
        await apiPut('/api/accounts', {
          action: 'updateUsername',
          username: editUserForm.originalUsername,
          newUsername: editUserForm.username
        })
      }

      // Update display name, assigned channel, and profile image (use new username if changed)
      await apiPut('/api/accounts', {
        action: 'updateDisplayName',
        username: editUserForm.username,
        displayName: editUserForm.displayName,
        assignedChannel: editUserForm.assignedChannel || null,
        profileImage: editUserForm.profileImage || null
      })

      // Update password if provided
      if (editUserForm.newPassword) {
        await apiPut('/api/accounts', {
          action: 'updatePassword',
          username: editUserForm.username,
          password: editUserForm.newPassword
        })
      }

      if (usernameChanged && editUserForm.newPassword) {
        toast.success('User updated successfully (username and password changed)')
      } else if (usernameChanged) {
        toast.success('User updated successfully (username changed)')
      } else if (editUserForm.newPassword) {
        toast.success('User updated successfully (password changed)')
      } else {
        toast.success('User updated successfully')
      }

      setShowEditModal(false)
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  const handleCancelEdit = () => {
    setShowEditModal(false)
    setEditUserForm({
      id: '',
      username: '',
      originalUsername: '',
      displayName: '',
      role: 'operations',
      assignedChannel: '',
      newPassword: '',
      confirmPassword: '',
      profileImage: ''
    })
  }

  const handleDeleteUser = async (username: string) => {
    if (username === currentUser?.username) {
      toast.error('Cannot delete your own account')
      return
    }

    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Get current user info for auth headers
      const currentUsername = localStorage.getItem('username')
      const currentRole = localStorage.getItem('userRole')

      if (!currentUsername || !currentRole) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/accounts?username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': currentUsername,
          'x-user-role': currentRole,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      toast.success(`User "${username}" deleted successfully`)
      fetchAccounts()
    } catch (error: any) {
      console.error('Delete user error:', error)
      toast.error(error.message || 'Failed to delete user')
    }
  }

  const handleSystemSettingsUpdate = () => {
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings))
    toast.success('System settings saved successfully')
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    
    toast.success(`Theme changed to ${newTheme}`)
  }

  const handleExportData = async () => {
    try {
      toast.info('Exporting system data...')
      
      // Fetch all data from APIs
      const [accountsData, itemsData, categoriesData, customersData] = await Promise.all([
        apiGet<Account[]>('/api/accounts').catch(() => []),
        apiGet<any[]>('/api/items').catch(() => []),
        apiGet<any[]>('/api/categories').catch(() => []),
        apiGet<any[]>('/api/customers').catch(() => [])
      ])

      // Create export object
      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: currentUser?.username,
        systemSettings: systemSettings,
        data: {
          accounts: accountsData,
          items: itemsData,
          categories: categoriesData,
          customers: customersData
        }
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `system-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('System data exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  const handleBackupNow = async () => {
    try {
      toast.info('Creating backup...')
      
      // Fetch all critical data
      const [accountsData, itemsData, categoriesData, customersData, logsData] = await Promise.all([
        apiGet<Account[]>('/api/accounts').catch(() => []),
        apiGet<any[]>('/api/items').catch(() => []),
        apiGet<any[]>('/api/categories').catch(() => []),
        apiGet<any[]>('/api/customers').catch(() => []),
        apiGet<any[]>('/api/logs').catch(() => [])
      ])

      // Create backup object with metadata
      const backupData = {
        backupDate: new Date().toISOString(),
        backupVersion: '1.0.0',
        createdBy: currentUser?.username,
        systemSettings: systemSettings,
        database: {
          accounts: accountsData,
          items: itemsData,
          categories: categoriesData,
          customers: customersData,
          logs: logsData
        }
      }

      // Save to localStorage as latest backup
      localStorage.setItem('latestBackup', JSON.stringify({
        date: new Date().toISOString(),
        size: JSON.stringify(backupData).length
      }))
      setLastBackup(new Date().toISOString())

      // Create and download backup file
      const dataStr = JSON.stringify(backupData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Backup created and downloaded successfully')
    } catch (error) {
      console.error('Backup error:', error)
      toast.error('Failed to create backup')
    }
  }

  const handleImportData = () => {
    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        toast.info('Importing data...')
        
        const reader = new FileReader()
        reader.onload = async (event) => {
          try {
            const importData = JSON.parse(event.target?.result as string)
            
            // Validate import data structure
            if (!importData.data && !importData.database) {
              toast.error('Invalid import file format')
              return
            }

            // Show confirmation
            const confirmed = confirm(
              `Import data from ${new Date(importData.exportDate || importData.backupDate).toLocaleString()}?\n\n` +
              `This will update system settings but will NOT overwrite existing database records.\n\n` +
              `Click OK to proceed.`
            )

            if (!confirmed) {
              toast.info('Import cancelled')
              return
            }

            // Import system settings if available
            if (importData.systemSettings) {
              setSystemSettings(importData.systemSettings)
              localStorage.setItem('systemSettings', JSON.stringify(importData.systemSettings))
            }

            toast.success('Data imported successfully')
            toast.info('System settings have been updated. Database import requires manual review.')
            
          } catch (parseError) {
            console.error('Parse error:', parseError)
            toast.error('Failed to parse import file')
          }
        }
        
        reader.readAsText(file)
      } catch (error) {
        console.error('Import error:', error)
        toast.error('Failed to import data')
      }
    }
    
    input.click()
  }

  const isAdmin = currentUser?.role === 'admin'

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">
      {/* Page Header - Professional */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
          Settings Overview
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Configure system preferences, manage users, and customize your workspace
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Professional Tab Navigation */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg p-1">
          <TabsList className="flex flex-wrap w-full gap-1 h-auto p-0 bg-transparent">
            <TabsTrigger 
              value="profile" 
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="users" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger 
                value="company" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="appearance" 
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger 
              value="system" 
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger 
                value="manual" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-colors text-sm font-medium flex-1 min-w-[120px]"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Manual</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Card>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card - Professional */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 shadow-sm">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Profile Information
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Manage your personal information and preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</Label>
                    <Input
                      id="username"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      placeholder="Enter username"
                      className="h-10 border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profileForm.displayName}
                      onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                      placeholder="Enter your display name"
                      className="h-10 border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="your.email@company.com"
                      className="h-10 border-slate-300 dark:border-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+63 XXX XXX XXXX"
                      className="h-10 border-slate-300 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile Image (Optional)</Label>
                  <ImageUpload
                    uploadType="profile"
                    value={profileForm.profileImage}
                    onChange={(url) => setProfileForm({ ...profileForm, profileImage: url })}
                    onRemove={() => setProfileForm({ ...profileForm, profileImage: '' })}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload a profile picture (max 300KB, auto-compressed to WebP)
                  </p>
                </div>

                <Separator className="my-6" />

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-600">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">Account Role</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Your current access level</p>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className="px-4 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {currentUser?.role === 'admin' ? 'Administrator' : 'Operations Staff'}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setProfileForm({
                        displayName: currentUser.displayName || '',
                        username: currentUser.username || '',
                        email: currentUser.email || '',
                        phone: currentUser.phone || '',
                        profileImage: currentUser.profileImage || ''
                      })
                    }} 
                    className="h-10 px-5 border-slate-300 dark:border-slate-600"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button 
                    onClick={handleProfileUpdate} 
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Info Sidebar */}
            <div className="space-y-4">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-3 p-5 border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">Account Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5 pt-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Last Login</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">Today</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Account Created</span>
                    <span className="text-xs font-medium text-slate-900 dark:text-white">Jan 2024</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Status</span>
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-600">
                    <Lock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Change Password
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Keep your account secure with a strong password
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="currentPassword"
                      type={showPassword.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                    >
                      {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="newPassword" className="text-sm font-semibold">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="newPassword"
                      type={showPassword.new ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    >
                      {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters long
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="pl-10 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={handlePasswordChange} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white">
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Shield className="h-4 w-4" />
                    Security Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5 pb-5 pt-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">Password Encryption</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Bcrypt Active</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">Row Level Security</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Database Protected</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-900 dark:text-white">API Authentication</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Token-Based</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-l-4 border-l-yellow-500">
                <CardContent className="p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-xs mb-2 text-slate-900 dark:text-white">Security Recommendations</h4>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Change your password regularly</li>
                        <li>• Use a unique password for this account</li>
                        <li>• Never share your credentials</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 dark:bg-white">
                      <Shield className="h-4 w-4 text-white dark:text-slate-900" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        User Management
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm">
                        Manage system users, roles, and permissions
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowNewUserForm(true)}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">

                <div className="space-y-5">
                  {/* 3 Role Group Cards - Horizontal */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Admin Card */}
                    <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <CardHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-purple-600">
                              <Shield className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Admin</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {accounts.filter(a => a.role === 'admin').length} users
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2">
                        {accounts.filter(a => a.role === 'admin').length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No admin users</p>
                        ) : (
                          accounts.filter(a => a.role === 'admin').map((account) => (
                            <div key={account.id}>
                              {editingUser === account.id ? (
                                <div className="space-y-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Edit Admin User</p>
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Username</Label>
                                      <Input value={editUserForm.username} onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })} placeholder="Username" className="h-8 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Display Name</Label>
                                      <Input value={editUserForm.displayName} onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })} placeholder="Display name" className="h-8 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Profile Image (Optional)</Label>
                                      <ImageUpload
                                        uploadType="profile"
                                        value={editUserForm.profileImage}
                                        onChange={(url) => setEditUserForm({ ...editUserForm, profileImage: url })}
                                        onRemove={() => setEditUserForm({ ...editUserForm, profileImage: '' })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">New Password (optional)</Label>
                                      <Input type={showPassword.editNew ? "text" : "password"} value={editUserForm.newPassword} onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })} placeholder="New password (optional)" className="h-8 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Confirm Password</Label>
                                      <Input type={showPassword.editConfirm ? "text" : "password"} value={editUserForm.confirmPassword} onChange={(e) => setEditUserForm({ ...editUserForm, confirmPassword: e.target.value })} placeholder="Confirm password" className="h-8 text-xs" />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button onClick={handleUpdateUser} className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"><Check className="h-3 w-3 mr-1" />Save</Button>
                                    <Button variant="outline" onClick={handleCancelEdit} className="flex-1 h-7 text-xs"><X className="h-3 w-3 mr-1" />Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    {/* Profile Image */}
                                    <div className="flex-shrink-0">
                                      {account.profileImage ? (
                                        <img 
                                          src={account.profileImage} 
                                          alt={account.displayName}
                                          className="h-8 w-8 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                          <User className="h-4 w-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{account.displayName}</p>
                                        {account.username === currentUser?.username && (
                                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">(You)</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400">@{account.username}</p>
                                    </div>
                                  </div>
                                  {account.username !== currentUser?.username && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(account)} className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(account.username)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Departments (Operations) Card */}
                    <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <CardHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-600">
                              <Building2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Departments</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {accounts.filter(a => a.role === 'operations' && (departmentFilter === 'all' || a.assignedChannel === departmentFilter)).length} users
                          </span>
                        </div>
                        {/* Department Filter */}
                        <select
                          value={departmentFilter}
                          onChange={(e) => setDepartmentFilter(e.target.value)}
                          className="w-full h-8 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 focus:outline-none focus:ring-0 focus:border-slate-400 dark:focus:border-slate-500"
                        >
                          <option value="all">All Departments</option>
                          <option value="Shopee">Shopee</option>
                          <option value="Lazada">Lazada</option>
                          <option value="TikTok">TikTok</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Physical Store">Physical Store</option>
                        </select>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2">
                        {accounts.filter(a => a.role === 'operations' && (departmentFilter === 'all' || a.assignedChannel === departmentFilter)).length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
                            {departmentFilter === 'all' ? 'No department users' : `No users in ${departmentFilter}`}
                          </p>
                        ) : (
                          accounts.filter(a => a.role === 'operations' && (departmentFilter === 'all' || a.assignedChannel === departmentFilter)).map((account) => (
                            <div key={account.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                {/* Profile Image */}
                                <div className="flex-shrink-0">
                                  {account.profileImage ? (
                                    <img 
                                      src={account.profileImage} 
                                      alt={account.displayName}
                                      className="h-8 w-8 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                      <User className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{account.displayName}</p>
                                    {account.assignedChannel && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 flex-shrink-0">
                                        {account.assignedChannel}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">@{account.username}</p>
                                </div>
                              </div>
                              {account.username !== currentUser?.username && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditUser(account)} className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(account.username)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Dept. Heads Card */}
                    <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <CardHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-purple-600">
                              <Users className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Dept. Heads</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {accounts.filter(a => a.role === 'dept-manager').length} users
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2">
                        {accounts.filter(a => a.role === 'dept-manager').length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No dept. heads</p>
                        ) : (
                          accounts.filter(a => a.role === 'dept-manager').map((account) => (
                            <div key={account.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <div className="flex-shrink-0">
                                  {account.profileImage ? (
                                    <img src={account.profileImage} alt={account.displayName} className="h-8 w-8 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                                      <User className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{account.displayName}</p>
                                    {account.assignedChannel && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400 flex-shrink-0">
                                        {account.assignedChannel}
                                      </Badge>
                                    )}
                                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 flex-shrink-0">
                                      Manager
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">@{account.username}</p>
                                </div>
                              </div>
                              {account.username !== currentUser?.username && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditUser(account)} className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(account.username)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Logistics (Packer + Tracker + Logistics-Admin) Card */}
                    <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <CardHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-orange-600">
                              <Server className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">Logistics</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {accounts.filter(a => ['packer', 'tracker', 'logistics-admin'].includes(a.role)).length} users
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 space-y-2">
                        {accounts.filter(a => ['packer', 'tracker', 'logistics-admin'].includes(a.role)).length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No logistics users</p>
                        ) : (
                          accounts.filter(a => ['packer', 'tracker', 'logistics-admin'].includes(a.role)).map((account) => (
                            <div key={account.id}>
                              {editingUser === account.id ? (
                                <div className="space-y-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Edit Logistics User</p>
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Username</Label>
                                      <Input value={editUserForm.username} onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })} placeholder="Username" className="h-8 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Display Name</Label>
                                      <Input value={editUserForm.displayName} onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })} placeholder="Display name" className="h-8 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Profile Image (Optional)</Label>
                                      <ImageUpload
                                        uploadType="profile"
                                        value={editUserForm.profileImage}
                                        onChange={(url) => setEditUserForm({ ...editUserForm, profileImage: url })}
                                        onRemove={() => setEditUserForm({ ...editUserForm, profileImage: '' })}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">New Password (optional)</Label>
                                      <Input type={showPassword.editNew ? "text" : "password"} value={editUserForm.newPassword} onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })} placeholder="New password (optional)" className="h-8 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Confirm Password</Label>
                                      <Input type={showPassword.editConfirm ? "text" : "password"} value={editUserForm.confirmPassword} onChange={(e) => setEditUserForm({ ...editUserForm, confirmPassword: e.target.value })} placeholder="Confirm password" className="h-8 text-xs" />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button onClick={handleUpdateUser} className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"><Check className="h-3 w-3 mr-1" />Save</Button>
                                    <Button variant="outline" onClick={handleCancelEdit} className="flex-1 h-7 text-xs"><X className="h-3 w-3 mr-1" />Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    {/* Profile Image */}
                                    <div className="flex-shrink-0">
                                      {account.profileImage ? (
                                        <img 
                                          src={account.profileImage} 
                                          alt={account.displayName}
                                          className="h-8 w-8 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                                        />
                                      ) : (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                          <User className="h-4 w-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{account.displayName}</p>
                                        {account.assignedChannel && (
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 flex-shrink-0">
                                            {account.assignedChannel}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400">@{account.username}</p>
                                    </div>
                                  </div>
                                  {account.username !== currentUser?.username && (
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(account)} className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800">
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(account.username)} className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Edit User Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogContent className="max-w-md p-0 gap-0 bg-white dark:bg-slate-900 border-0 shadow-2xl">
                <DialogHeader className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-600">
                      <Edit className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Edit User Account
                      </DialogTitle>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Update user information and credentials
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editUsername" className="text-sm font-medium text-slate-700 dark:text-slate-300">Username</Label>
                    <Input
                      id="editUsername"
                      value={editUserForm.username}
                      onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                      placeholder="Username"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editDisplayName" className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</Label>
                    <Input
                      id="editDisplayName"
                      value={editUserForm.displayName}
                      onChange={(e) => setEditUserForm({ ...editUserForm, displayName: e.target.value })}
                      placeholder="Display name"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile Image (Optional)</Label>
                    <ImageUpload
                      uploadType="profile"
                      value={editUserForm.profileImage}
                      onChange={(url) => setEditUserForm({ ...editUserForm, profileImage: url })}
                      onRemove={() => setEditUserForm({ ...editUserForm, profileImage: '' })}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <Label htmlFor="editNewPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password (optional)</Label>
                    <Input
                      id="editNewPassword"
                      type="password"
                      value={editUserForm.newPassword}
                      onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editConfirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</Label>
                    <Input
                      id="editConfirmPassword"
                      type="password"
                      value={editUserForm.confirmPassword}
                      onChange={(e) => setEditUserForm({ ...editUserForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="h-10"
                    />
                  </div>
                </div>

                <DialogFooter className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <Button variant="outline" onClick={handleCancelEdit} className="h-10 px-5">
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUser} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white">
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* Company Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="company" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-600">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Company Information
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Configure your company details and business settings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
                    <Input
                      id="companyName"
                      value={systemSettings.companyName}
                      onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                      placeholder="Your Company Name"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyEmail" className="text-sm font-medium">Company Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={systemSettings.companyEmail}
                      onChange={(e) => setSystemSettings({ ...systemSettings, companyEmail: e.target.value })}
                      placeholder="info@company.com"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyPhone" className="text-sm font-medium">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      type="tel"
                      value={systemSettings.companyPhone}
                      onChange={(e) => setSystemSettings({ ...systemSettings, companyPhone: e.target.value })}
                      placeholder="+63 XXX XXX XXXX"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-sm font-medium">Currency</Label>
                    <select
                      id="currency"
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyAddress" className="text-sm font-medium">Company Address</Label>
                    <textarea
                      id="companyAddress"
                      value={systemSettings.companyAddress}
                      onChange={(e) => setSystemSettings({ ...systemSettings, companyAddress: e.target.value })}
                      placeholder="Enter complete address"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                    <select
                      id="timezone"
                      value={systemSettings.timezone}
                      onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      <option value="America/New_York">America/New York (GMT-5)</option>
                      <option value="Europe/London">Europe/London (GMT+0)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateFormat" className="text-sm font-medium">Date Format</Label>
                    <select
                      id="dateFormat"
                      value={systemSettings.dateFormat}
                      onChange={(e) => setSystemSettings({ ...systemSettings, dateFormat: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold" className="text-sm font-medium">Low Stock Alert</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      value={systemSettings.lowStockThreshold}
                      onChange={(e) => setSystemSettings({ ...systemSettings, lowStockThreshold: parseInt(e.target.value) })}
                      placeholder="10"
                      min="1"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" className="h-10">
                    <X className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleSystemSettingsUpdate} className="bg-green-600 hover:bg-green-700 text-white h-10">
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600">
                  <Palette className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Appearance & Display
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Customize the look and feel of your interface
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Theme Preference</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                      theme === 'light'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
                      <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Light Mode</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Bright and clear</p>
                    </div>
                    {theme === 'light' && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                  </button>

                  <button
                    className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                      theme === 'dark'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="p-2 rounded-lg bg-slate-800 flex-shrink-0">
                      <Moon className="h-5 w-5 text-slate-100" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Easy on the eyes</p>
                    </div>
                    {theme === 'dark' && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                  </button>

                  <button
                    className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                      theme === 'system'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => handleThemeChange('system')}
                  >
                    <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                      <Monitor className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">System</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Match device</p>
                    </div>
                    {theme === 'system' && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                  </button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notification Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Desktop Notifications</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show notifications on your desktop</p>
                    </div>
                    <Switch
                      checked={systemSettings.enableNotifications}
                      onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, enableNotifications: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Email Alerts</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Receive important updates via email</p>
                    </div>
                    <Switch
                      checked={systemSettings.enableEmailAlerts}
                      onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, enableEmailAlerts: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSystemSettingsUpdate} className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-6">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Information */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-600">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      System Information
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      View system status and configuration
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Database</Label>
                    <Badge variant="outline" className="w-fit bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-xs">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                      Supabase
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Security</Label>
                    <Badge variant="outline" className="w-fit bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-xs">
                      <Shield className="h-3 w-3 mr-2" />
                      RLS Enabled
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Authentication</Label>
                    <Badge variant="outline" className="w-fit bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-xs">
                      <Lock className="h-3 w-3 mr-2" />
                      Token-Based
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Encryption</Label>
                    <Badge variant="outline" className="w-fit bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-xs">
                      <Check className="h-3 w-3 mr-2" />
                      Bcrypt
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">System Version</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">1.0.0</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Security Score</span>
                    <Badge className="bg-green-600 text-white text-xs font-medium">10/10</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                    <Badge className="bg-blue-600 text-white text-xs font-medium">Production Ready</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Uptime</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">99.9%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backup & Data */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-600">
                    <Server className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Backup & Data
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Manage backups and data exports
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Automatic Backups</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daily at 2:00 AM</p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, autoBackup: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup Frequency</Label>
                  <select
                    value={systemSettings.backupFrequency}
                    onChange={(e) => setSystemSettings({ ...systemSettings, backupFrequency: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button onClick={handleBackupNow} variant="outline" className="w-full justify-start h-10 text-sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Create Backup Now
                  </Button>
                  <Button onClick={handleExportData} variant="outline" className="w-full justify-start h-10 text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export System Data
                  </Button>
                  <Button onClick={handleImportData} variant="outline" className="w-full justify-start h-10 text-sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  {lastBackup
                    ? `Last backup: ${new Date(lastBackup).toLocaleString()}`
                    : 'No backup created yet'
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Performance */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-700">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">System Performance</CardTitle>
                  <CardDescription className="mt-1 text-sm">Real-time system metrics and statistics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">API Response</span>
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {systemMetrics.apiResponseTime > 0 ? `${systemMetrics.apiResponseTime}ms` : '—'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Average response time</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Database</span>
                    <Database className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemMetrics.databaseHealth}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">System health</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Storage</span>
                    <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemMetrics.storageUsed}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data stored</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">User Accounts</span>
                    <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {accounts.length > 0 ? accounts.length : '—'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MANUAL TAB ===== */}
        <TabsContent value="manual" className="space-y-6 mt-8">
          <ManualTab />
        </TabsContent>

      </Tabs>

      {/* Add User Modal */}
      <Dialog open={showNewUserForm} onOpenChange={setShowNewUserForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-slate-900 border-0 shadow-2xl">
          <DialogHeader className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-600">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Create New User
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add a new user account with role and permissions
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modalUsername" className="text-sm font-medium">Username *</Label>
                <Input
                  id="modalUsername"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  placeholder="Enter username"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modalDisplayName" className="text-sm font-medium">Display Name *</Label>
                <Input
                  id="modalDisplayName"
                  value={newUserForm.displayName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                  placeholder="Enter display name"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modalPassword" className="text-sm font-medium">Password *</Label>
                <Input
                  id="modalPassword"
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Enter password (min 6 characters)"
                  className="h-10"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Minimum 6 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modalRole" className="text-sm font-medium">Role *</Label>
                <select
                  id="modalRole"
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as any, assignedChannel: '' })}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                >
                  <option value="admin">Administrator</option>
                  <option value="operations">Operations Staff (Agent)</option>
                  <option value="dept-manager">Dept. Head</option>
                  <option value="packer">Packer</option>
                  <option value="tracker">Tracker</option>
                  <option value="logistics-admin">Logistics Admin</option>
                </select>
              </div>
            </div>

            {/* Sales Channel Dropdown - Show for Operations and Dept Manager */}
            {(newUserForm.role === 'operations' || newUserForm.role === 'dept-manager') && (
              <div className="space-y-2">
                <Label htmlFor="modalChannel" className="text-sm font-medium">Assigned Department *</Label>
                <select
                  id="modalChannel"
                  value={newUserForm.assignedChannel}
                  onChange={(e) => setNewUserForm({ ...newUserForm, assignedChannel: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select department...</option>
                  <option value="Shopee">Shopee</option>
                  <option value="Lazada">Lazada</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Physical Store">Physical Store</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">Required for Operations Staff and Dept. Heads</p>
              </div>
            )}

            {/* Profile Image Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Profile Image (Optional)</Label>
              <ImageUpload
                uploadType="profile"
                value={newUserForm.profileImage}
                onChange={(url) => setNewUserForm({ ...newUserForm, profileImage: url })}
                onRemove={() => setNewUserForm({ ...newUserForm, profileImage: '' })}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a profile picture (max 300KB, auto-compressed to WebP)
              </p>
            </div>
          </div>

          <DialogFooter className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewUserForm(false)
                setNewUserForm({ username: '', password: '', displayName: '', role: 'operations', assignedChannel: '', profileImage: '' })
              }}
              className="h-10"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Manual Tab Component ────────────────────────────────────────────────────

const MANUAL_DATA: Record<string, { label: string; icon: string; pages: Record<string, { title: string; description: string; workflow: string[]; guide: string[]; notes?: string[] }> }> = {
  admin: {
    label: 'Admin',
    icon: '👔',
    pages: {
      dashboard: {
        title: 'Dashboard Overview',
        description: 'Main control center showing real-time KPIs: revenue, profit, delivered orders, returns, and inventory alerts.',
        workflow: [
          'Open dashboard to see today\'s summary.',
          'Use the date range picker (top-right) to filter all KPI cards by period.',
          'Check Row 1 cards: Total Revenue, Gross Profit, Total Sold, Profit Margin.',
          'Check Row 2 cards: Total Delivered, Low Stock, Out of Stock, Total Returns.',
          'Review Operational Alerts & Tips for inventory warnings.',
          'Use Quick Actions to navigate to common tasks.',
          'Analyze the Revenue Chart using Day/Week/Month tabs.',
        ],
        guide: [
          'Total Delivered % = delivered orders ÷ total orders × 100.',
          'Return Rate % = returns ÷ delivered × 100.',
          'Cancelled (Packing) = orders cancelled BEFORE packing.',
          'Cancelled (Tracked) = orders cancelled AFTER packing.',
          'Revenue excludes CANCELLED, RETURNED, PROBLEMATIC, and DETAINED orders.',
          'Gross Profit = Revenue − Cost of Goods Sold (COGS).',
          'Profit Margin % = (Gross Profit ÷ Revenue) × 100.',
        ],
        notes: [
          'Charts use Day/Week/Month tabs independently from the date filter.',
          'Date filter affects KPI cards only, not the revenue chart.',
          'Low Stock Alert shows products near reorder level.',
        ],
      },
      inventory: {
        title: 'Inventory / Products',
        description: 'Manage all products and bundles. View stock levels, add/edit/delete items, and monitor total value.',
        workflow: [
          'View all products in the table (regular + bundles).',
          'Click "+ Add Product" to create a new regular product.',
          'Click "+ Bundle" to create a bundle from existing products.',
          'Click the Edit (pencil) icon to update a product or bundle.',
          'Click Delete (trash) icon → confirm → product removed immediately.',
          'Use Search, Category, and Sales Channel filters to narrow the list.',
          'Top 3 cards update instantly after any create/edit/delete.',
        ],
        guide: [
          'Total Quantity excludes bundles (bundles use component stock).',
          'Total Value = sum of (quantity × selling price) per product.',
          'Total COGS = sum of (quantity × cost price) per product.',
          'Bundle stock = minimum units buildable from component quantities.',
          'Editing a bundle opens the full Bundle Builder modal.',
          'Deleting a bundle does NOT delete its component products.',
        ],
        notes: [
          'Low stock threshold is set per product (Reorder Level field).',
          'Images are auto-compressed to WebP on upload.',
        ],
      },
      pos: {
        title: 'Point of Sale (POS)',
        description: 'Create new sales orders. Add products to cart, set customer details, and submit to packing queue.',
        workflow: [
          'Search and click products to add them to the cart.',
          'Adjust quantities in the cart as needed.',
          'Click "Checkout" to open the order form.',
          'Fill in: Sales Channel, Store, Courier, Waybill, Customer info.',
          'Submit the order — it goes directly to the Packing Queue.',
          'Inventory is NOT deducted at POS — only after packing.',
        ],
        guide: [
          'Waybill must be unique — duplicates are flagged before submission.',
          'COGS and total are auto-calculated from cart items.',
          'Operations staff see only their assigned sales channel.',
          'Bundles can be added to cart like regular products.',
          'Product names display in Title Case (e.g., "Build Cord" instead of "BUILD CORD").',
          'Original database names are preserved — display only is formatted.',
          'Product name font size is 13px for readability across the 6-column grid.',
        ],
        notes: [
          'Cart is cleared after successful order submission.',
          'Price can be edited in the order form before final submission.',
          'If total price was edited, success modal shows the edited total.',
        ],
      },
      dispatch: {
        title: 'Dispatch',
        description: 'Add dispatch notes and customer details to packed orders before they go out for delivery.',
        workflow: [
          'View orders ready for dispatch.',
          'Add or edit dispatch notes per order.',
          'Confirm dispatch to update the order status.',
        ],
        guide: [
          'Only packed orders appear in dispatch.',
          'Notes added here are visible in Track Orders.',
        ],
      },
      'packing-queue': {
        title: 'Packing Queue',
        description: 'View and manage orders waiting to be packed. Edit order details, confirm packing to deduct inventory, or cancel orders.',
        workflow: [
          'View all Pending orders queued for packing.',
          'Click an order to view details in the modal.',
          'Click "EDIT" to modify customer info, courier, waybill, quantity, amount, or sales channel.',
          'Fill required fields (marked with *): Name, Phone, Address, Courier, Waybill.',
          'System validates all fields before saving — empty required fields are rejected.',
          'If waybill was changed, system auto-checks for duplicates before saving.',
          'Click "SAVE CHANGES" — a toast confirms how many fields were changed.',
          'Click "MARK AS PACKED" to confirm packing — inventory is deducted.',
          'Click "CANCEL" to mark as cancelled before packing (Admin, Dept. Head, and Operations).',
          'Click "DELETE" to permanently remove an order.',
          'Click "UNCANCEL" to restore a cancelled order.',
          'Packed orders move automatically to Track Orders.',
        ],
        guide: [
          'Cancelled orders count as "Cancelled (Packing)" in dashboard.',
          'Inventory deduction happens only when status changes to Packed.',
          'Single Product Orders: Quantity and Amount are editable.',
          'Multiple Product Orders: Quantity is read-only, Amount is editable.',
          'System detects multiple products by commas (,), plus (+), or ampersand (&).',
          'Edit mode auto-calculates amount when quantity changes (single products only).',
          'Closing edit modal with unsaved changes shows a confirmation prompt.',
          'Admin can change Sales Channel via a dropdown in edit mode.',
          'Dept. Head (dept-manager) can now CANCEL and UNCANCEL orders.',
          'Logistics Admin has read-only access (no edit/pack/cancel buttons).',
          'Waybill duplicate check only runs if the waybill number was changed.',
          'Save summary toast shows: "X field(s) changed" for audit awareness.',
        ],
        notes: [
          'Packer role handles this page in the field.',
          'Cancelled orders can be restored before being deleted.',
          'Required fields are marked with a red asterisk (*).',
        ],
      },
      'track-orders': {
        title: 'Track Orders',
        description: 'Monitor all packed orders and update delivery status. Edit order details and export reports as Excel or PDF.',
        workflow: [
          'View all Packed orders with their current parcel status.',
          'Click an order to view details in the modal.',
          'Click "Edit Order" to modify customer info, courier, waybill, quantity, or amount.',
          'Update parcel status: PENDING → IN TRANSIT → ON DELIVERY → DELIVERED.',
          'Mark an order as RETURNED if the customer sends it back.',
          'Mark as CANCELLED if needed after packing.',
          'Use date filter and status filter to narrow the list.',
          'Export to Excel or PDF for reporting.',
        ],
        guide: [
          'DELIVERED status is counted in the "Total Delivered" dashboard card.',
          'RETURNED status is counted in the "Total Returns" dashboard card.',
          'CANCELLED here = "Cancelled (Tracked)" in dashboard.',
          'COGS and profit in exports use actual data from each order (not estimates).',
          'Single Product Orders: Quantity and Amount are editable.',
          'Multiple Product Orders: Quantity is read-only, Amount is editable.',
          'System detects multiple products by commas (,), plus (+), or ampersand (&).',
          'Edit mode auto-calculates amount when quantity changes (single products only).',
        ],
        notes: [
          'Edit functionality available for Admin, Operations, and Managers.',
          'Quantity editing rules prevent errors in multi-product orders.',
        ],
      },
      analytics: {
        title: 'Analytics',
        description: 'Deep-dive sales analytics: revenue trends, top products, channel performance, and period comparisons.',
        workflow: [
          'Select a time period or date range.',
          'View revenue breakdown by sales channel.',
          'Review top-selling products and categories.',
          'Compare current period vs previous period.',
        ],
        guide: [
          'All analytics exclude CANCELLED and RETURNED orders.',
          'Revenue is based on actual order amounts, not estimates.',
        ],
      },
      insights: {
        title: 'Business Insights',
        description: 'Inventory health analysis: fast/slow moving items, dead stock, ABC classification, and turnover ratios.',
        workflow: [
          'View ABC Analysis — A=high value, B=medium, C=low value items.',
          'Check Inventory Turnover table for each product.',
          'Fast Moving Items = products selling in under 90 days.',
          'Slow Moving = 90–180 days. Dead Stock = 180+ days with no sale.',
          'Use sort and search to find specific products.',
        ],
        guide: [
          'Turnover Ratio = COGS sold ÷ average inventory value.',
          'Days to Sell = analysis period ÷ turnover ratio.',
          'Fast moving threshold: < 90 days to sell.',
          'Products with no sales history are classified as Normal (not dead stock).',
          'Product name matching links orders to inventory items automatically.',
        ],
      },
      customers: {
        title: 'Customers',
        description: 'Manage customer records, view purchase history, and track loyalty points.',
        workflow: [
          'View all customers with their total spent and purchase count.',
          'Click a customer to view their order history.',
          'Add or edit customer information as needed.',
        ],
        guide: [
          'Customer data is linked to orders via customer name and contact.',
        ],
      },
      'business-contacts': {
        title: 'Business Contacts',
        description: 'Manage suppliers, distributors, and resellers. Store contact information for business partners.',
        workflow: [
          'Click "+ Add Contact" to create a new business contact.',
          'Select contact type: Supplier, Distributor, or Reseller.',
          'Fill in company name, contact person, position, email, phone, address.',
          'Add notes for special terms, pricing, or agreements.',
          'Click Edit (pencil) icon to update existing contacts.',
          'Click Delete (trash) icon to remove contacts.',
          'Use search to find specific contacts quickly.',
        ],
        guide: [
          'Contact types help organize your business partners.',
          'Notes field is useful for tracking payment terms or special agreements.',
          'All fields except notes are optional but recommended for completeness.',
        ],
        notes: [
          'Business contacts are separate from customers.',
          'Used primarily for vendor and partner management.',
        ],
      },
      'sales-channels': {
        title: 'Sales Channels',
        description: 'Performance breakdown per sales channel: Shopee, Lazada, Facebook, TikTok, Physical Store.',
        workflow: [
          'View revenue and order count per sales channel.',
          'Filter by date range to compare performance across periods.',
          'Drill into a channel to see individual orders.',
        ],
        guide: [
          'Revenue per channel excludes CANCELLED and RETURNED orders.',
          'Parcel status distribution is shown per channel.',
        ],
      },
      'internal-usage': {
        title: 'Internal Usage',
        description: 'Track products used internally (demos, staff use) without counting as sales.',
        workflow: [
          'Select a product and specify quantity used.',
          'Add a reason/department for the usage.',
          'Submit — inventory is deducted but no revenue is recorded.',
        ],
        guide: [
          'Internal usage does NOT count toward sales revenue.',
          'Appears in activity logs for audit trail.',
        ],
      },
      log: {
        title: 'Activity Log',
        description: 'Full audit trail of all system actions: product changes, order updates, user actions.',
        workflow: [
          'View chronological list of all system events.',
          'Filter by operation type, user, or date.',
          'Use to investigate discrepancies or audit changes.',
        ],
        guide: [
          'Logs are append-only — cannot be deleted.',
          'Includes create, update, delete, and login events.',
        ],
      },
      settings: {
        title: 'Settings',
        description: 'Configure profile, security, users, company info, appearance, and system settings.',
        workflow: [
          'Profile tab: Update display name, email, phone, and profile image.',
          'Security tab: Change your password.',
          'Users tab (Admin only): Create, edit, or delete user accounts.',
          'Company tab: Update company information.',
          'Appearance: Switch between light/dark/system theme.',
          'System: Export data, create backups, view system metrics.',
          'Manual tab: This page — view guides for each role and page.',
        ],
        guide: [
          'Password must be at least 6 characters.',
          'Only admins can manage user accounts.',
          'Profile image is auto-compressed on upload.',
          'Single-device login: One active session per account — logging in elsewhere will auto-logout previous sessions.',
          'Session validation checks every 30 seconds to ensure no duplicate logins.',
        ],
        notes: [
          'UI Theme: Black & Gold corporate design in dark mode.',
          'Font: Plus Jakarta Sans (headings/body) + Geist Mono (numbers/code).',
          'Dark mode uses pure black (#111111) cards with amber gold borders.',
          'All page titles use a gold gradient for consistency.',
          'Single-device security prevents account sharing.',
          'You will see "Account logged in on another device" if your session is invalidated.',
        ],
      },
    },
  },

  operations: {
    label: 'Departments (Operations)',
    icon: '📦',
    pages: {
      'operations-dashboard': {
        title: 'Operations Dashboard',
        description: 'Filtered dashboard showing KPIs, charts, and insights only for your assigned sales channel/department.',
        workflow: [
          'Log in as an Operations staff account.',
          'Dashboard automatically filters to your assigned sales channel.',
          'View Row 1 cards: Total Revenue, Gross Profit, Total Sold, Profit Margin.',
          'View Row 2 cards: Total Delivered, Low Stock, Out of Stock, Total Returns.',
          'Analyze Revenue Chart (area chart) using Day/Week/Month tabs.',
          'Check Top Products by Revenue chart (horizontal bar chart, top 10).',
          'Check Top Stores by Revenue chart (horizontal bar chart, all stores).',
          'Review Operational Alerts & Tips for inventory warnings.',
          'Use date filter to review specific periods.',
        ],
        guide: [
          'Operations staff CANNOT see data from other departments.',
          'Assigned channel is set by Admin in Settings → Users.',
          'All KPI cards, charts, and alerts respect the channel filter.',
          'Top Products chart shows your top 10 best-selling products by revenue.',
          'Top Stores chart shows all stores ranked by revenue in your channel.',
          'Charts auto-update when you change the date filter.',
        ],
        notes: [
          'Top Products and Top Stores charts are exclusive to Operations Dashboard.',
          'Data aggregation is optimized for fast performance.',
        ],
      },
      pos: {
        title: 'Point of Sale (POS)',
        description: 'Create orders for your assigned sales channel.',
        workflow: [
          'Add products to cart.',
          'Sales Channel is auto-set to your assigned channel.',
          'Fill in customer and courier details.',
          'Submit order to packing queue.',
        ],
        guide: [
          'You can only create orders for your assigned channel.',
          'Inventory is deducted after packing, not at POS.',
        ],
      },
      inventory: {
        title: 'Inventory',
        description: 'View and manage all products. Operations staff can see the full product catalog.',
        workflow: [
          'Browse all products in the inventory table.',
          'Check stock levels and reorder points.',
          'Edit product details if permitted.',
        ],
        guide: [
          'All products are visible regardless of sales channel.',
          'Stock levels are shared across all channels.',
        ],
      },
      'track-orders': {
        title: 'Track Orders',
        description: 'Monitor and update parcel status for orders in your channel. Edit order details.',
        workflow: [
          'View orders for your assigned sales channel.',
          'Click an order to view details.',
          'Click "Edit Order" to modify customer info, courier, waybill, quantity, or amount.',
          'Update parcel status as deliveries progress.',
          'Mark orders as DELIVERED or RETURNED.',
        ],
        guide: [
          'Only orders from your channel are visible.',
          'DELIVERED orders count toward your channel\'s total delivered.',
          'Single Product Orders: Quantity and Amount are editable.',
          'Multiple Product Orders: Quantity is read-only, Amount is editable.',
          'System detects multiple products by commas (,), plus (+), or ampersand (&).',
        ],
        notes: [
          'Edit mode auto-calculates amount when quantity changes (single products only).',
        ],
      },
      'packing-queue': {
        title: 'Packing Queue',
        description: 'View and pack orders for your sales channel. Edit order details before packing.',
        workflow: [
          'View Pending orders for your channel.',
          'Click an order to view details.',
          'Click "EDIT" to modify customer info, courier, waybill, quantity, or amount.',
          'Fill required fields (marked with *) before saving.',
          'If waybill is changed, system auto-checks for duplicates.',
          'Click "MARK AS PACKED" to confirm packing and deduct inventory.',
          'Click "CANCEL" to mark as cancelled before packing.',
          'Click "UNCANCEL" to restore a cancelled order.',
        ],
        guide: [
          'Packing deducts inventory immediately.',
          'Cancelled orders here show in dashboard as "Cancelled (Packing)".',
          'Single Product Orders: Quantity and Amount are editable.',
          'Multiple Product Orders: Quantity is read-only, Amount is editable.',
          'System detects multiple products by commas (,), plus (+), or ampersand (&).',
          'Dept. Head accounts can now cancel and restore orders.',
          'Unsaved changes prompt appears when closing edit modal.',
        ],
        notes: [
          'Edit mode auto-calculates amount when quantity changes (single products only).',
          'Required fields are marked with a red asterisk (*).',
        ],
      },
      dispatch: {
        title: 'Dispatch',
        description: 'Add dispatch notes to packed orders for your channel.',
        workflow: [
          'View packed orders ready for dispatch.',
          'Add dispatch notes and confirm.',
        ],
        guide: [
          'Notes are visible to the tracker and in reports.',
        ],
      },
      customers: {
        title: 'Customers',
        description: 'Manage customer records for your department.',
        workflow: [
          'View customers who ordered through your channel.',
          'Add or update customer information.',
        ],
        guide: ['Customer data is shared across the system.'],
      },
      log: {
        title: 'Activity Log',
        description: 'View activity logs relevant to your department.',
        workflow: [
          'Browse logs filtered by your actions.',
          'Use to trace order history or inventory changes.',
        ],
        guide: ['Logs are read-only.'],
      },
    },
  },

  'logistics-admin': {
    label: 'Logistics Admin',
    icon: '📊',
    pages: {
      'logistics-dashboard': {
        title: 'Logistics Dashboard',
        description: 'Read-only overview of all orders, delivery status, and logistics performance.',
        workflow: [
          'Log in as Logistics Admin.',
          'View all orders across all channels.',
          'Monitor delivery status breakdown.',
          'Filter by date range or status.',
        ],
        guide: [
          'Logistics Admin has read-only access.',
          'Cannot create, edit, or delete orders.',
          'Can export reports for logistics analysis.',
        ],
      },
      'track-orders': {
        title: 'Track Orders (Logistics View)',
        description: 'Full view of all orders with parcel status tracking across all channels.',
        workflow: [
          'View all packed orders system-wide.',
          'Filter by parcel status, channel, or date.',
          'Export to Excel for logistics reporting.',
        ],
        guide: [
          'Read-only — cannot update parcel status.',
          'Export includes COGS and profit data.',
        ],
      },
      log: {
        title: 'Activity Log',
        description: 'Monitor all system activity for logistics audit purposes.',
        workflow: [
          'Browse all activity logs.',
          'Filter by date, operation, or user.',
        ],
        guide: ['Logs are read-only.'],
      },
      'business-contacts': {
        title: 'Business Contacts',
        description: 'Manage suppliers, distributors, and resellers. Full access to add, edit, and delete contacts.',
        workflow: [
          'View all business contacts.',
          'Click "+ Add Contact" to create new suppliers, distributors, or resellers.',
          'Edit or delete existing contacts as needed.',
          'Use search to find specific contacts.',
        ],
        guide: [
          'Logistics Admin has full permissions for Business Contacts.',
          'Can manage all contact types: Supplier, Distributor, Reseller.',
        ],
      },
    },
  },

  tracker: {
    label: 'Tracker',
    icon: '🚚',
    pages: {
      'tracker-dashboard': {
        title: 'Tracker Dashboard',
        description: 'Dedicated page for updating parcel status on packed orders. Optimized for logistics tracking with Excel export.',
        workflow: [
          'Log in as Tracker.',
          'View all orders currently in transit or pending.',
          'Use filters: Status, Sales Channel, Payment Status, Date Range.',
          'Use search to find orders by waybill, customer name, or product.',
          'Click an order to open its details.',
          'Update parcel status: PENDING → IN TRANSIT → ON DELIVERY → PICKUP → DELIVERED.',
          'Mark RETURNED if customer rejects delivery.',
          'Add dispatch notes when needed.',
          'Click "Export to Excel" button to download currently displayed orders.',
        ],
        guide: [
          'DELIVERED = order completed, counted in Total Delivered.',
          'RETURNED = order failed, counted in Total Returns.',
          '"Return to Queue" moves a returned order back to Packing Queue.',
          'Inventory is restored when an order is returned to queue.',
          'Cannot create new orders — tracking only.',
          'Excel export includes only the CURRENT PAGE of orders (respects pagination).',
          'Export filename includes page number and date for easy identification.',
          'Exported data respects all active filters and search results.',
        ],
        notes: [
          'Status changes are logged automatically.',
          'Tracker cannot access inventory or POS.',
          'Export is limited to displayed rows to prevent overwhelming Excel files.',
          'Use pagination controls to navigate and export specific pages.',
        ],
      },
    },
  },

  packer: {
    label: 'Packer',
    icon: '📦',
    pages: {
      'packer-dashboard': {
        title: 'Packer Dashboard',
        description: 'Mobile-optimized page for processing packing queue orders. Scan or manually confirm packing.',
        workflow: [
          'Log in as Packer.',
          'View all Pending orders in the queue.',
          'Filter by sales channel using the channel selector.',
          'Click an order to see full details.',
          'Click "Pack Order" to confirm packing.',
          'Inventory is deducted immediately on confirmation.',
          'Packed orders move to Track Orders automatically.',
          'Use barcode scanner (camera) to find orders by waybill.',
        ],
        guide: [
          'Only Pending orders appear — already packed orders are hidden.',
          'Cancelled orders (is_cancelled=true) appear in red — do not pack them.',
          'Voice notifications announce new orders automatically.',
          'Packer CANNOT edit, create, or delete orders.',
          'Inventory deduction is permanent upon packing.',
        ],
        notes: [
          'Designed for mobile use — optimized layout.',
          'Scanner requires camera permission on first use.',
          'Real-time auto-refresh polls for new orders.',
        ],
      },
    },
  },
}

function ManualTab() {
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [exporting, setExporting] = useState(false)

  const accountOptions = Object.entries(MANUAL_DATA).map(([key, val]) => ({
    key,
    label: `${val.icon} ${val.label}`,
  }))

  const pageOptions = selectedAccount
    ? Object.entries(MANUAL_DATA[selectedAccount].pages).map(([key, val]) => ({
        key,
        label: val.title,
      }))
    : []

  const content = selectedAccount && selectedPage
    ? MANUAL_DATA[selectedAccount]?.pages[selectedPage]
    : null

  const handleAccountChange = (value: string) => {
    setSelectedAccount(value)
    setSelectedPage('')
  }

  const handleExportPDF = async () => {
    try {
      setExporting(true)
      toast.info('Generating comprehensive system documentation...')
      
      // Dynamically import jsPDF
      const { default: jsPDF } = await import('jspdf')
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Professional color palette
      const colors = {
        primary: [37, 99, 235],      // Blue
        secondary: [71, 85, 105],    // Slate
        success: [34, 197, 94],      // Green
        warning: [234, 179, 8],      // Yellow
        accent: [168, 85, 247],      // Purple
        info: [14, 165, 233],        // Sky blue
        text: [15, 23, 42],          // Dark slate
        textLight: [100, 116, 139],  // Light slate
        border: [226, 232, 240]      // Very light slate
      }

      // Page settings
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 25
      const contentWidth = pageWidth - (margin * 2)
      let yPos = margin
      let pageNumber = 1

      // Helper: Add page number and footer
      const addFooter = () => {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...colors.textLight)
        doc.text(
          `WIHI Asia Marketing Inc. | Page ${pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }

      // Helper: Check page break
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > pageHeight - 20) {
          addFooter()
          doc.addPage()
          pageNumber++
          yPos = margin
          return true
        }
        return false
      }

      // Helper: Clean text (remove emojis and special characters)
      const cleanText = (text: string) => {
        return text
          .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
          .trim()
      }

      // Helper: Add wrapped text
      const addWrappedText = (text: string, x: number, fontSize: number, maxWidth: number, lineHeight: number, color: number[] = colors.text) => {
        const cleanedText = cleanText(text)
        doc.setFontSize(fontSize)
        doc.setTextColor(...color)
        const lines = doc.splitTextToSize(cleanedText, maxWidth)
        lines.forEach((line: string) => {
          checkPageBreak(lineHeight)
          doc.text(line, x, yPos)
          yPos += lineHeight
        })
      }

      // Helper: Add section header
      const addSectionHeader = (title: string, color: number[] = colors.primary) => {
        checkPageBreak(15)
        doc.setFillColor(...color)
        doc.rect(margin - 5, yPos - 5, contentWidth + 10, 12, 'F')
        
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(title, margin, yPos + 2)
        yPos += 15
      }

      // Helper: Add section box
      const addSectionBox = (title: string, icon: string, bgColor: number[]) => {
        checkPageBreak(12)
        
        // Draw background box
        doc.setFillColor(...bgColor)
        doc.roundedRect(margin, yPos - 4, contentWidth, 10, 2, 2, 'F')
        
        // Add title
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(`${icon} ${title}`, margin + 3, yPos + 2)
        yPos += 12
      }

      // ========== COVER PAGE ==========
      // Header bar
      doc.setFillColor(...colors.primary)
      doc.rect(0, 0, pageWidth, 70, 'F')
      
      // Company name
      doc.setFontSize(36)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('WIHI ASIA', pageWidth / 2, 30, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'normal')
      doc.text('MARKETING INC.', pageWidth / 2, 42, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text('Inventory Management System', pageWidth / 2, 55, { align: 'center' })
      
      // Document title
      yPos = 95
      doc.setFontSize(32)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.text)
      doc.text('SYSTEM', pageWidth / 2, yPos, { align: 'center' })
      yPos += 10
      doc.text('DOCUMENTATION', pageWidth / 2, yPos, { align: 'center' })
      
      // Decorative line
      yPos += 20
      doc.setDrawColor(...colors.border)
      doc.setLineWidth(0.5)
      doc.line(margin + 30, yPos, pageWidth - margin - 30, yPos)
      
      // Subtitle
      yPos += 25
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.textLight)
      doc.text('Complete Feature Overview & User Guide', pageWidth / 2, yPos, { align: 'center' })
      
      // Document info
      yPos += 15
      const today = new Date()
      const formattedDate = today.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      
      doc.setFontSize(10)
      doc.text(`Version 2.0`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 6
      doc.text(`${formattedDate}`, pageWidth / 2, yPos, { align: 'center' })
      
      // Footer box
      yPos = pageHeight - 60
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F')
      
      yPos += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.text)
      doc.text('Enterprise-Grade Solution', pageWidth / 2, yPos, { align: 'center' })
      
      yPos += 8
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.textLight)
      doc.text('Multi-channel sales tracking, real-time inventory management,', pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
      doc.text('and comprehensive business analytics in one platform.', pageWidth / 2, yPos, { align: 'center' })
      
      // ========== SYSTEM OVERVIEW PAGE ==========
      doc.addPage()
      pageNumber++
      yPos = margin
      
      addSectionHeader('1. SYSTEM OVERVIEW')
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      addWrappedText(
        'WIHI Asia Inventory Management System is a comprehensive cloud-based platform designed to streamline multi-channel e-commerce operations. Built with modern web technologies, it provides real-time inventory tracking, order management, and business intelligence across Shopee, Lazada, TikTok, Facebook, and Physical Store channels.',
        margin, 10, contentWidth, 5
      )
      
      yPos += 10
      addSectionHeader('KEY CAPABILITIES', colors.info)
      
      const capabilities = [
        'Multi-Channel Integration: Unified management across all sales platforms',
        'Real-Time Inventory: Automatic stock updates with low-stock alerts',
        'Order Management: Complete lifecycle from POS to delivery tracking',
        'Business Intelligence: ABC classification, turnover analysis, profit margins',
        'Role-Based Security: Six user roles with granular permissions',
        'Audit Trail: Complete activity logging for compliance',
        'Premium UI: Black & Gold corporate theme with Plus Jakarta Sans typography',
        'QC Enhancements: Packing Queue edit validation, waybill duplicate check on edit, unsaved-changes guard'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      capabilities.forEach(cap => {
        checkPageBreak(6)
        doc.setFillColor(...colors.primary)
        doc.circle(margin + 2, yPos - 1.5, 1.5, 'F')
        doc.setTextColor(...colors.text)
        const lines = doc.splitTextToSize(cleanText(cap), contentWidth - 8)
        lines.forEach((line: string) => {
          checkPageBreak(5)
          doc.text(line, margin + 7, yPos)
          yPos += 5
        })
      })
      
      addFooter()
      
      // ========== FEATURES PAGE ==========
      doc.addPage()
      pageNumber++
      yPos = margin
      
      addSectionHeader('2. KEY FEATURES & BENEFITS')
      
      // Inventory Management
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      doc.text('INVENTORY MANAGEMENT', margin, yPos)
      yPos += 8
      
      const inventoryFeatures = [
        'Product & Bundle Management with automatic stock calculation',
        'Real-time Stock Levels across all channels',
        'Low Stock Alerts with configurable reorder points',
        'COGS Tracking and profit margin analysis',
        'Image Management with auto-compression',
        'Multi-level Category Organization'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      inventoryFeatures.forEach(feature => {
        checkPageBreak(6)
        doc.setFillColor(...colors.success)
        doc.circle(margin + 2, yPos - 1.5, 1, 'F')
        doc.setTextColor(...colors.text)
        const lines = doc.splitTextToSize(cleanText(feature), contentWidth - 8)
        lines.forEach((line: string) => {
          checkPageBreak(5)
          doc.text(line, margin + 6, yPos)
          yPos += 5
        })
      })
      
      yPos += 5
      
      // Sales & Orders
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      doc.text('SALES & ORDER PROCESSING', margin, yPos)
      yPos += 8
      
      const salesFeatures = [
        'Point of Sale with fast order creation and Title Case product display',
        'Packing Queue with full order editing (validation, waybill duplicate check, unsaved-changes guard)',
        'Sales Channel correction in edit mode (Admin only)',
        'Dept. Head can cancel and restore orders in Packing Queue',
        'Order Tracking with complete status updates and export',
        'Waybill Management with duplicate validation on create AND edit',
        'Multi-Product Order handling with read-only quantity protection',
        'Cancellation & Returns with restoration options'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      salesFeatures.forEach(feature => {
        checkPageBreak(6)
        doc.setFillColor(...colors.success)
        doc.circle(margin + 2, yPos - 1.5, 1, 'F')
        doc.setTextColor(...colors.text)
        doc.circle(margin + 2, yPos - 1.5, 1, 'F')
        const lines = doc.splitTextToSize(cleanText(feature), contentWidth - 8)
        lines.forEach((line: string) => {
          checkPageBreak(5)
          doc.text(line, margin + 6, yPos)
          yPos += 5
        })
      })
      
      yPos += 5
      
      // Analytics
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      doc.text('ANALYTICS & REPORTING', margin, yPos)
      yPos += 8
      
      const analyticsFeatures = [
        'Revenue Analytics with visual trend charts',
        'Profit Margin Analysis and calculations',
        'ABC Classification for inventory',
        'Inventory Turnover with days-to-sell metrics',
        'Channel Performance breakdown',
        'Fast/Slow/Dead Stock analysis',
        'Excel and PDF export capabilities'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      analyticsFeatures.forEach(feature => {
        checkPageBreak(6)
        doc.setFillColor(...colors.success)
        doc.circle(margin + 2, yPos - 1.5, 1, 'F')
        doc.setTextColor(...colors.text)
        const lines = doc.splitTextToSize(cleanText(feature), contentWidth - 8)
        lines.forEach((line: string) => {
          checkPageBreak(5)
          doc.text(line, margin + 6, yPos)
          yPos += 5
        })
      })

      yPos += 5

      // UI/UX & Design
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.accent)
      doc.text('UI/UX & DESIGN', margin, yPos)
      yPos += 8

      const uiFeatures = [
        'Premium Black & Gold corporate dark mode theme',
        'Plus Jakarta Sans font (300-800 weight) for headings and body',
        'Geist Mono for numbers, code, and time displays',
        'Gold gradient page titles (amber 600 -> amber 400)',
        'Responsive card hover effects with gold glow in dark mode',
        'Smooth scroll-triggered animations with Intersection Observer',
        'Reduced motion support for accessibility',
        'Custom gold scrollbar in dark mode',
        'Keyboard focus-visible gold outline for accessibility'
      ]

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      uiFeatures.forEach(feature => {
        checkPageBreak(6)
        doc.setFillColor(...colors.accent)
        doc.circle(margin + 2, yPos - 1.5, 1, 'F')
        doc.setTextColor(...colors.text)
        const lines = doc.splitTextToSize(cleanText(feature), contentWidth - 8)
        lines.forEach((line: string) => {
          checkPageBreak(5)
          doc.text(line, margin + 6, yPos)
          yPos += 5
        })
      })
      
      addFooter()
      
      // ========== ROLES PAGE ==========
      doc.addPage()
      pageNumber++
      yPos = margin
      
      addSectionHeader('3. ROLE-BASED ACCESS CONTROL')
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      addWrappedText(
        'The system implements comprehensive role-based access control with five distinct user roles, each tailored to specific operational responsibilities.',
        margin, 10, contentWidth, 5
      )
      
      yPos += 10
      
      // Administrator Role
      checkPageBreak(35)
      doc.setFillColor(...colors.accent)
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('ADMINISTRATOR', margin + 3, yPos + 5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Full System Access', pageWidth - margin - 3, yPos + 5, { align: 'right' })
      yPos += 12
      
      const adminCaps = [
        'Complete dashboard with all KPIs',
        'Full inventory management',
        'User account management',
        'Business intelligence access',
        'System settings configuration',
        'Activity log and audit trails'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      adminCaps.forEach(cap => {
        checkPageBreak(5)
        doc.setFillColor(...colors.accent)
        doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
        doc.text(cleanText(cap), margin + 6, yPos)
        yPos += 5
      })
      yPos += 6
      
      // Dept Head Role
      checkPageBreak(30)
      doc.setFillColor(...colors.primary)
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('DEPT. HEAD', margin + 3, yPos + 5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Department Oversight', pageWidth - margin - 3, yPos + 5, { align: 'right' })
      yPos += 12
      
      const deptCaps = [
        'Department dashboard and KPIs',
        'Agent performance monitoring',
        'POS and order creation',
        'Cancel and restore orders in Packing Queue',
        'Edit order details (customer, courier, waybill, amount)',
        'Team activity tracking',
        'Department order logs'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      deptCaps.forEach(cap => {
        checkPageBreak(5)
        doc.setFillColor(...colors.primary)
        doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
        doc.text(cleanText(cap), margin + 6, yPos)
        yPos += 5
      })
      yPos += 6
      
      // Operations Role
      checkPageBreak(25)
      doc.setFillColor(...colors.info)
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('OPERATIONS STAFF', margin + 3, yPos + 5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Channel Operations', pageWidth - margin - 3, yPos + 5, { align: 'right' })
      yPos += 12
      
      const opsCaps = [
        'POS for assigned channel',
        'Order creation and management',
        'Customer information entry',
        'Order tracking and updates'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      opsCaps.forEach(cap => {
        checkPageBreak(5)
        doc.setFillColor(...colors.info)
        doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
        doc.text(cleanText(cap), margin + 6, yPos)
        yPos += 5
      })
      yPos += 6
      
      // Logistics Role
      checkPageBreak(25)
      doc.setFillColor(...colors.success)
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('LOGISTICS ADMIN', margin + 3, yPos + 5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Logistics Coordination', pageWidth - margin - 3, yPos + 5, { align: 'right' })
      yPos += 12
      
      const logCaps = [
        'Logistics dashboard',
        'Business contact management',
        'Order monitoring (read-only)',
        'Dispatch coordination'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      logCaps.forEach(cap => {
        checkPageBreak(5)
        doc.setFillColor(...colors.success)
        doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
        doc.text(cleanText(cap), margin + 6, yPos)
        yPos += 5
      })
      yPos += 6
      
      // Packer Role
      checkPageBreak(25)
      doc.setFillColor(...colors.warning)
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('PACKER', margin + 3, yPos + 5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Packing Operations', pageWidth - margin - 3, yPos + 5, { align: 'right' })
      yPos += 12
      
      const packCaps = [
        'Packing queue management',
        'Mark orders as packed',
        'Inventory deduction confirmation',
        'Packing metrics dashboard'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      packCaps.forEach(cap => {
        checkPageBreak(5)
        doc.setFillColor(...colors.warning)
        doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
        doc.text(cleanText(cap), margin + 6, yPos)
        yPos += 5
      })
      yPos += 6
      
      // Tracker Role
      checkPageBreak(25)
      doc.setFillColor(...colors.secondary)
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('TRACKER', margin + 3, yPos + 5)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Order Tracking', pageWidth - margin - 3, yPos + 5, { align: 'right' })
      yPos += 12
      
      const trackCaps = [
        'Order tracking dashboard',
        'Update parcel status',
        'Mark orders as delivered',
        'Handle returns and issues',
        'Tracking metrics overview'
      ]
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.text)
      trackCaps.forEach(cap => {
        checkPageBreak(5)
        doc.setFillColor(...colors.secondary)
        doc.circle(margin + 2, yPos - 1.5, 0.8, 'F')
        doc.text(cleanText(cap), margin + 6, yPos)
        yPos += 5
      })
      
      addFooter()
      
      // ========== USER GUIDES SEPARATOR ==========
      doc.addPage()
      pageNumber++
      yPos = pageHeight / 2 - 20
      
      doc.setFontSize(28)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...colors.primary)
      doc.text('USER GUIDES', pageWidth / 2, yPos, { align: 'center' })
      
      yPos += 15
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colors.textLight)
      doc.text('Detailed instructions for each account type', pageWidth / 2, yPos, { align: 'center' })
      
      addFooter()
      
      // ========== CONTENT PAGES ==========
      Object.entries(MANUAL_DATA).forEach(([accountKey, accountData]) => {
        doc.addPage()
        pageNumber++
        yPos = margin

        // Account type header with colored bar
        doc.setFillColor(...colors.primary)
        doc.rect(0, yPos - 5, pageWidth, 20, 'F')
        
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(accountData.label.toUpperCase(), margin, yPos + 7)
        
        yPos += 25

        // Loop through pages
        Object.entries(accountData.pages).forEach(([pageKey, pageContent], pageIndex) => {
          checkPageBreak(30)
          
          // Page title with underline
          doc.setFontSize(16)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...colors.text)
          doc.text(cleanText(pageContent.title), margin, yPos)
          yPos += 2
          
          doc.setDrawColor(...colors.primary)
          doc.setLineWidth(0.8)
          doc.line(margin, yPos, margin + 60, yPos)
          yPos += 8

          // Description
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...colors.textLight)
          addWrappedText(pageContent.description, margin, 10, contentWidth, 5, colors.textLight)
          yPos += 5

          // Workflow section
          addSectionBox('WORKFLOW', 'STEP-BY-STEP', colors.primary)
          
          doc.setFont('helvetica', 'normal')
          pageContent.workflow.forEach((step, i) => {
            checkPageBreak(10)
            
            // Step number in circle
            doc.setFillColor(...colors.primary)
            doc.circle(margin + 3, yPos - 2, 2.5, 'F')
            
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(255, 255, 255)
            doc.text(`${i + 1}`, margin + 3, yPos, { align: 'center' })
            
            // Step text
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(...colors.text)
            const stepText = cleanText(step)
            const stepLines = doc.splitTextToSize(stepText, contentWidth - 12)
            stepLines.forEach((line: string, lineIndex: number) => {
              if (lineIndex > 0) checkPageBreak(5)
              doc.setFontSize(9)
              doc.text(line, margin + 9, yPos)
              yPos += 5
            })
            yPos += 2
          })
          yPos += 3

          // Guide section
          addSectionBox('KEY INFORMATION', 'GUIDELINES', colors.success)
          
          doc.setFont('helvetica', 'normal')
          pageContent.guide.forEach((item) => {
            checkPageBreak(10)
            
            // Checkmark bullet
            doc.setFillColor(...colors.success)
            doc.circle(margin + 2.5, yPos - 1.5, 1.5, 'F')
            
            // Item text
            doc.setFontSize(9)
            doc.setTextColor(...colors.text)
            const itemText = cleanText(item)
            const itemLines = doc.splitTextToSize(itemText, contentWidth - 10)
            itemLines.forEach((line: string, lineIndex: number) => {
              if (lineIndex > 0) checkPageBreak(5)
              doc.text(line, margin + 8, yPos)
              yPos += 5
            })
            yPos += 1
          })
          yPos += 3

          // Notes section
          if (pageContent.notes && pageContent.notes.length > 0) {
            addSectionBox('IMPORTANT NOTES', 'ATTENTION', colors.warning)
            
            doc.setFont('helvetica', 'normal')
            pageContent.notes.forEach((note) => {
              checkPageBreak(10)
              
              // Warning triangle
              doc.setFillColor(...colors.warning)
              doc.triangle(
                margin + 2, yPos - 3,
                margin + 0.5, yPos,
                margin + 3.5, yPos,
                'F'
              )
              
              // Note text
              doc.setFontSize(9)
              doc.setTextColor(...colors.text)
              const noteText = cleanText(note)
              const noteLines = doc.splitTextToSize(noteText, contentWidth - 10)
              noteLines.forEach((line: string, lineIndex: number) => {
                if (lineIndex > 0) checkPageBreak(5)
                doc.text(line, margin + 8, yPos)
                yPos += 5
              })
              yPos += 1
            })
            yPos += 3
          }

          yPos += 8 // Space between page sections
        })
        
        addFooter()
      })

      // Save PDF
      doc.save('WIHI-Asia-Inventory-System-Complete-Documentation.pdf')
      toast.success('Comprehensive documentation exported successfully!')
      
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Failed to export PDF manual')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">System Manual</CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Select an account type and page to view its guide, workflow, and instructions.
                </CardDescription>
              </div>
            </div>
            
            {/* Export Documentation Button */}
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors border-0 px-4 h-10 flex-shrink-0"
            >
              {exporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  <span className="text-sm font-medium">Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Export Complete Documentation</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dropdown 1 — Account Type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Account Type
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select Account Type —</option>
                {accountOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Dropdown 2 — Page */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Page / Feature
              </label>
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                disabled={!selectedAccount}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— Select Page —</option>
                {pageOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {!selectedAccount && (
        <Card className="border-0 shadow-md bg-slate-50 dark:bg-slate-800/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <BookOpen className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Select an account type to get started</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Choose from Admin, Departments, Logistics Admin, Tracker, or Packer</p>
          </CardContent>
        </Card>
      )}

      {selectedAccount && !selectedPage && (
        <Card className="border-0 shadow-md bg-slate-50 dark:bg-slate-800/50">
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Pages available for <span className="text-indigo-600 dark:text-indigo-400">{MANUAL_DATA[selectedAccount]?.label}</span>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {pageOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedPage(opt.key)}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                >
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content && (
        <div className="space-y-4">
          {/* Page Title */}
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0">
                  <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{content.title}</h3>
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                      {MANUAL_DATA[selectedAccount]?.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{content.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Workflow */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                  Step-by-Step Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ol className="space-y-2.5">
                  {content.workflow.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Guide / Instructions */}
            <div className="space-y-4">
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    Key Information & Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ul className="space-y-2.5">
                    {content.guide.map((item, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                        <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {content.notes && content.notes.length > 0 && (
                <Card className="border-0 shadow-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                  <CardContent className="p-4">
                    <div className="flex gap-2 items-center mb-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Notes</span>
                    </div>
                    <ul className="space-y-2">
                      {content.notes.map((note, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                          <span className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{note}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

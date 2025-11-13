import { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Save, 
  Camera, 
  Palette, 
  Moon, 
  Sun,
  Mail,
  Edit2,
  Check,
  X,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { authApi } from '../utils/api';
import { useTheme, colorSchemes, type ColorScheme, type Theme } from '../utils/theme';

const Settings = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme state
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'theme'>('profile');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authApi.getCurrentUser();
        setUser(response.user);
        setName(response.user.name || '');
        setEmail(response.user.email || '');
        setProfilePhoto(response.user.profilePhoto || null);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // In a real app, you'd upload the photo to a server
      // For now, we'll just save it locally
      const updatedUser = {
        ...user,
        name,
        email,
        profilePhoto,
      };
      
      // TODO: Call API to update user profile
      // const response = await authApi.updateProfile({ name, email, profilePhoto });
      
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSuccess('Profile updated successfully');
      setIsEditingProfile(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setSuccess('Theme updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleColorSchemeChange = (newScheme: ColorScheme) => {
    setColorScheme(newScheme);
    setSuccess('Color scheme updated successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const getGradientClasses = (scheme: ColorScheme) => {
    return colorSchemes[scheme].primary;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Settings
        </h1>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="hover:text-green-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'profile'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </div>
          {activeTab === 'profile' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${getGradientClasses(colorScheme)}`} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'theme'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Theme & Colors</span>
          </div>
          {activeTab === 'theme' && (
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${getGradientClasses(colorScheme)}`} />
          )}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card-dark">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Profile Settings</h2>
              <p className="text-sm text-gray-400">Manage your account information and profile photo</p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                  <div className="h-full w-full rounded-full bg-dark-card flex items-center justify-center overflow-hidden">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                </div>
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg"
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white mb-1">Profile Photo</h3>
                <p className="text-sm text-gray-400">
                  {isEditingProfile
                    ? 'Click the camera icon to upload a new photo (max 5MB)'
                    : 'Upload a profile photo to personalize your account'}
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              {isEditingProfile ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Enter your name"
                />
              ) : (
                <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                  {name || 'Not set'}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Email Address</span>
              </label>
              {isEditingProfile ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Enter your email"
                />
              ) : (
                <p className="text-white py-3 px-4 bg-dark-hover rounded-lg">
                  {email || 'Not set'}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {isEditingProfile && (
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-800">
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary flex items-center space-x-2 bg-gradient-to-r ${getGradientClasses(colorScheme)}`}
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setName(user?.name || '');
                    setEmail(user?.email || '');
                    setProfilePhoto(user?.profilePhoto || null);
                  }}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="card-dark">
            <div className="flex items-center space-x-2 mb-4">
              <Moon className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">Choose your preferred theme</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'dark'
                    ? `border-purple-500 bg-gradient-to-br ${getGradientClasses(colorScheme)}/20`
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-dark-bg border border-gray-700 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Dark</p>
                    <p className="text-xs text-gray-400">Easy on the eyes</p>
                  </div>
                  {theme === 'dark' && (
                    <Check className="h-5 w-5 text-purple-400 ml-auto" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handleThemeChange('light')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  theme === 'light'
                    ? `border-purple-500 bg-gradient-to-br ${getGradientClasses(colorScheme)}/20`
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-white border border-gray-300 flex items-center justify-center">
                    <Sun className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Light</p>
                    <p className="text-xs text-gray-400">Bright and clean</p>
                  </div>
                  {theme === 'light' && (
                    <Check className="h-5 w-5 text-purple-400 ml-auto" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Color Scheme Selection */}
          <div className="card-dark">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-semibold">Color Scheme</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">Customize the color palette of your interface</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(colorSchemes).map(([scheme, colors]) => (
                <button
                  key={scheme}
                  onClick={() => handleColorSchemeChange(scheme as ColorScheme)}
                  className={`relative p-4 rounded-lg border-2 transition-all overflow-hidden group ${
                    colorScheme === scheme
                      ? 'border-purple-500 ring-2 ring-purple-500/50'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`h-20 w-full rounded-md bg-gradient-to-r ${colors.primary} mb-3 opacity-80 group-hover:opacity-100 transition-opacity`} />
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white capitalize">
                      {scheme.replace('-', ' ')}
                    </p>
                    {colorScheme === scheme && (
                      <Check className="h-5 w-5 text-purple-400" />
                    )}
                  </div>
                  {colorScheme === scheme && (
                    <div className="absolute top-2 right-2">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div className="card-dark bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <ImageIcon className="h-5 w-5" />
              <span>Preview</span>
            </h3>
            <div className="space-y-3">
              <div className={`h-12 rounded-lg bg-gradient-to-r ${getGradientClasses(colorScheme)} flex items-center justify-center`}>
                <span className="text-white font-medium">Primary Button</span>
              </div>
              <div className="h-12 rounded-lg bg-dark-hover flex items-center justify-center">
                <span className="text-gray-300">Secondary Element</span>
              </div>
              <p className="text-sm text-gray-400 text-center pt-2">
                Your changes are applied instantly across the platform
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

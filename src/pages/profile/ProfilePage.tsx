import { useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Input } from '../../components/ui/FormElements';
import { User, Mail, Shield, Camera, Save, Key } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await updateProfile({
        displayName: formData.displayName,
        avatarUrl: formData.avatarUrl
      });
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-xl font-bold text-text-primary tracking-tight">Admin Profile</h2>
        <p className="text-text-secondary text-[13px]">Manage your account settings and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Meta */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-md border border-border p-6 text-center shadow-sm">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-md bg-bg-light border-2 border-border overflow-hidden mx-auto">
                 {formData.avatarUrl ? (
                   <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-300">
                     <User size={48} />
                   </div>
                 )}
              </div>
              <button className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-md shadow-lg border-2 border-white hover:scale-110 transition-all">
                <Camera size={14} />
              </button>
            </div>
            <h3 className="font-bold text-text-primary">{user?.displayName}</h3>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mt-1">Administrator</p>
            
            <div className="mt-6 pt-6 border-t border-border flex flex-col gap-2">
               <div className="flex items-center justify-between text-[13px]">
                 <span className="text-text-secondary font-medium">Role</span>
                 <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[11px] font-bold uppercase">{user?.role}</span>
               </div>
               <div className="flex items-center justify-between text-[13px]">
                 <span className="text-text-secondary font-medium">Login</span>
                 <span className="text-text-primary font-bold">Nexus Console</span>
               </div>
            </div>
          </div>

          <div className="bg-success/5 border border-success/10 p-4 rounded-md flex items-center gap-3">
             <Shield className="text-success" size={20} />
             <div>
               <p className="text-[12px] font-bold text-success capitalize">Account Verified</p>
               <p className="text-[11px] text-success/70">Multi-factor authentication enabled.</p>
             </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          <form className="bg-white rounded-md border border-border shadow-sm overflow-hidden" onSubmit={handleSave}>
            <div className="p-4 border-b border-border bg-table-header/50 flex items-center gap-2">
              <User size={16} className="text-primary" />
              <h3 className="font-bold text-text-primary text-[14px]">General Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Full Name" 
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
                <Input 
                  label="Email Address" 
                  value={formData.email}
                  disabled
                />
              </div>
              <Input 
                label="Avatar URL" 
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>

          <form className="bg-white rounded-md border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-table-header/50 flex items-center gap-2">
              <Key size={16} className="text-primary" />
              <h3 className="font-bold text-text-primary text-[14px]">Security Settings</h3>
            </div>
            <div className="p-6 space-y-4">
              <Input 
                label="Current Password" 
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="New Password" 
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                />
                <Input 
                  label="Confirm Password" 
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  type="button"
                  className="flex items-center gap-2 px-5 py-2 border border-border text-text-secondary rounded-md hover:bg-bg-light transition-all text-[13px] font-bold"
                >
                  Update Password
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

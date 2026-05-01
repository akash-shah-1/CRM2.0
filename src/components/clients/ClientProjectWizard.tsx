import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Briefcase, 
  ListChecks, 
  DollarSign, 
  Link as LinkIcon,
  CheckCircle2,
  Plus,
  Trash2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/FormElements';
import { createClient } from '../../services/clientService';
import { createProject } from '../../services/projectService';
import { logActivity } from '../../utils/activity';
import { createNotification } from '../../utils/notifications';
import { useAuth } from '../../store/AuthContext';

interface ClientProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 'client', title: 'Client Profile', icon: User },
  { id: 'project', title: 'Project Core', icon: Briefcase },
  { id: 'scope', title: 'Features & Scope', icon: ListChecks },
  { id: 'financials', title: 'Financials & Time', icon: DollarSign },
  { id: 'technical', title: 'Technical Details', icon: LinkIcon },
];

export function ClientProjectWizard({ isOpen, onClose, onSuccess }: ClientProjectWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Client
    name: '',
    company: '',
    email: '',
    phone: '',
    location: '',
    status: 'lead' as 'active' | 'lead' | 'inactive',
    
    // Project
    title: '',
    description: '',
    requirements: '',
    promisedFeatures: [] as string[],
    outOfScope: [] as string[],
    price: 0,
    startDate: '',
    endDate: '',
    maintenanceYears: 1,
    liveLink: '',
    stagingLink: '',
    repoLink: '',
    credentials: '',
    
    // Temporary inputs
    newFeature: '',
    newScope: ''
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const addFeature = () => {
    if (!formData.newFeature.trim()) return;
    setFormData({
      ...formData,
      promisedFeatures: [...formData.promisedFeatures, formData.newFeature.trim()],
      newFeature: ''
    });
  };

  const removeFeature = (idx: number) => {
    setFormData({
      ...formData,
      promisedFeatures: formData.promisedFeatures.filter((_, i) => i !== idx)
    });
  };

  const addScope = () => {
    if (!formData.newScope.trim()) return;
    setFormData({
      ...formData,
      outOfScope: [...formData.outOfScope, formData.newScope.trim()],
      newScope: ''
    });
  };

  const removeScope = (idx: number) => {
    setFormData({
      ...formData,
      outOfScope: formData.outOfScope.filter((_, i) => i !== idx)
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create Client
      const clientId = await createClient({
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        status: formData.status
      });

      if (!clientId) throw new Error('Failed to create client');

      // 2. Create Project linked to client
      await createProject({
        clientId,
        clientName: formData.name,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        promisedFeatures: formData.promisedFeatures,
        outOfScope: formData.outOfScope,
        price: Number(formData.price),
        status: 'lead',
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : Date.now(),
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : null,
        maintenanceYears: Number(formData.maintenanceYears),
        liveLink: formData.liveLink,
        stagingLink: formData.stagingLink,
        repoLink: formData.repoLink,
        credentials: formData.credentials,
        createdAt: null // handled by service
      } as any);

      // 3. Notifications & Activities
      await createNotification({
        title: 'New Client & Project Onboarded',
        message: `${formData.name} was onboarded with project: ${formData.title}. Agreed Price: $${formData.price}`,
        type: 'success',
        userId: user?.uid || 'admin'
      });

      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'onboarded new client and project',
        target: `${formData.name} - ${formData.title}`,
        type: 'project'
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      alert('An error occurred during onboarding.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Client & Project Onboarding Wizard"
      size="xl"
      className="p-0"
    >
      <div className="flex flex-col h-[700px]">
        {/* Progress Sidebar/Header */}
        <div className="p-6 border-b border-border bg-bg-light/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isPast = idx < currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110' :
                    isPast ? 'bg-success/20 text-success' :
                    'bg-white border border-border text-text-secondary'
                  }`}>
                    {isPast ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'text-primary' : 'text-text-secondary'
                  }`}>
                    {step.title}
                  </span>
                  
                  {idx < STEPS.length - 1 && (
                    <div className="absolute top-5 left-[calc(100%+8px)] w-[60px] md:w-[100px] h-0.5 bg-border -z-10" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Client Snapshot Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Acme Corp" />
                  <Input label="Company Name" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Legal entity name" />
                  <Input label="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="contact@client.com" type="email" />
                  <Input label="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
                  <Input label="Location / Timezone" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. New York, USA (EST)" />
                  <Select 
                    label="Current Relationship" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    options={[
                      { label: 'Lead - Discussion', value: 'lead' },
                      { label: 'Active - Partner', value: 'active' },
                      { label: 'Inactive', value: 'inactive' },
                    ]}
                  />
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <Input label="Project Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. E-Commerce Platform Rebuild" />
                  <div>
                    <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">Project Brief</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full p-4 bg-bg-light/50 border border-border rounded-xl text-[14px] min-h-[120px] focus:outline-none focus:border-primary transition-all"
                      placeholder="Summary of what we are building..."
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">Detailed Requirements</label>
                    <textarea 
                      value={formData.requirements}
                      onChange={e => setFormData({...formData, requirements: e.target.value})}
                      className="w-full p-4 bg-bg-light/50 border border-border rounded-xl text-[14px] min-h-[160px] focus:outline-none focus:border-primary transition-all"
                      placeholder="Paste functional requirements here..."
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-3">Promised Features & deliverables</label>
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text"
                        value={formData.newFeature}
                        onChange={e => setFormData({...formData, newFeature: e.target.value})}
                        onKeyPress={e => e.key === 'Enter' && addFeature()}
                        placeholder="Add a promised feature..."
                        className="flex-1 p-3 bg-bg-light border border-border rounded-lg text-[13.5px] outline-none focus:border-primary"
                      />
                      <button onClick={addFeature} className="p-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all">
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.promisedFeatures.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-md text-[13px] font-semibold">
                          {feat}
                          <button onClick={() => removeFeature(i)} className="hover:text-danger"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-danger uppercase tracking-wider mb-3">Out of Scope Items</label>
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text"
                        value={formData.newScope}
                        onChange={e => setFormData({...formData, newScope: e.target.value})}
                        onKeyPress={e => e.key === 'Enter' && addScope()}
                        placeholder="Add out of scope item..."
                        className="flex-1 p-3 bg-bg-light border border-border rounded-lg text-[13.5px] outline-none focus:border-primary"
                      />
                      <button onClick={addScope} className="p-3 bg-danger text-white rounded-lg hover:bg-danger-hover transition-all">
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.outOfScope.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-md text-[13px] font-semibold">
                          {item}
                          <button onClick={() => removeScope(i)} className="hover:text-danger"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                     <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Agreed Investment ($)</label>
                     <div className="relative">
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold">$</div>
                       <input 
                         type="number"
                         value={formData.price}
                         onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                         className="w-full pl-10 p-4 bg-bg-light border border-border rounded-xl text-[18px] font-bold focus:outline-none focus:border-primary"
                       />
                     </div>
                   </div>

                   <div className="space-y-4">
                     <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Free Support / Maintenance (Years)</label>
                     <input 
                       type="number"
                       value={formData.maintenanceYears}
                       onChange={e => setFormData({...formData, maintenanceYears: Number(e.target.value)})}
                       className="w-full p-4 bg-bg-light border border-border rounded-xl text-[18px] font-bold focus:outline-none focus:border-primary"
                     />
                   </div>

                   <Input 
                    label="Anticipated Start Date" 
                    type="date" 
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                   />
                   <Input 
                    label="Target Launch Date" 
                    type="date" 
                    value={formData.endDate} 
                    onChange={e => setFormData({...formData, endDate: e.target.value})} 
                   />
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="GitHub/Repo Link" value={formData.repoLink} onChange={e => setFormData({...formData, repoLink: e.target.value})} placeholder="e.g. github.com/org/repo" />
                    <Input label="Staging Environment" value={formData.stagingLink} onChange={e => setFormData({...formData, stagingLink: e.target.value})} placeholder="staging.client.com" />
                    <Input label="Live Production Link" value={formData.liveLink} onChange={e => setFormData({...formData, liveLink: e.target.value})} placeholder="www.client.com" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">Shared Credentials / Access Info</label>
                    <textarea 
                      value={formData.credentials}
                      onChange={e => setFormData({...formData, credentials: e.target.value})}
                      className="w-full p-4 bg-bg-light/30 border border-border border-dashed rounded-xl text-[14px] min-h-[160px] focus:outline-none focus:border-primary transition-all font-mono"
                      placeholder="Note: Store sensitive keys in a vault. Use this for general staging/dev access..."
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-bg-light/30 flex items-center justify-between">
          <button 
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold rounded-lg transition-all ${
              currentStep === 0 ? 'text-gray-300 pointer-events-none' : 'text-text-secondary hover:bg-bg-light'
            }`}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 text-[14px] font-bold text-text-secondary hover:text-danger transition-all"
            >
              Cancel
            </button>
            {currentStep === STEPS.length - 1 ? (
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-success text-white text-[14px] font-bold rounded-xl hover:bg-success-hover shadow-lg shadow-success/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Syncing...' : 'Finalize Onboarding'}
                {!isSubmitting && <CheckCircle2 size={18} />}
              </button>
            ) : (
              <button 
                onClick={handleNext} 
                className="flex items-center gap-2 px-8 py-3 bg-primary text-white text-[14px] font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Continue
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

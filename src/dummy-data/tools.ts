export const NOTES_DATA = [
  { id: '1', projectId: '1', title: 'Q3 Strategy Meeting', content: '# Q3 Goals\n- Increase client retention by 15%\n- Launch mobile app\n- Hire 3 new developers', category: 'Strategy', createdAt: '2026-04-10' },
  { id: '2', projectId: '1', title: 'API Integration Steps', content: '## Steps\n1. Get API Key from portal\n2. Configure webhook URL\n3. Test connection', category: 'Technical', createdAt: '2026-04-12' },
  { id: '3', projectId: '2', title: 'Brand Guidelines', content: 'Our primary color is #3b82f6. Use Inter font for all communications.', category: 'Marketing', createdAt: '2026-04-15' },
];

export const DOCUMENTS_DATA = [
  { id: '1', name: 'Contract_Acme_2026.pdf', type: 'PDF', size: '1.2 MB', projectId: '1', uploadedBy: 'Sarah Chen' },
  { id: '2', name: 'UI_Style_Guide_v2.fig', type: 'Figma', size: '4.5 MB', projectId: '1', uploadedBy: 'Maria Garcia' },
  { id: '3', name: 'API_Documentation.docx', type: 'DOCX', size: '850 KB', projectId: '2', uploadedBy: 'Alex Rivier' },
];

export const VAULT_DATA = [
  { id: '1', projectId: '1', key: 'DATABASE_URL', value: 'postgres://admin:prod_pw@db.nexus.com:5432/main', env: 'production', type: 'secret', updatedAt: '2026-04-20' },
  { id: '2', projectId: '1', key: 'DATABASE_URL', value: 'postgres://dev_user:dev_pw@localhost:5432/nexus_dev', env: 'development', type: 'secret', updatedAt: '2026-04-21' },
  { id: '3', projectId: '2', key: 'STRIPE_SECRET_KEY', value: 'sk_prod_51N8A...', env: 'production', type: 'secret', updatedAt: '2026-04-15' },
  { id: '4', projectId: '2', key: 'STRIPE_PUBLISHABLE_KEY', value: 'pk_test_51N8A...', env: 'development', type: 'public', updatedAt: '2026-04-15' },
  { id: '5', projectId: '4', key: 'VITE_API_URL', value: 'https://api.nexus.com', env: 'production', type: 'public', updatedAt: '2026-04-22' },
  { id: '6', projectId: '4', key: 'VITE_API_URL', value: 'http://localhost:3000', env: 'development', type: 'public', updatedAt: '2026-04-22' },
];

export const CHANNELS_DATA = [
  { id: '1', name: 'general', description: 'Company-wide announcements and general chat.', type: 'public' },
  { id: '2', name: 'design-system', description: 'Discussions about UI/UX and brand guidelines.', type: 'public' },
  { id: '3', name: 'dev-ops', description: 'Deployment status and server maintenance.', type: 'private' },
  { id: '4', name: 'project-nexus', description: 'Dedicated channel for the Nexus project.', type: 'project', projectId: '1' },
];

export const MESSAGES_DATA = [
  { 
    id: '1', 
    channelId: '1', 
    senderId: '1', 
    senderName: 'Sarah Chen', 
    text: "Hey team! Just a reminder that the Q3 strategy meeting is tomorrow at 10 AM.", 
    timestamp: '2026-04-28T09:00:00Z' 
  },
  { 
    id: '2', 
    channelId: '1', 
    senderId: '2', 
    senderName: 'Alex Rivier', 
    text: "Thanks for the reminder, Sarah! I'll have the charts ready.", 
    timestamp: '2026-04-28T09:15:00Z' 
  },
  { 
    id: '3', 
    channelId: '2', 
    senderId: '3', 
    senderName: 'Maria Garcia', 
    text: "Working on the new button component for the design system. Any thoughts on the shadow depth?", 
    timestamp: '2026-04-28T10:30:00Z',
    attachments: [{ type: 'image', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?w=100&h=100&fit=crop' }]
  },
];

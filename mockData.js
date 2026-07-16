// Initial Mock Database Seed Data for Internship Tracker (Cleaned for production)
const INITIAL_MOCK_DATA = {
  users: [
    {
      id: "admin-1780556976781",
      email: "pr@gmail.com",
      password: "admin123", // or their actual password if needed, but it's just local seed fallback
      role: "admin",
      name: "pramod52",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120",
      domain: ""
    },
    {
      id: "mentor-1780557167142",
      email: "vaishu005@gmail.com",
      password: "mentor123", // or their actual password
      role: "mentor",
      name: "Vaishanavi Vhora",
      title: "Tech Lead, Web Engineering",
      domain: "Web Development",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"
    }
  ],
  tasks: [],
  weeklyLogs: [],
  chats: [],
  pairingRequests: [],
  payments: []
};

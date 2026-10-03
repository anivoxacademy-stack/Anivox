import React from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Youtube, Instagram, Send, MessageCircle, Globe } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [socialLinks, setSocialLinks] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchLinks = async () => {
      try {
        const snap = await getDoc(doc(db, 'appSettings', 'socialLinks'));
        if (snap.exists() && Array.isArray(snap.data().links)) {
          const active = snap.data().links.filter((l: any) => l.active && l.url && l.url.trim().length > 0);
          setSocialLinks(active);
        }
      } catch (err) {
        // Silently fail without breaking UI
      }
    };
    fetchLinks();
  }, []);

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'telegram': return <Send className="h-4 w-4" />;
      case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <footer className="bg-white border-t border-neutral-100 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <h2 className="font-display text-2xl font-bold mb-4">Anivox Academy</h2>
            <p className="text-neutral-500 max-w-sm">
              Professional training for the next generation of digital artists and animators. Master the tools, master the craft.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li><Link to="/courses" className="text-neutral-500 hover:text-neutral-900 transition-colors">Courses</Link></li>
              <li><Link to="/portfolio" className="text-neutral-500 hover:text-neutral-900 transition-colors">Student Work</Link></li>
              <li><Link to="/about" className="text-neutral-500 hover:text-neutral-900 transition-colors">About Us</Link></li>
              <li><Link to="/live" className="text-neutral-500 hover:text-neutral-900 transition-colors">Live Classroom</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 mb-4">Student Hub</h3>
            <ul className="space-y-3">
              <li><Link to="/my-courses" className="text-neutral-500 hover:text-neutral-900 transition-colors">My Learning</Link></li>
              <li><Link to="/payments" className="text-neutral-500 hover:text-neutral-900 transition-colors">Payment History</Link></li>
              <li><Link to="/notifications" className="text-neutral-500 hover:text-neutral-900 transition-colors">Notifications</Link></li>
              <li><Link to="/profile" className="text-neutral-500 hover:text-neutral-900 transition-colors">Profile</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-neutral-100 gap-4">
          <p className="text-sm text-neutral-400">
            © {currentYear} Anivox Academy. Created by G. Chandu.
          </p>
          {socialLinks.length > 0 && (
            <div className="flex gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.id || link.displayName}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors flex items-center gap-1.5 text-xs"
                  title={link.displayName || link.platform}
                >
                  {getPlatformIcon(link.platform)}
                  <span>{link.displayName}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
